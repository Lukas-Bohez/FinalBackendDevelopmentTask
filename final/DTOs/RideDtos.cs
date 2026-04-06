using NovaDrive.Models;

namespace NovaDrive.DTOs;

public record RideRequestDto(
    Guid PassengerId,
    double PickupLat, double PickupLng,
    double DropoffLat, double DropoffLng,
    string PickupAddress, string DropoffAddress);

public record PriceRequestDto(
    decimal DistanceKm,
    decimal DurationMinutes,
    VehicleType VehicleType,
    DateTime StartTime,
    int LoyaltyPoints = 0,
    string? DiscountCode = null);

public record PriceBreakdownDto(
    decimal BasePrice,
    decimal MultipliedPrice,
    decimal LoyaltyDiscount,
    decimal PromoDiscount,
    decimal VatAmount,
    decimal TotalPrice);