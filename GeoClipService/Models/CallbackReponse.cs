namespace GeoClipService.Models;

public class CallbackResponse
{
    public string TaskId { get; set; } = default!;
    public string Status { get; set; } = default!;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public PredictionResult? Result { get; set; }
    public string CallbackUrl { get; set; } = null!;
}