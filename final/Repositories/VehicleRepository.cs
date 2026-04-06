using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class VehicleRepository : IVehicleRepository
{
    private readonly NovaDriveContext _db;
    public VehicleRepository(NovaDriveContext db) => _db = db;

    public async Task<Vehicle?> GetByIdAsync(Guid id)
        => await _db.Vehicles.FindAsync(id);

    public async Task<List<Vehicle>> GetAllAsync()
        => await _db.Vehicles.AsNoTracking().ToListAsync();

    public async Task AddAsync(Vehicle v)
    {
        _db.Vehicles.Add(v);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Vehicle v)
    {
        _db.Vehicles.Update(v);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var v = await _db.Vehicles.FindAsync(id);
        if (v is not null)
        {
            _db.Vehicles.Remove(v);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Vehicle?> GetNearestActiveAsync(double lat, double lng)
    {
        return await _db.Vehicles
            .Where(x => x.IsActive && x.Latitude != null && x.Longitude != null)
            .OrderBy(x => (x.Latitude!.Value - lat) * (x.Latitude.Value - lat)
                        + (x.Longitude!.Value - lng) * (x.Longitude.Value - lng))
            .FirstOrDefaultAsync();
    }
}