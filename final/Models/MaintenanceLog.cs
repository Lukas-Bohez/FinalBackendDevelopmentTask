namespace NovaDrive.Models;

public class MaintenanceLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = null!;
    public string Technician { get; set; } = null!;
    public decimal Cost { get; set; }
    public int? NextServiceMileage { get; set; }
}
