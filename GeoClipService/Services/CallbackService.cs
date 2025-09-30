using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GeoClipService.Models;
using Hangfire;

namespace GeoClipService.Services;

public class CallbackService(IHttpClientFactory http, IConfiguration cfg)
{
    [Queue("callbacks")]
    [AutomaticRetry(
        Attempts = 5,
        OnAttemptsExceeded = AttemptsExceededAction.Fail
        , DelaysInSeconds = [30, 60, 120, 300, 600]
    )]
    public async Task NotifyAsync(CallbackResponse payload)
    {
        var client = http.CreateClient();

        var secret = cfg["Callbacks:Secret"];
        var body = JsonSerializer.Serialize(payload);
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        if (!string.IsNullOrEmpty(secret))
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var sig = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
            content.Headers.Add("X-Signature", "sha256=" + Convert.ToHexString(sig).ToLowerInvariant());
        }

        var resp = await client.PostAsync(payload.CallbackUrl, content);
        resp.EnsureSuccessStatusCode();
    }
}