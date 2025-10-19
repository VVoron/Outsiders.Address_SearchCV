using GeoClipService.Models;
using Hangfire;

namespace GeoClipService.Services;


public class IncomingJobService(PredictService svc, IBackgroundJobClient jobs, S3Service s3, YoloService yolo)
{
    [Queue("model")]
    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(60 * 30)]
    public async Task HandleAsync(PredictDto dto, string mainCallback, string trashCallback)
    {
        try
        {
            var s3Obj = await s3.Get(dto.FileName);

            await using var seekable = await AsSeekableAsync(s3Obj.FileStream, preferMemory: true);
            seekable.Position = 0;

            if (!dto.Lat.HasValue || !dto.Lon.HasValue)
            {
                var coords = await svc.PredictFromImage(seekable);
                seekable.Position = 0;

                dto.Lat ??= coords.Latitude;
                dto.Lon ??= coords.Longitude;
                dto.Angle ??= 0;
                dto.Height ??= 1.5;

                jobs.Enqueue<CallbackService>(cb =>
                    cb.NotifyAsync(new CallbackResponse
                    {
                        TaskId = dto.TaskId,
                        Status = "Succeeded",
                        Result = new Models.PredictionResult
                        {
                            Latitude = coords.Latitude,
                            Longitude = coords.Longitude
                        },
                        CallbackUrl = mainCallback
                    }));
            }

            var camLat = dto.Lat ?? 0;
            var camLon = dto.Lon ?? 0;
            var camAngle = dto.Angle ?? 0;
            var camHeight = dto.Height ?? 1.5;

            List<PredictionResult> detWithUrls;
            try
            {
                seekable.Position = 0;
                var (imagesJpeg, found, detections) =
                    await yolo.DetectAsync(seekable, camLat, camLon, camAngle, camHeight);

                detWithUrls = new List<PredictionResult>(detections.Count);
                for (var i = 0; i < detections.Count; i++)
                {
                    string? url = null;
                    if (i < imagesJpeg.Count)
                    {
                        await using var outStream = new MemoryStream(imagesJpeg[i]);
                        var outKey = BuildResultKeyPerDetection(dto.FileName, dto.TaskId, i + 1);
                        url = await s3.Upload(outStream, outKey, "image/jpeg");
                    }

                    var d = detections[i];
                    detWithUrls.Add(new PredictionResult
                    {
                        Latitude = d.Latitude,
                        Longitude = d.Longitude,
                        ImagePath = url
                    });
                }

                jobs.Enqueue<CallbackService>(cb =>
                    cb.NotifyTrashAsync(new CallbackTrashResponse
                    {
                        TaskId = dto.TaskId,
                        Status = "Succeeded",
                        Result = detWithUrls,
                        CallbackUrl = trashCallback
                    }));
            }
            catch (Exception yoloEx)
            {
                jobs.Enqueue<CallbackService>(cb =>
                    cb.NotifyTrashAsync(new CallbackTrashResponse
                    {
                        TaskId = dto.TaskId,
                        Status = "Failed",
                        ErrorCode = yoloEx.GetType().Name,
                        ErrorMessage = yoloEx.Message,
                        CallbackUrl = trashCallback
                    }));
            }
        }
        catch (Exception ex)
        {
            jobs.Enqueue<CallbackService>(cb => cb.NotifyAsync(new CallbackResponse
            {
                TaskId = dto.TaskId,
                Status = "Failed",
                ErrorCode = ex.GetType().Name,
                ErrorMessage = ex.Message,
                CallbackUrl = mainCallback
            }));
        }
    }



    private async Task<Stream> AsSeekableAsync(Stream input, bool preferMemory = true, CancellationToken ct = default)
    {
        if (input.CanSeek) return input;

        if (preferMemory)
        {
            var ms = new MemoryStream();
            await input.CopyToAsync(ms, ct);
            ms.Position = 0;
            return ms;
        }
        else
        {
            var tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
            await using (var fs = new FileStream(tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.Read))
                await input.CopyToAsync(fs, ct);
            
            return new FileStream(tempPath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.DeleteOnClose);
        }
    }
    
    private static string BuildResultKeyPerDetection(string sourceKey, string taskId, int index)
    {
        var name = Path.GetFileNameWithoutExtension(sourceKey);
        return $"results/{name}_{taskId}_det{index}.jpg";
    }
}