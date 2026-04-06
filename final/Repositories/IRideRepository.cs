using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface IRideRepository
{
    Task<Ride?> GetByIdAsync(Guid id);
    Task<List<Ride>> GetByPassengerAsync(Guid passengerId);
    Task<List<Ride>> GetAllAsync();
    Task AddAsync(Ride ride);
    Task UpdateAsync(Ride ride);
}
