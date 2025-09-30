namespace GeoClipService.Models
{
    public class PredictionResult
    {
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public float Score { get; set; }
    }
}
