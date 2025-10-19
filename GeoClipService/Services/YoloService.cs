using System.Net.Mime;
using GeoClipService.Models;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Advanced;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace GeoClipService.Services;

public class YoloService : IDisposable
{
    private readonly YoloRunner _runner;
    private readonly YoloOptions _opt;
    private readonly JpegEncoder _jpeg = new() { Quality = 90 };

    public YoloService(IOptions<YoloOptions> options)
    {
        _opt = options.Value;
        if (string.IsNullOrWhiteSpace(_opt.ModelPath))
            throw new InvalidOperationException("Yolo:ModelPath is not configured.");
        if (_opt.ClassNames is null || _opt.ClassNames.Length == 0)
            throw new InvalidOperationException("Yolo:ClassNames are not configured.");

        _runner = new YoloRunner(_opt.ModelPath, _opt.ClassNames);
    }

    public async Task<(IReadOnlyList<byte[]> imageJpeg, bool found, List<Detection> detections)> DetectAsync(
        Stream image,
        double camLat, double camLon, double camAngleDeg, double camHeight,
        CancellationToken ct = default)
    {
        using var src = await Image.LoadAsync<Rgba32>(image, ct);

        var (images, found, detections) = _runner.Predict(
            src, camLat, camLon, camAngleDeg, camHeight,
            _opt.ConfThreshold, _opt.IouThreshold);

        if (!found || images.Count == 0)
        {
            foreach (var im in images) im.Dispose();
            return (Array.Empty<byte[]>(), false, detections);
        }

        var outputs = new List<byte[]>(images.Count);

        try
        {
            foreach (var im in images)
            {
                await using var ms = new MemoryStream();
                await im.SaveAsJpegAsync(ms, _jpeg, ct);
                outputs.Add(ms.ToArray());
            }
        }
        finally
        {
            foreach (var im in images) im.Dispose();
        }

        return (outputs, true, detections);
    }

    public void Dispose() => _runner.Dispose();
}

public class YoloRunner : IDisposable
{
    private readonly InferenceSession session;
    private readonly string[] classNames;
    private const int InputSize = 640;

    private static readonly Font LabelFont = TryLoadFont();

    public YoloRunner(string modelPath, string[] classNames)
    {
        this.classNames = classNames;
        session = new InferenceSession(modelPath);
    }
    
    private static Font TryLoadFont()
    {
        try { return SystemFonts.CreateFont("Arial", 18, FontStyle.Bold); } catch {}
        try { return SystemFonts.CreateFont("DejaVu Sans", 18, FontStyle.Bold); } catch {}
        try { return SystemFonts.CreateFont("Liberation Sans", 18, FontStyle.Bold); } catch {}
        var any = SystemFonts.Families.First().CreateFont(18, FontStyle.Bold);
        return any;
    }

    public (IReadOnlyList<Image<Rgba32>> images, bool foundTrash, List<Detection> detections) Predict(
        Image<Rgba32> img,
        double camLat = 0, double camLon = 0, double camAngle = 0, double camHeight = 1.5,
        float confThreshold = 0.25f, float iouThreshold = 0.45f)
    {
        int origW = img.Width, origH = img.Height;

        var (letterboxed, scale, padX, padY) = Letterbox(img, InputSize, InputSize);

        var input = new DenseTensor<float>(new[] { 1, 3, InputSize, InputSize });
        FillChwFromImage(letterboxed, input);

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("images", input)
        };

        using var results = session.Run(inputs);
        var outputTensor = results.First().AsTensor<float>();
        int numBoxes = outputTensor.Dimensions[2];

        var raw = new List<Detection>();
        for (int i = 0; i < numBoxes; i++)
        {
            float x = outputTensor[0, 0, i];
            float y = outputTensor[0, 1, i];
            float wBox = outputTensor[0, 2, i];
            float hBox = outputTensor[0, 3, i];
            float objConf = outputTensor[0, 4, i];
            if (objConf < confThreshold) continue;

            float maxCls = 0;
            int clsId = -1;
            for (int c = 0; c < classNames.Length; c++)
            {
                float clsConf = outputTensor[0, 4 + c, i];
                if (clsConf > maxCls)
                {
                    maxCls = clsConf;
                    clsId = c;
                }
            }

            float conf = objConf * maxCls;
            if (conf < confThreshold) continue;

            float x1 = (x - wBox / 2 - padX) / scale;
            float y1 = (y - hBox / 2 - padY - hBox) / scale;
            float w = wBox / scale;
            float h = hBox / scale;

            raw.Add(new Detection
            {
                Box = new RectangleF(x1, y1, w, h),
                Confidence = conf,
                ClassId = clsId
            });
        }

        var final = Nms(raw, iouThreshold);

        foreach (var det in final)
        {
            (double lat, double lon) = ProjectTrashToMap(
                det.Box, origW, origH, camLat, camLon, camAngle, 90.0, camHeight);
            det.Latitude = lat;
            det.Longitude = lon;
        }
        
        if (final.Count == 0)
            return (Array.Empty<Image<Rgba32>>(), false, []);

        var outputs = new List<Image<Rgba32>>(final.Count);
        for (int i = 0; i < final.Count; i++)
        {
            var det = final[i];
            var one = img.Clone();
            DrawSingleDetection(one, det);
            outputs.Add(one);
        }

