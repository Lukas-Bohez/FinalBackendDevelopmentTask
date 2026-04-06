using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly NovaDriveContext _db;
    public PaymentRepository(NovaDriveContext db) => _db = db;

    public async Task<Payment?> GetByRideIdAsync(Guid rideId)
        => await _db.Payments.FirstOrDefaultAsync(p => p.RideId == rideId);

    public async Task AddAsync(Payment payment)
    {
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Payment payment)
    {
        _db.Payments.Update(payment);
        await _db.SaveChangesAsync();
    }
}
