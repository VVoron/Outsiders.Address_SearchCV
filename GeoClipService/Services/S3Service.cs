
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Mvc;

namespace GeoClipService.Services;

public class S3Service(IConfiguration config, IAmazonS3 s3)
{
    public async Task<FileStreamResult> Get(string key)
    {
        var bucket = config["AWS_BUCKET_NAME"] ?? config["AWS_STORAGE_BUCKET_NAME"]; // подстрахуемся

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