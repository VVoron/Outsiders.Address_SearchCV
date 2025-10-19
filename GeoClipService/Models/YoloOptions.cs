namespace GeoClipService.Models;

public sealed class YoloOptions
{
    public string ModelPath { get; init; }
    public string[] ClassNames { get; init; }
    public float ConfThreshold { get; init; }
    public float IouThreshold { get; init; }
    public double FovDeg { get; init; }
}