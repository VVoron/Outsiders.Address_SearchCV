using System.ComponentModel.DataAnnotations;
using GeoClipService.Models;
using Microsoft.AspNetCore.Mvc;
using GeoClipService.Services;
using Hangfire;

namespace GeoClipService.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PredictionController(IBackgroundJobClient jobs) : ControllerBase
{
    
    [HttpPost]
    public IActionResult Predict([FromBody] PredictRequest payload)
    {
        var jobsList = new List<string>();
        var errors = new List<ValidationErrorResponse>();

        foreach (var task in payload.Tasks)
        {
            try
            {
                ValidateTaskOrThrow(task);

                var jobId = jobs.Enqueue<IncomingJobService>(
                    h => h.HandleAsync(task, payload.CallbackUrl)
                );

                jobsList.Add(jobId);
            }
            catch (ValidationException vex)
            {
                errors.Add(new ValidationErrorResponse {
                    TaskId = task?.TaskId ?? string.Empty,
                    Error = vex.Message
                });
            }
            catch (Exception ex)
            {
                errors.Add(new ValidationErrorResponse {
                    TaskId = task?.TaskId ?? string.Empty,
                    Error = $"Enqueue failed: {ex.Message}"
                });
            }
        }

        var response = new Response { Jobs = jobsList, ValidationErrors = errors };

        if (jobsList.Count == 0)
            return UnprocessableEntity(response);

        return Accepted(response);
    }
    
    private static void ValidateTaskOrThrow(PredictDto task)
    {
        if (task is null)
            throw new ValidationException("Task is required.");

        if (string.IsNullOrWhiteSpace(task.TaskId))
            throw new ValidationException("TaskId is required.");

        if (string.IsNullOrWhiteSpace(task.FilePath))
            throw new ValidationException($"FilePath is required for taskId={task.TaskId}.");

        var fullPath = task.FilePath;

        if (!System.IO.File.Exists(task.FilePath))
            throw new ValidationException($"File not found: '{fullPath}' for taskId={task.TaskId}.");
    }
}