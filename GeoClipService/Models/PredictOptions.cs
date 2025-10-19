namespace GeoClipService.Models;

public sealed class PredictOptions
{
    public string ModelPath { get; set; }
    public bool UseCudaIfAvailable { get; init; }
    public string ModelInputName { get; init; }

    public CenterOptions Center { get; init; }
    public PreprocessOptions Preprocess { get; init; }
    public EarthOptions Earth { get; init; }

    public sealed class CenterOptions
    {
        public double Lat { get; init; }
        public double Lon { get; init; }
    }

    public sealed class PreprocessOptions
    {
        public int ImageSize { get; init; }
        public float[] Mean { get; init; }
        public float[] Std  { get; init; }
    }

    public sealed class EarthOptions
    {
        public double RadiusMeters { get; init; }
    }
}