        return (outputs, true, final);
    }
    
    private void DrawSingleDetection(Image<Rgba32> img, Detection det)
    {
        var r = det.Box;

        img.Mutate(ctx => ctx.Draw(Color.Red, 3, r));

        string clsName = classNames.ElementAtOrDefault(det.ClassId) ?? $"cls{det.ClassId}";
        string label = $"{clsName} {det.Confidence:F2}";

        var measureOpts = new TextOptions(LabelFont) { WrappingLength = 0 };
        var textSize = TextMeasurer.MeasureSize(label, measureOpts);

        float tx = r.X + 4;
        float ty = r.Y - textSize.Height - 2;
        if (ty < 0) ty = r.Y + 2;

        var bgRect = new RectangleF(tx - 4, ty - 2, textSize.Width + 8, textSize.Height + 4);

        img.Mutate(ctx =>
        {
            ctx.Fill(Color.Black, bgRect);

            var rto = new RichTextOptions(LabelFont)
            {
                Origin = new PointF(tx, ty),
                WrappingLength = 0,
                HorizontalAlignment = HorizontalAlignment.Left,
                VerticalAlignment = VerticalAlignment.Top
            };

            ctx.DrawText(rto, label, Color.Yellow);
        });
    }

    // --- Helpers ---

    private static (Image<Rgba32> resized, float scale, int padX, int padY) Letterbox(Image<Rgba32> source, int targetW, int targetH)
    {
        float r = MathF.Min((float)targetW / source.Width, (float)targetH / source.Height);
        int newW = (int)(source.Width * r);
        int newH = (int)(source.Height * r);

        var canvas = new Image<Rgba32>(targetW, targetH, new Rgba32(128, 128, 128));
        int padX = (targetW - newW) / 2;
        int padY = (targetH - newH) / 2;

        using var scaled = source.Clone(ctx => ctx.Resize(newW, newH));
        canvas.Mutate(ctx => ctx.DrawImage(scaled, new Point(padX, padY), 1f));

        return (canvas, r, padX, padY);
    }

    private static void FillChwFromImage(Image<Rgba32> img, DenseTensor<float> dst)
    {
        for (int y = 0; y < img.Height; y++)
        {
            Span<Rgba32> row = img.DangerousGetPixelRowMemory(y).Span;
            for (int x = 0; x < img.Width; x++)
            {
                var p = row[x];
                dst[0, 0, y, x] = p.R / 255f;
                dst[0, 1, y, x] = p.G / 255f;
                dst[0, 2, y, x] = p.B / 255f;
            }
        }
    }

    private static List<Detection> Nms(List<Detection> dets, float iouTh)
    {
        var result = new List<Detection>();
        foreach (var d in dets.OrderByDescending(x => x.Confidence))
        {
            bool keep = true;
            foreach (var s in result)
            {
                if (IoU(d.Box, s.Box) > iouTh) { keep = false; break; }
            }
            if (keep) result.Add(d);
        }
        return result;
    }

    private static float IoU(RectangleF a, RectangleF b)
    {
        float interX1 = MathF.Max(a.Left, b.Left);
        float interY1 = MathF.Max(a.Top, b.Top);
        float interX2 = MathF.Min(a.Right, b.Right);
        float interY2 = MathF.Min(a.Bottom, b.Bottom);

        float interArea = MathF.Max(0, interX2 - interX1) * MathF.Max(0, interY2 - interY1);
        float unionArea = a.Width * a.Height + b.Width * b.Height - interArea + 1e-6f;
        return interArea / unionArea;
    }

    private static void DrawDetections(Image<Rgba32> img, IEnumerable<Detection> dets, string[] classes)
    {
        foreach (var d in dets)
        {
            var r = d.Box;

            // рамка прямоугольника
            img.Mutate(ctx => ctx.Draw(Color.Red, 3, r));

            // текст и подложка
            string label = $"{classes[d.ClassId]} {d.Confidence:F2}";

            var measureOpts = new TextOptions(LabelFont) { WrappingLength = 0 };
            var textSize = TextMeasurer.MeasureSize(label, measureOpts);

            float tx = r.X + 4;
            float ty = r.Y - textSize.Height - 2;
            if (ty < 0) ty = r.Y + 2;

            var bgRect = new RectangleF(tx - 4, ty - 2, textSize.Width + 8, textSize.Height + 4);

            img.Mutate(ctx =>
            {
                ctx.Fill(Color.Black, bgRect);

                var rto = new RichTextOptions(LabelFont)
                {
                    Origin = new PointF(tx, ty),
                    WrappingLength = 0,
                    HorizontalAlignment = HorizontalAlignment.Left,
                    VerticalAlignment = VerticalAlignment.Top
                };

                ctx.DrawText(rto, label, Color.Yellow);
            });
        }
    }

    public static (double lat, double lon) ProjectTrashToMap(
        RectangleF box, int imageW, int imageH,
        double camLat, double camLon,
        double camAngleDeg, double fovDeg = 90.0,
        double camHeight = 1.5)
    {
        double cx = box.X + box.Width / 2.0;
        double cy = box.Y + box.Height / 2.0;

        double dx = (cx - imageW / 2.0) / (imageW / 2.0) * (fovDeg / 2.0);
        double dy = (cy - imageH / 2.0) / (imageH / 2.0) * (fovDeg / 2.0);

        double dyRad = dy * Math.PI / 180.0;
        double distance = camHeight / Math.Tan(Math.Abs(dyRad) + 1e-6);

        double totalAngle = (camAngleDeg - dx + 360.0) % 360.0;
        double bearingRad = totalAngle * Math.PI / 180.0;

        double dNorth = Math.Cos(bearingRad) * distance;
        double dEast = Math.Sin(bearingRad) * distance;

        const double R = 6378137.0;
        double newLat = camLat + (dNorth / R) * (180.0 / Math.PI);
        double newLon = camLon + (dEast / (R * Math.Cos(camLat * Math.PI / 180.0))) * (180.0 / Math.PI);

        return (newLat, newLon);
    }

    public void Dispose() => session.Dispose();
}

public sealed class Detection
{
    public RectangleF Box { get; set; }
    public float Confidence { get; set; }
    public int ClassId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
