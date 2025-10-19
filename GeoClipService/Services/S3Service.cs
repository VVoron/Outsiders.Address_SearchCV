
using Amazon.S3;
using Amazon.S3.Model;
using GeoClipService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GeoClipService.Services;

public class S3Service(IOptions<S3Options> config, IAmazonS3 s3)
{
    private readonly S3Options _s3Options = config.Value;
    
    public async Task<FileStreamResult> Get(string key)
    {
        var bucket = _s3Options.BucketName;

        var request = new GetObjectRequest
        {
            BucketName = bucket,
            Key = key
        };

        var response = await s3.GetObjectAsync(request);

        var contentType = response.Headers.ContentType;
        if (string.IsNullOrWhiteSpace(contentType))
        {
            contentType = GetContentTypeFromKey(key);
        }

        return new FileStreamResult(response.ResponseStream, contentType ?? "application/octet-stream")
        {
            EnableRangeProcessing = true
        };
    }
    
    public async Task<string> Upload(Stream data, string key, string contentType = "image/jpeg", CancellationToken ct = default)
    {
        var bucket = _s3Options.BucketName;
        if (string.IsNullOrWhiteSpace(bucket))
            throw new InvalidOperationException("Bucket name is not configured.");

        key = key.TrimStart('/');

        var put = new PutObjectRequest
        {
            BucketName = bucket,
            Key = key,
            InputStream = data,
            AutoCloseStream = false,
            ContentType = contentType,
            Headers = { CacheControl = "public, max-age=31536000" }
        };

        var resp = await s3.PutObjectAsync(put, ct);

        var publicEndpoint = _s3Options.PublicEndpoint;
        if (string.IsNullOrWhiteSpace(publicEndpoint))
            return key;

        publicEndpoint = publicEndpoint.TrimEnd('/');
        return $"{publicEndpoint}/{bucket}/{Uri.EscapeDataString(key)}";
    }
    
    private static string GetContentTypeFromKey(string key)
    {
        var ext = Path.GetExtension(key).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"            => "image/png",
            ".gif"            => "image/gif",
            ".webp"           => "image/webp",
            ".bmp"            => "image/bmp",
            ".svg"            => "image/svg+xml",
            ".avif"           => "image/avif",
            _                 => "application/octet-stream"
        };
    }
}