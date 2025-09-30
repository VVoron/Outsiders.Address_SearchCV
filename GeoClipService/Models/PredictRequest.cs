namespace GeoClipService.Models;

public class PredictRequest
{
    public string CallbackUrl { get; set; } = null!;
    public IEnumerable<PredictDto> Tasks { get; set; }
}

public class PredictDto
{
    public string FileName { get; set; } = null!;
    public string TaskId { get; set; } = null!;
}