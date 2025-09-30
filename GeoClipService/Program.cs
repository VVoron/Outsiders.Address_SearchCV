using Amazon.Runtime;
using Amazon.S3;
using DotNetEnv;
using GeoClipService;
using GeoClipService.Models;
using GeoClipService.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
Env.Load();
builder.Configuration.AddEnvironmentVariables();

var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

builder.Services.AddHangfire(cfg =>
{
    cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_170)
        .UseIgnoredAssemblyVersionTypeResolver()
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
        {
            options.UseNpgsqlConnection(defaultConnectionString);
        });
});

builder.Services.AddHangfireServer(options =>
{
    options.ServerName = "GeoClipService-Model";
    options.Queues = ["model"];
    options.WorkerCount = 1;
});

builder.Services.AddHangfireServer(o =>
{
    o.ServerName = "GeoClipService-Callbacks";
    o.Queues = ["callbacks"];
    o.WorkerCount = 2;
});

var modelPath = Path.Combine(builder.Environment.WebRootPath, "model_data", "geo_clip_model.onnx");
var configPath = Path.Combine(builder.Environment.WebRootPath, "model_data", "processor_info.json");

builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();

    var accessKey = configuration["AWS_ACCESS_KEY_ID"] ?? "recognition";
    var secretKey = configuration["AWS_SECRET_ACCESS_KEY"] ?? "recognition_password";
    var serviceUrl = configuration["AWS_S3_ENDPOINT_URL"] ?? "http://51.250.115.228:9000";
    var regionName = configuration["AWS_S3_REGION_NAME"] ?? "us-east-1";

    var creds = new BasicAWSCredentials(accessKey, secretKey);

    var s3Config = new AmazonS3Config
    {
        ServiceURL = serviceUrl,
        ForcePathStyle = true,
        AuthenticationRegion = regionName,
        UseHttp = serviceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
    };

    return new AmazonS3Client(creds, s3Config);
});

builder.Services.AddSingleton<PredictService>(_ => new PredictService(modelPath, configPath));
builder.Services.AddScoped<IncomingJobService>();
builder.Services.AddScoped<CallbackService>();
builder.Services.AddScoped<S3Service>();
builder.Services.AddHttpClient();

var app = builder.Build();

app.MapOpenApi();
app.UseSwagger();
app.UseSwaggerUI();
app.UseDeveloperExceptionPage();

app.UseHttpsRedirection();

app.MapControllers();

app.UseHangfireDashboard();

app.Run();