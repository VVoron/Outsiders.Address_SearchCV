using System.ComponentModel.DataAnnotations;
using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using GeoClipService.Models;
using Microsoft.AspNetCore.Mvc;
using GeoClipService.Services;
using Hangfire;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

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
                var jobId = jobs.Enqueue<IncomingJobService>(
                    h => h.HandleAsync(task, payload.CallbackUrl)
                );

                jobsList.Add(jobId);
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
}