namespace GeoClipService.Models;

public sealed class S3Options
{
    public string RootUser { get; init; } = default!;
    public string RootPassword { get; init; } = default!;

    public string AccessKeyId { get; init; } = default!;
    public string SecretAccessKey { get; init; } = default!;
    public string EndpointUrl { get; init; } = default!;
    public string PublicEndpoint { get; init; } = default!;
    public string BucketName { get; init; } = default!;
    public string RegionName { get; init; } = default!;
    public string SignatureVersion { get; init; } = default!;
    public bool ForcePathStyle { get; init; } = true;
}