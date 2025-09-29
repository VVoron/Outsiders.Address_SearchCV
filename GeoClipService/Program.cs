using GeoClipService;
using GeoClipService.Services;
using Hangfire;
using Hangfire.PostgreSql;

var builder = WebApplication.CreateBuilder(args);

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


builder.Services.AddSingleton<PredictService>(_ => new PredictService(modelPath, configPath));
builder.Services.AddScoped<IncomingJobService>();
builder.Services.AddScoped<CallbackService>();
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