using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class SupportTicketRepository : ISupportTicketRepository
{
    private readonly NovaDriveContext _db;
    public SupportTicketRepository(NovaDriveContext db) => _db = db;

    public async Task<SupportTicket?> GetByIdAsync(Guid id)
        => await _db.SupportTickets.FindAsync(id);

    public async Task<List<SupportTicket>> GetByUserAsync(Guid userId)
        => await _db.SupportTickets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

    public async Task<List<SupportTicket>> GetAllAsync()
        => await _db.SupportTickets.AsNoTracking().OrderByDescending(t => t.CreatedAt).ToListAsync();

    public async Task AddAsync(SupportTicket ticket)
    {
        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(SupportTicket ticket)
    {
        _db.SupportTickets.Update(ticket);
        await _db.SaveChangesAsync();
    }
}
