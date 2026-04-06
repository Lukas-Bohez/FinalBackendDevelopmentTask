using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface IPaymentRepository
{
    Task<Payment?> GetByRideIdAsync(Guid rideId);
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);
}
