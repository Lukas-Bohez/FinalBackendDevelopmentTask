using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace NovaDrive.Services
{
    public class TelemetryEntry
    {
        [BsonId]
        public ObjectId Id { get; set; }
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
    }

    public class TelemetryService : ITelemetryService
    {
        private readonly IMongoCollection<TelemetryEntry> _col;

        public TelemetryService(IConfiguration cfg)
        {
            var conn = cfg["Mongo:ConnectionString"] ?? "mongodb://localhost:27017";
            var dbName = cfg["Mongo:Database"] ?? "novadrive";
            var client = new MongoClient(conn);
            var db = client.GetDatabase(dbName);
            _col = db.GetCollection<TelemetryEntry>("telemetry");
        }

        public async Task InsertAsync(TelemetryEntry entry) => await _col.InsertOneAsync(entry);

        public async Task<List<TelemetryEntry>> GetLatestAsync(int limit = 50)
        {
            return await _col.Find(Builders<TelemetryEntry>.Filter.Empty)
                             .SortByDescending(x => x.Timestamp)
                             .Limit(limit)
                             .ToListAsync();
        }
    }
}