using Microsoft.EntityFrameworkCore;
using NovaDrive.Data;
using NovaDrive.Models;

namespace NovaDrive.Repositories;

public class UserRepository : IUserRepository
{
    private readonly NovaDriveContext _db;
    public UserRepository(NovaDriveContext db) => _db = db;

    public async Task AddAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }

    public async Task<User?> GetByEmailAsync(string email)
        => await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

    public async Task<User?> GetByIdAsync(Guid id)
        => await _db.Users.FindAsync(id);

    public async Task<List<User>> GetAllAsync()
        => await _db.Users.AsNoTracking().ToListAsync();

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is not null)
        {
            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
        }
    }
}