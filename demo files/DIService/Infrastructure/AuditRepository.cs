namespace DIService.Infrastructure;

public interface IAuditRepository
{
    Task LogRequestAsync(string requestId, string logData);
}

public class JsonFileAuditRepository : IAuditRepository
{
    private const string FilePath = "audit_log.json";

    public async Task LogRequestAsync(string requestId, string logData)
    {
        var entry = new { Timestamp = DateTime.UtcNow, RequestId = requestId, Data = logData };
        
        List<object> entries;

        if (File.Exists(FilePath))
        {
            var json = await File.ReadAllTextAsync(FilePath);
            entries = JsonSerializer.Deserialize<List<object>>(json) ?? [];
        }
        else
        {
            entries = [];
        }

        entries.Add(entry);

        await File.WriteAllTextAsync(FilePath, JsonSerializer.Serialize(entries, new JsonSerializerOptions { WriteIndented = true }));
    }
}
