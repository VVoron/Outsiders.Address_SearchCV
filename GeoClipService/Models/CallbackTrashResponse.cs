public class CallbackTrashResponse
{

    public string TaskId { get; set; } = default!;
    public string Status { get; set; } = default!;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public IList<PredictionResult> Result { get; set; }
    public string CallbackUrl { get; set; } = null!;

}

public class PredictionResult
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string ImagePath { get; set; } = null!;
}