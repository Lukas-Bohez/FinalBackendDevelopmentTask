using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class MaintenanceLogRepository : IMaintenanceLogRepository
{
    private readonly NovaDriveContext _db;
    public MaintenanceLogRepository(NovaDriveContext db) => _db = db;

    public async Task<MaintenanceLog?> GetByIdAsync(Guid id)
        => await _db.MaintenanceLogs.FindAsync(id);

    public async Task<List<MaintenanceLog>> GetByVehicleAsync(Guid vehicleId)
        => await _db.MaintenanceLogs
            .Where(m => m.VehicleId == vehicleId)
            .OrderByDescending(m => m.Date)
            .AsNoTracking()
            .ToListAsync();

    public async Task<List<MaintenanceLog>> GetAllAsync()
        => await _db.MaintenanceLogs.AsNoTracking().OrderByDescending(m => m.Date).ToListAsync();

    public async Task AddAsync(MaintenanceLog log)
    {
        _db.MaintenanceLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(MaintenanceLog log)
    {
        _db.MaintenanceLogs.Update(log);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var log = await _db.MaintenanceLogs.FindAsync(id);
        if (log is not null)
        {
            _db.MaintenanceLogs.Remove(log);
            await _db.SaveChangesAsync();
        }
    }
}
