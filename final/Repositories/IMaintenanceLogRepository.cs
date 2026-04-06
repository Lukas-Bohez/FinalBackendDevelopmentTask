using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface IMaintenanceLogRepository
{
    Task<MaintenanceLog?> GetByIdAsync(Guid id);
    Task<List<MaintenanceLog>> GetByVehicleAsync(Guid vehicleId);
    Task<List<MaintenanceLog>> GetAllAsync();
    Task AddAsync(MaintenanceLog log);
    Task UpdateAsync(MaintenanceLog log);
    Task DeleteAsync(Guid id);
}
