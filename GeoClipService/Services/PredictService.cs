using GeoClipService.Models;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Image = SixLabors.ImageSharp.Image;
using SessionOptions = Microsoft.ML.OnnxRuntime.SessionOptions;

namespace GeoClipService.Services;

public class PredictService : IDisposable
{
    private readonly InferenceSession _session;
    private readonly PredictOptions _opt;

    public PredictService(IOptions<PredictOptions> options)
    {
        _opt = options.Value;

        if (string.IsNullOrWhiteSpace(_opt.ModelPath) || !File.Exists(_opt.ModelPath))
            throw new FileNotFoundException($"ONNX model not found at: {_opt.ModelPath}");

        var so = new SessionOptions();
        if (_opt.UseCudaIfAvailable)
        {
            try { so = SessionOptions.MakeSessionOptionWithCudaProvider(); }
            catch { so = new SessionOptions(); }
        }
        so.GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL;

        _session = new InferenceSession(_opt.ModelPath, so);
    }

    public async Task<PredictionResult> PredictFromImage(Stream imageStream)
    {
        var input = await PreprocessImageAsync(imageStream);

        using var results = _session.Run(new[]
        {
            NamedOnnxValue.CreateFromTensor(_opt.ModelInputName, input)
        });

        var first = results.First().AsTensor<float>().ToArray();
        if (first.Length < 2)
            throw new InvalidOperationException("Model output must contain at least 2 values (x_m, y_m).");

        double x_m = first[0];
        double y_m = first[1];

        var (lat, lon) = XYtoLatLon(x_m, y_m, _opt.Center.Lat, _opt.Center.Lon, _opt.Earth.RadiusMeters);

        return new PredictionResult { Latitude = lat, Longitude = lon };
    }

    private async Task<DenseTensor<float>> PreprocessImageAsync(Stream imageStream)
    {
        imageStream.Position = 0;
        using var src = await Image.LoadAsync<Rgb24>(imageStream);

        int S = _opt.Preprocess.ImageSize;

        double scale = Math.Min((double)S / src.Width, (double)S / src.Height);
        int newW = Math.Max(1, (int)(src.Width * scale));
        int newH = Math.Max(1, (int)(src.Height * scale));

        using var resized = src.Clone(ctx => ctx.Resize(newW, newH));

        var square = new Image<Rgb24>(S, S);
        int offsetX = (S - newW) / 2;
        int offsetY = (S - newH) / 2;
        square.Mutate(ctx => ctx.DrawImage(resized, new Point(offsetX, offsetY), 1f));

        // тензор [1,3,S,S], CHW, нормализация mean/std
        var t = new DenseTensor<float>(new[] { 1, 3, S, S });
        var mean = _opt.Preprocess.Mean;
        var std  = _opt.Preprocess.Std;

        square.ProcessPixelRows(accessor =>
        {
            for (int y = 0; y < S; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (int x = 0; x < S; x++)
                {
                    var p = row[x];
                    t[0, 0, y, x] = (p.R / 255f - mean[0]) / std[0];
                    t[0, 1, y, x] = (p.G / 255f - mean[1]) / std[1];
                    t[0, 2, y, x] = (p.B / 255f - mean[2]) / std[2];
                }
            }
        });

        square.Dispose();
        return t;
    }

    private static (double lat, double lon) XYtoLatLon(double x_m, double y_m, double centerLat, double centerLon, double rEarth)
    {
        double dLat = (y_m / rEarth) * (180.0 / Math.PI);
        double dLon = (x_m / (rEarth * Math.Cos(Math.PI * centerLat / 180.0))) * (180.0 / Math.PI);
        return (centerLat + dLat, centerLon + dLon);
    }

    public void Dispose() => _session.Dispose();
}