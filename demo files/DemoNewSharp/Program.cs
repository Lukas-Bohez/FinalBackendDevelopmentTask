var builder = WebApplication.CreateBuilder(args);

// Register services
// Using AddHttpClient<TInterface, TImplementation> registers the service 
// and automatically injects a pre-configured HttpClient into it.
builder.Services.AddHttpClient<ILongRunningService, LongRunningService>();

var app = builder.Build();

// Minimal API endpoint specifically showing CancellationToken usage
app.MapGet("/long-running", async (int duration, ILongRunningService service, CancellationToken ct) =>
{
    // CancellationToken (ct) is automatically injected by ASP.NET Core when the client disconnects or cancels the request
    var result = await service.DoWorkAsync(duration, ct);
    return Results.Ok(new { message = result });
});

app.MapGet("/remote-fetch", async (ILongRunningService service, CancellationToken ct) =>
{
    // This demonstrates cancelling an outgoing HTTP request when the incoming request is cancelled
    var result = await service.FetchRemoteDataAsync(ct);
    return Results.Ok(System.Text.Json.JsonDocument.Parse(result)); // Parse JSON to return structured data
});

 
app.Run();
