using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using System.Collections.Generic;

namespace NovaDrive.Services;

public class TelemetryEntry
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonGuidRepresentation(GuidRepresentation.Standard)]
    public Guid VehicleId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double SpeedKmh { get; set; }
    public int BatteryPercent { get; set; }
    public double InternalTempC { get; set; }
}

public interface ITelemetryService
{
    Task InsertAsync(TelemetryEntry entry);
    Task<List<TelemetryEntry>> GetLatestAsync(int limit = 50);
    Task<List<TelemetryEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50);
}

public class TelemetryService : ITelemetryService
{
    private readonly IMongoCollection<TelemetryEntry> _col;
    private static readonly TimeSpan QueryTimeout = TimeSpan.FromSeconds(2);

    public TelemetryService(IConfiguration cfg)
    {
        var conn = cfg["Mongo:ConnectionString"] ?? "mongodb://localhost:27017";
        var dbName = cfg["Mongo:Database"] ?? "novadrive";
        var settings = MongoClientSettings.FromConnectionString(conn);
        settings.ServerSelectionTimeout = QueryTimeout;
        settings.ConnectTimeout = QueryTimeout;
        var client = new MongoClient(settings);
        var db = client.GetDatabase(dbName);
        _col = db.GetCollection<TelemetryEntry>("telemetry");
    }

    public async Task InsertAsync(TelemetryEntry entry)
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
            // Telemetry is best-effort in local demo mode.
        }
    }

    public async Task<List<TelemetryEntry>> GetLatestAsync(int limit = 50)
    {
        try
        {
            using var cts = new CancellationTokenSource(QueryTimeout);
            return await _col.Find(Builders<TelemetryEntry>.Filter.Empty)
                             .SortByDescending(x => x.Timestamp)
                             .Limit(limit)
                             .ToListAsync(cts.Token);
        }
        catch
        {
            return CreateDemoTelemetry(limit);
        }
    }

    public async Task<List<TelemetryEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50)
    {
        try
        {
            using var cts = new CancellationTokenSource(QueryTimeout);
            return await _col.Find(Builders<TelemetryEntry>.Filter.Eq(x => x.VehicleId, vehicleId))
                             .SortByDescending(x => x.Timestamp)
                             .Limit(limit)
                             .ToListAsync(cts.Token);
        }
        catch
        {
            return CreateDemoTelemetry(limit, vehicleId);
        }
    }

    private static List<TelemetryEntry> CreateDemoTelemetry(int limit, Guid? vehicleId = null)
    {
        var id = vehicleId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var now = DateTime.UtcNow;
        var demo = new List<TelemetryEntry>
        {
            new()
            {
                Id = ObjectId.GenerateNewId(),
                VehicleId = id,
                Timestamp = now.AddMinutes(-1),
                Latitude = 51.054,
                Longitude = 3.721,
                SpeedKmh = 42,
                BatteryPercent = 84,
                InternalTempC = 36.8
            },
            new()
            {
                Id = ObjectId.GenerateNewId(),
                VehicleId = id,
                Timestamp = now.AddMinutes(-4),
                Latitude = 51.052,
                Longitude = 3.733,
                SpeedKmh = 27,
                BatteryPercent = 86,
                InternalTempC = 35.9
            },
            new()
            {
                Id = ObjectId.GenerateNewId(),
                VehicleId = id,
                Timestamp = now.AddMinutes(-7),
                Latitude = 51.049,
                Longitude = 3.741,
                SpeedKmh = 0,
                BatteryPercent = 87,
                InternalTempC = 35.2
            }
        };

        return demo.Take(limit).ToList();
    }
}