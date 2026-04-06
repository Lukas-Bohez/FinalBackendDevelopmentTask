using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class RideRepository : IRideRepository
{
    private readonly NovaDriveContext _db;
    public RideRepository(NovaDriveContext db) => _db = db;

    public async Task<Ride?> GetByIdAsync(Guid id)
        => await _db.Rides.Include(r => r.Payment).FirstOrDefaultAsync(r => r.Id == id);

    public async Task<List<Ride>> GetByPassengerAsync(Guid passengerId)
        => await _db.Rides
            .Where(r => r.PassengerId == passengerId)
            .OrderByDescending(r => r.RequestedAt)
            .AsNoTracking()
            .ToListAsync();

    public async Task<List<Ride>> GetAllAsync()
        => await _db.Rides.AsNoTracking().OrderByDescending(r => r.RequestedAt).ToListAsync();

    public async Task AddAsync(Ride ride)
    {
        _db.Rides.Add(ride);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Ride ride)
    {
        _db.Rides.Update(ride);
        await _db.SaveChangesAsync();
    }
}
