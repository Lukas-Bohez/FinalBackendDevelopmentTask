using System;

namespace NovaDrive.Models
{
    public enum VehicleType { Standard, Van, Luxury }

    public class Vehicle
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string VIN { get; set; } = null!;
        public string LicensePlate { get; set; } = null!;
        public string Model { get; set; } = null!;
        public VehicleType Type { get; set; } = VehicleType.Standard;
        public int Year { get; set; }
        public bool IsActive { get; set; } = true;

        // current location (optional, used for simple nearest-vehicle logic)
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}