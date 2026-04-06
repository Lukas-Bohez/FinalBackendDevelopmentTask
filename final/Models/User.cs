namespace NovaDrive.Models;

public enum UserRole { Passenger, Admin, Vehicle }

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Passenger-specific
    public string? FullName { get; set; }
    public string? HomeAddress { get; set; }
    public int LoyaltyPoints { get; set; }
    public string? PreferredPaymentMethod { get; set; }

    // Navigation
    public ICollection<Ride> Rides { get; set; } = new List<Ride>();
    public ICollection<SupportTicket> SupportTickets { get; set; } = new List<SupportTicket>();
}
