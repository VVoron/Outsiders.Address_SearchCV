using Amazon.Runtime;
using Amazon.S3;
using GeoClipService;
using GeoClipService.Models;
using GeoClipService.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

builder.Services.Configure<S3Options>(builder.Configuration.GetSection("S3"));
builder.Services.Configure<YoloOptions>(builder.Configuration.GetSection("Yolo"));

var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");


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
    var s3 = sp.GetRequiredService<IOptions<S3Options>>().Value;

    var creds = new BasicAWSCredentials(s3.AccessKeyId, s3.SecretAccessKey);

    var s3Config = new AmazonS3Config
    {
        ServiceURL = s3.EndpointUrl,
        ForcePathStyle = s3.ForcePathStyle,
        AuthenticationRegion = s3.RegionName,
        UseHttp = s3.EndpointUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
    };

    return new AmazonS3Client(creds, s3Config);
});

builder.Services.AddSingleton<PredictService>(_ => new PredictService(modelPath, configPath));
builder.Services.AddSingleton<YoloService>();
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