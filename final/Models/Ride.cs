namespace NovaDrive.Models;

public enum RideStatus { Requested, EnRoute, Completed, Cancelled }

public class Ride
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PassengerId { get; set; }
    public Guid? VehicleId { get; set; }
    public RideStatus Status { get; set; } = RideStatus.Requested;

    public string PickupAddress { get; set; } = null!;
    public string DropoffAddress { get; set; } = null!;

    public double PickupLat { get; set; }
    public double PickupLng { get; set; }
    public double DropoffLat { get; set; }
    public double DropoffLng { get; set; }

    public decimal DistanceKm { get; set; }
    public decimal DurationMinutes { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // price details (snapshot at completion)
    public decimal? FareExcludingVat { get; set; }
    public decimal? VatAmount { get; set; }
    public decimal? TotalFare { get; set; }
    public string? Currency { get; set; }

    // Navigation
    public User Passenger { get; set; } = null!;
    public Vehicle? Vehicle { get; set; }
    public Payment? Payment { get; set; }
}