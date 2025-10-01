using GeoClipService.Models;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Image = SixLabors.ImageSharp.Image;
using SessionOptions = Microsoft.ML.OnnxRuntime.SessionOptions;

namespace GeoClipService.Services;

public class PredictService : IDisposable
{
    private readonly InferenceSession _session;
    private readonly float[] _imageMean;
    private readonly float[] _imageStd;
    private readonly int _imageSizeW;
    private readonly int _imageSizeH;
    private readonly double _latMin;
    private readonly double _latMax;
    private readonly double _lonMin;
    private readonly double _lonMax;
    
    public PredictService(string modelPath, string configPath)
    {
        if (!File.Exists(modelPath))
            throw new FileNotFoundException($"ONNX model not found at: {modelPath}");
        if (!File.Exists(configPath))
            throw new FileNotFoundException($"Processor config not found at: {configPath}");


        // Включаем CUDA при наличии, иначе — CPU
        SessionOptions options;
        try { options = SessionOptions.MakeSessionOptionWithCudaProvider(); }
        catch { options = new SessionOptions(); }
        options.GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL;
        _session = new InferenceSession(modelPath, options);
            
            
        // Загружаем конфиг препроцессинга
        var cfg = JsonConvert.DeserializeObject<Dictionary<string, object>>(File.ReadAllText(configPath))
                  ?? throw new InvalidOperationException("Invalid processor_config.json");
        _imageMean = ((JArray)cfg["mean"]).ToObject<float[]>() ?? throw new("image_mean missing");
        _imageStd = ((JArray)cfg["std"]).ToObject<float[]>() ?? throw new("image_std missing");
        var imageSize = ((JArray)cfg["resize"]).ToObject<int[]>() ?? throw new("image_size missing");
        _imageSizeW = imageSize[0];
        _imageSizeH = imageSize[1];

        _latMin = (double)cfg["lat_min"];
        _latMax = (double)cfg["lat_max"];
        _lonMin = (double)cfg["lon_min"];
        _lonMax = (double)cfg["lon_max"];
    }
        
    public async Task<PredictionResult> PredictFromImage(Stream imageStream)
    {
        var pixelValues = PreprocessImage(imageStream);

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("pixel_values", pixelValues)
        };


        using var results = _session.Run(inputs);
            
        var (lat, lon) = ExtractLatLon(results);

        return new PredictionResult
        {
            Latitude =  _latMin + (lat * (_latMax - _latMin)),
            Longitude = _lonMin + (lon * (_lonMax - _lonMin)),
        };
    }
        
    private (float lat, float lon) ExtractLatLon(IDisposableReadOnlyCollection<DisposableNamedOnnxValue> results)
    {
        string[] preferred = ["coords", "coordinates", "latlon", "output", "preds", "y"];
        foreach (var name in preferred)
        {
            var r = results.FirstOrDefault(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
            if (r == null) continue;
            var t = r.AsTensor<float>();
            if (TryTensorToLatLon(t, out var pair)) return pair;
        }
            
        foreach (var r in results)
        {
            if (r.AsTensor<float>() is Tensor<float> t && TryTensorToLatLon(t, out var pair))
                return pair;
        }


        throw new InvalidOperationException("Не удалось извлечь (lat, lon) из выходов модели.");
    }
        
    private static bool TryTensorToLatLon(Tensor<float> t, out (float lat, float lon) pair)
    {
        var dims = t.Dimensions.ToArray();
        float lat, lon;


        switch (dims.Length)
        {
            case 1 when dims[0] == 2:
                lat = t[0]; lon = t[1];
                pair = (lat, lon); return true;
            case 2 when dims[1] == 2:
                lat = t[0, 0]; lon = t[0, 1];
                pair = (lat, lon); return true;
            case >= 2 when dims.Last() == 2:
            {
                var arr = t.ToArray();
                if (arr.Length >= 2) { pair = (arr[0], arr[1]); return true; }

                break;
            }
        }


        pair = default; return false;
    }
        
    private DenseTensor<float> PreprocessImage(Stream imageStream)
    {
        imageStream.Position = 0;
        using var img = Image.Load<Rgb24>(imageStream);


        img.Mutate(x =>
        {
            x.Resize(_imageSizeW, _imageSizeH);
        });
            
        var tensor = new DenseTensor<float>(new[] { 1, 3, _imageSizeH, _imageSizeW });
            
        img.ProcessPixelRows(accessor =>
        {
            for (int y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (int x = 0; x < accessor.Width; x++)
                {
                    var p = row[x];
                    tensor[0, 0, y, x] = (p.R / 255f - _imageMean[0]) / _imageStd[0];
                    tensor[0, 1, y, x] = (p.G / 255f - _imageMean[1]) / _imageStd[1];
                    tensor[0, 2, y, x] = (p.B / 255f - _imageMean[2]) / _imageStd[2];
                }
            }
        });


        return tensor;
    }
        
    public void Dispose() => _session.Dispose();
    
}