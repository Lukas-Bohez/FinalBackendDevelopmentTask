using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface IDiscountCodeRepository
{
    Task<DiscountCode?> GetByCodeAsync(string code);
    Task<List<DiscountCode>> GetAllAsync();
    Task AddAsync(DiscountCode discount);
    Task UpdateAsync(DiscountCode discount);
    Task DeleteAsync(Guid id);
}
