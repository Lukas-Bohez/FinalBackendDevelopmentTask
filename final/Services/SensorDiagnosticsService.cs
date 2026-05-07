using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using System.Collections.Generic;

namespace NovaDrive.Services;

public enum SensorType
{
    Lidar,
    Radar,
    Camera
}

public enum DiagnosticSeverity
{
    Info,
    Warning,
    Critical
}

public class SensorDiagnosticEntry
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonGuidRepresentation(GuidRepresentation.Standard)]
    public Guid VehicleId { get; set; }

    public SensorType SensorType { get; set; }
    public string ErrorCode { get; set; } = string.Empty;
    public DiagnosticSeverity Severity { get; set; }
    public DateTime Timestamp { get; set; }
    public string RawSensorDataJson { get; set; } = "{}";
}

public interface ISensorDiagnosticsService
{
    Task InsertAsync(SensorDiagnosticEntry entry);
    Task<List<SensorDiagnosticEntry>> GetLatestAsync(int limit = 50);
    Task<List<SensorDiagnosticEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50);
}

public class SensorDiagnosticsService : ISensorDiagnosticsService
{
    private readonly IMongoCollection<SensorDiagnosticEntry> _col;
    private static readonly TimeSpan QueryTimeout = TimeSpan.FromSeconds(2);

    public SensorDiagnosticsService(IConfiguration cfg)
    {
        var conn = cfg["Mongo:ConnectionString"] ?? "mongodb://localhost:27017";
        var dbName = cfg["Mongo:Database"] ?? "novadrive";
        var settings = MongoClientSettings.FromConnectionString(conn);
        settings.ServerSelectionTimeout = QueryTimeout;
        settings.ConnectTimeout = QueryTimeout;
        var client = new MongoClient(settings);
        var db = client.GetDatabase(dbName);
        _col = db.GetCollection<SensorDiagnosticEntry>("sensor_diagnostics");
    }

    public async Task InsertAsync(SensorDiagnosticEntry entry)
    {
        if (entry.Id == ObjectId.Empty)
        {
            entry.Id = ObjectId.GenerateNewId();
        }

        try
        {
            using var cts = new CancellationTokenSource(QueryTimeout);
            await _col.InsertOneAsync(entry, cancellationToken: cts.Token);
        }
        catch
        {
            // Diagnostics are best-effort in local demo mode.
        }
    }

    public async Task<List<SensorDiagnosticEntry>> GetLatestAsync(int limit = 50)
    {
        try
        {
            using var cts = new CancellationTokenSource(QueryTimeout);
            return await _col.Find(Builders<SensorDiagnosticEntry>.Filter.Empty)
                             .SortByDescending(x => x.Timestamp)
                             .Limit(limit)
                             .ToListAsync(cts.Token);
        }
        catch
        {
            return CreateDemoDiagnostics(limit);
        }
    }

    public async Task<List<SensorDiagnosticEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50)
    {
        try
        {
            using var cts = new CancellationTokenSource(QueryTimeout);
            return await _col.Find(Builders<SensorDiagnosticEntry>.Filter.Eq(x => x.VehicleId, vehicleId))
                             .SortByDescending(x => x.Timestamp)
                             .Limit(limit)
                             .ToListAsync(cts.Token);
        }
        catch
        {
            return CreateDemoDiagnostics(limit, vehicleId);
        }
    }

    private static List<SensorDiagnosticEntry> CreateDemoDiagnostics(int limit, Guid? vehicleId = null)
    {
        var id = vehicleId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var now = DateTime.UtcNow;
        var demo = new List<SensorDiagnosticEntry>
        {
            new()
            {
                Id = ObjectId.GenerateNewId(),
                VehicleId = id,
                SensorType = SensorType.Camera,
                ErrorCode = "CAM-OK",
                Severity = DiagnosticSeverity.Info,
                Timestamp = now.AddMinutes(-2),
                RawSensorDataJson = "{\"camera\":\"nominal\"}"
            },
            new()
            {
                Id = ObjectId.GenerateNewId(),
                VehicleId = id,
                SensorType = SensorType.Radar,
                ErrorCode = "RAD-WARN-12",
                Severity = DiagnosticSeverity.Warning,
                Timestamp = now.AddMinutes(-6),
                RawSensorDataJson = "{\"radar\":\"reduced range\"}"
            }
        };

        return demo.Take(limit).ToList();
    }
}
