using GeoClipService.Models;
using Hangfire;

namespace GeoClipService.Services;


public class IncomingJobService(PredictService svc, IBackgroundJobClient jobs, S3Service s3)
{
    [Queue("model")]
    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(60 * 30)]
    public async Task HandleAsync(PredictDto dto, string callbackUrl)
    {
        try
        {
            var s3Obj = await s3.Get(dto.FileName);
            
            await using var seekable = await AsSeekableAsync(s3Obj.FileStream, preferMemory: true);

            var result = await svc.PredictFromImage(seekable);
            
            jobs.Enqueue<CallbackService>(cb =>
                cb.NotifyAsync(new CallbackResponse
                {
                    TaskId = dto.TaskId,
                    Status = "Succeeded",
                    Result = new PredictionResult
                        { Latitude = result.Latitude * 90f, Longitude = result.Longitude * 180f },
                    CallbackUrl = callbackUrl
                }));
        }
        catch (Exception ex)
        {
            jobs.Enqueue<CallbackService>(cb => cb.NotifyAsync(new CallbackResponse
            {
                TaskId = dto.TaskId,
                Status = "Failed",
                ErrorCode = ex.GetType().Name,
                ErrorMessage = ex.Message,
                CallbackUrl = callbackUrl
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
}