using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories
{
    public class VehicleRepository : IVehicleRepository
    {
        private readonly NovaDriveContext _db;
        public VehicleRepository(NovaDriveContext db) => _db = db;

        public async Task AddAsync(Vehicle v)
        {
            _db.Vehicles.Add(v);
            await _db.SaveChangesAsync();
        }

        // very simple nearest vehicle: Euclidean distance on lat/lng (sufficient for demo)
        public async Task<Vehicle?> GetNearestActiveAsync(double lat, double lng)
        {
            return await _db.Vehicles
                .Where(x => x.IsActive && x.Latitude != null && x.Longitude != null)
                .OrderBy(x => (x.Latitude!.Value - lat) * (x.Latitude.Value - lat) + (x.Longitude!.Value - lng) * (x.Longitude.Value - lng))
                .FirstOrDefaultAsync();
        }
    }
}