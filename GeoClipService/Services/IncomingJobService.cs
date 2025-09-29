using GeoClipService.Models;
using Hangfire;

namespace GeoClipService.Services;


public class IncomingJobService(PredictService svc, IBackgroundJobClient jobs)
{
    [Queue("model")]
    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(60 * 30)]
    public async Task HandleAsync(PredictDto dto, string callbackUrl)
    {
        try
        {
            await using var fs = new FileStream(dto.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var result = await svc.PredictFromImage(fs);
            
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
}