using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface IVehicleRepository
{
    Task<Vehicle?> GetByIdAsync(Guid id);
    Task<List<Vehicle>> GetAllAsync();
    Task<Vehicle?> GetNearestActiveAsync(double lat, double lng);
    Task AddAsync(Vehicle v);
    Task UpdateAsync(Vehicle v);
    Task DeleteAsync(Guid id);
}