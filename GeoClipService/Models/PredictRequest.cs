namespace GeoClipService.Models;

public class PredictRequest
{
    public string CallbackUrl { get; set; } = null!;
    public IEnumerable<PredictDto> Tasks { get; set; }
}

public class PredictDto
{
    public string FilePath { get; set; } = null!;
    public string TaskId { get; set; } = null!;
}