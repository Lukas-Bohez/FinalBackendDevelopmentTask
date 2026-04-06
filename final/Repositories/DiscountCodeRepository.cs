using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class DiscountCodeRepository : IDiscountCodeRepository
{
    private readonly NovaDriveContext _db;
    public DiscountCodeRepository(NovaDriveContext db) => _db = db;

    public async Task<DiscountCode?> GetByCodeAsync(string code)
        => await _db.DiscountCodes.FirstOrDefaultAsync(d => d.Code == code);

    public async Task<List<DiscountCode>> GetAllAsync()
        => await _db.DiscountCodes.AsNoTracking().ToListAsync();

    public async Task AddAsync(DiscountCode discount)
    {
        _db.DiscountCodes.Add(discount);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(DiscountCode discount)
    {
        _db.DiscountCodes.Update(discount);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var d = await _db.DiscountCodes.FindAsync(id);
        if (d is not null)
        {
            _db.DiscountCodes.Remove(d);
            await _db.SaveChangesAsync();
        }
    }
}
