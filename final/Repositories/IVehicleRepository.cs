using System;
using System.Threading.Tasks;
using NovaDrive.Models;

namespace NovaDrive.Repositories
{
    public interface IVehicleRepository
    {
        Task<Vehicle?> GetNearestActiveAsync(double lat, double lng);
        Task AddAsync(Vehicle v);
    }
}