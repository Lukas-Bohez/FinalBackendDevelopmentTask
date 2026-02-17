namespace NewSharpDemo.Services;

public interface ILongRunningService
{
    Task<string> DoWorkAsync(int seconds, CancellationToken ct);
    Task<string> FetchRemoteDataAsync(CancellationToken ct);
}

public class LongRunningService : ILongRunningService
{
    private readonly ILogger<LongRunningService> _logger;
    private readonly HttpClient _httpClient;

    public LongRunningService(ILogger<LongRunningService> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<string> FetchRemoteDataAsync(CancellationToken ct)
    {
        _logger.LogInformation("Starting remote fetch (5s delay)...");

        try
        {
            var response = await _httpClient.GetAsync("https://httpbin.org/delay/5", ct);
            
            _logger.LogInformation("Remote fetch completed.");
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Remote fetch was cancelled by the client.");
            throw; 
        }
    }

    

    public async Task<string> FetchRemoteDataAsync(CancellationToken ct)
    {
        _logger.LogInformation("Starting remote fetch (5s delay)...");

        try
        {
            // Passing the CancellationToken to HttpClient methods is critical.
            // If the token is cancelled, HttpClient will abort the socket connection immediately.
            var response = await _httpClient.GetAsync("https://httpbin.org/delay/5", ct);
            
            _logger.LogInformation("Remote fetch completed.");
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Remote fetch was cancelled by the client.");
            throw; 
        }
    }

    public async Task<string> DoWorkAsync(int seconds, CancellationToken ct)
    {
        _logger.LogInformation("Starting work for {Seconds} seconds...", seconds);

        try
        {
            // The Task.Delay will throw TaskCanceledException if the token is cancelled
            await Task.Delay(TimeSpan.FromSeconds(seconds), ct);
            
            _logger.LogInformation("Work completed.");
            return $"Completed work in {seconds} seconds.";
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Work was cancelled by the client.");
            throw; // Important to rethrow so the API returns the correct status (usually 499 Client Closed Request in logs, or just aborts)
        }
    }
}
