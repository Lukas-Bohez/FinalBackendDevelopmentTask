using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

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

    public SensorDiagnosticsService(IConfiguration cfg)
    {
        var conn = cfg["Mongo:ConnectionString"] ?? "mongodb://localhost:27017";
        var dbName = cfg["Mongo:Database"] ?? "novadrive";
        var client = new MongoClient(conn);
        var db = client.GetDatabase(dbName);
        _col = db.GetCollection<SensorDiagnosticEntry>("sensor_diagnostics");
    }

    public async Task InsertAsync(SensorDiagnosticEntry entry)
    {
        if (entry.Id == ObjectId.Empty)
        {
            entry.Id = ObjectId.GenerateNewId();
        }

        await _col.InsertOneAsync(entry);
    }

    public async Task<List<SensorDiagnosticEntry>> GetLatestAsync(int limit = 50)
    {
        return await _col.Find(Builders<SensorDiagnosticEntry>.Filter.Empty)
                         .SortByDescending(x => x.Timestamp)
                         .Limit(limit)
                         .ToListAsync();
    }

    public async Task<List<SensorDiagnosticEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50)
    {
        return await _col.Find(Builders<SensorDiagnosticEntry>.Filter.Eq(x => x.VehicleId, vehicleId))
                         .SortByDescending(x => x.Timestamp)
                         .Limit(limit)
                         .ToListAsync();
    }
}
