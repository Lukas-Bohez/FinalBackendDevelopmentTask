using Microsoft.EntityFrameworkCore;
using NovaDrive.Models;

namespace NovaDrive.Data;

public class NovaDriveContext : DbContext
{
    public NovaDriveContext(DbContextOptions<NovaDriveContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<MaintenanceLog> MaintenanceLogs => Set<MaintenanceLog>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<DiscountCode> DiscountCodes => Set<DiscountCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.LoyaltyPoints).HasDefaultValue(0);
        });

        // ── Vehicle ───────────────────────────────────────────
        modelBuilder.Entity<Vehicle>(e =>
        {
            e.HasIndex(v => v.VIN).IsUnique();
            e.HasIndex(v => v.LicensePlate).IsUnique();
        });

        // ── Ride ──────────────────────────────────────────────
        modelBuilder.Entity<Ride>(e =>
        {
            e.HasOne(r => r.Passenger)
                .WithMany(u => u.Rides)
                .HasForeignKey(r => r.PassengerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Vehicle)
                .WithMany(v => v.Rides)
                .HasForeignKey(r => r.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            e.Property(r => r.DistanceKm).HasPrecision(10, 2);
            e.Property(r => r.DurationMinutes).HasPrecision(10, 2);
            e.Property(r => r.FareExcludingVat).HasPrecision(10, 2);
            e.Property(r => r.VatAmount).HasPrecision(10, 2);
            e.Property(r => r.TotalFare).HasPrecision(10, 2);
        });

        // ── Payment ──────────────────────────────────────────
        modelBuilder.Entity<Payment>(e =>
        {
            e.HasOne(p => p.Ride)
                .WithOne(r => r.Payment)
                .HasForeignKey<Payment>(p => p.RideId)
                .OnDelete(DeleteBehavior.Cascade);

            e.Property(p => p.Amount).HasPrecision(10, 2);
        });

        // ── MaintenanceLog ───────────────────────────────────
        modelBuilder.Entity<MaintenanceLog>(e =>
        {
            e.HasOne(m => m.Vehicle)
                .WithMany(v => v.MaintenanceLogs)
                .HasForeignKey(m => m.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            e.Property(m => m.Cost).HasPrecision(10, 2);
        });

        // ── SupportTicket ────────────────────────────────────
        modelBuilder.Entity<SupportTicket>(e =>
        {
            e.HasOne(t => t.User)
                .WithMany(u => u.SupportTickets)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── DiscountCode ─────────────────────────────────────
        modelBuilder.Entity<DiscountCode>(e =>
        {
            e.HasIndex(d => d.Code).IsUnique();
            e.Property(d => d.Value).HasPrecision(10, 2);
            e.Property(d => d.MinAmount).HasPrecision(10, 2);
        });

        // seed a default admin user (password: Admin123!)
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            FullName = "System Admin",
            Email = "admin@novadrive.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = UserRole.Admin,
            LoyaltyPoints = 0
        });
    }
}