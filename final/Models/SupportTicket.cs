namespace NovaDrive.Models;

public enum TicketPriority { Low, Medium, High, Critical }
public enum TicketStatus { Open, InProgress, Resolved, Closed }

public class SupportTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Subject { get; set; } = null!;
    public string Description { get; set; } = null!;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public string? Resolution { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
