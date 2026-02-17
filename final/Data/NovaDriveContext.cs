using Microsoft.EntityFrameworkCore;
using NovaDrive.Models;

namespace NovaDrive.Data
{
    public class NovaDriveContext : DbContext
    {
        public NovaDriveContext(DbContextOptions<NovaDriveContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Vehicle> Vehicles { get; set; } = null!;
        public DbSet<Ride> Rides { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        // maintenance logs, tickets can be added later
    }
}