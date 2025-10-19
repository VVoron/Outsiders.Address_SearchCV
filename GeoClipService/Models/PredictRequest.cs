namespace GeoClipService.Models;

public class PredictRequest
{
    public string MainCallback { get; set; } = null!;
    public string TrashCallback { get; set; } = null!;
    public IEnumerable<PredictDto> Tasks { get; set; }
}

public class PredictDto
{
    public string TaskId { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public double? Angle { get; set; }
    public double? Height { get; set; }
    public double? Lat { get; set; }
    public double? Lon { get; set; }
}