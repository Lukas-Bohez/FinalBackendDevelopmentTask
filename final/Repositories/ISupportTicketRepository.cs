using NovaDrive.Models;

namespace NovaDrive.Repositories;

public interface ISupportTicketRepository
{
    Task<SupportTicket?> GetByIdAsync(Guid id);
    Task<List<SupportTicket>> GetByUserAsync(Guid userId);
    Task<List<SupportTicket>> GetAllAsync();
    Task AddAsync(SupportTicket ticket);
    Task UpdateAsync(SupportTicket ticket);
}
