using System;
using System.Threading.Tasks;
using NovaDrive.Models;

namespace NovaDrive.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByIdAsync(Guid id);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
    }
}