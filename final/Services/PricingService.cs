using NovaDrive.DTOs;
using NovaDrive.Models;
using NovaDrive.Repositories;

namespace NovaDrive.Services;

public class PriceResult
{
    public decimal BasePrice { get; init; }
    public decimal AfterMultipliers { get; init; }
    public decimal LoyaltyDiscount { get; init; }
    public decimal PromoDiscount { get; init; }
    public decimal VatAmount { get; init; }
    public decimal TotalPrice { get; init; }
}

public interface IPricingService
{
    Task<PriceResult> CalculatePriceAsync(
        decimal distanceKm, decimal durationMinutes,
        VehicleType vehicleType, DateTime startTime,
        int loyaltyPoints = 0, string? discountCode = null);
}

public class PricingService : IPricingService
{
    private readonly decimal _vatRate;
    private readonly IDiscountCodeRepository _discountRepo;

    public PricingService(IDiscountCodeRepository discountRepo, decimal vatRate = 0.21m)
    {
        _discountRepo = discountRepo;
        _vatRate = vatRate;
    }

    public async Task<PriceResult> CalculatePriceAsync(
        decimal distanceKm, decimal durationMinutes,
        VehicleType vehicleType, DateTime startTime,
        int loyaltyPoints = 0, string? discountCode = null)
    {
        if (distanceKm < 0 || durationMinutes < 0)
            throw new ArgumentException("Distance and duration must be >= 0");

        // A. Base fare
        const decimal startingRate = 2.50m;
        const decimal perKm = 1.10m;
        const decimal perMin = 0.30m;

        decimal basePrice = startingRate + (distanceKm * perKm) + (durationMinutes * perMin);

        // B. Multipliers
        decimal vehicleMultiplier = vehicleType switch
        {
            VehicleType.Van => 1.5m,
            VehicleType.Luxury => 2.2m,
            _ => 1.0m
        };

        bool isNight = IsNightHour(startTime);
        decimal nightSurcharge = isNight ? 0.15m : 0m;

        decimal afterMultiplier = basePrice * vehicleMultiplier;
        if (isNight) afterMultiplier += basePrice * nightSurcharge;

        // C. Discounts
        // 1) Loyalty: EUR 1 per 100 points, max 20 % of fare
        int loyaltyUnits = loyaltyPoints / 100;
        decimal loyaltyDiscount = loyaltyUnits * 1.00m;
        decimal maxLoyalty = afterMultiplier * 0.20m;
        if (loyaltyDiscount > maxLoyalty) loyaltyDiscount = decimal.Round(maxLoyalty, 2);

        decimal afterLoyalty = afterMultiplier - loyaltyDiscount;

        // 2) Discount code (from DB)
        decimal promoDiscount = 0m;
        if (!string.IsNullOrWhiteSpace(discountCode))
        {
            var code = await _discountRepo.GetByCodeAsync(discountCode);
            if (code is not null && code.IsActive
                && (!code.ExpiresAt.HasValue || code.ExpiresAt > DateTime.UtcNow)
                && afterLoyalty >= (code.MinAmount ?? 0))
            {
                promoDiscount = code.Type == DiscountType.Flat
                    ? code.Value
                    : afterLoyalty * (code.Value / 100m);
            }
        }

        decimal afterPromo = Math.Max(afterLoyalty - promoDiscount, 0);

        // D. VAT
        decimal vatAmount = decimal.Round(afterPromo * _vatRate, 2, MidpointRounding.AwayFromZero);
        decimal totalWithVat = afterPromo + vatAmount;

        // E. Minimum fare
        if (totalWithVat < 5.00m) totalWithVat = 5.00m;

        totalWithVat = decimal.Round(totalWithVat, 2, MidpointRounding.AwayFromZero);

        return new PriceResult
        {
            BasePrice = decimal.Round(basePrice, 2),
            AfterMultipliers = decimal.Round(afterMultiplier, 2),
            LoyaltyDiscount = decimal.Round(loyaltyDiscount, 2),
            PromoDiscount = decimal.Round(promoDiscount, 2),
            VatAmount = vatAmount,
            TotalPrice = totalWithVat
        };
    }

    private static bool IsNightHour(DateTime time)
    {
        var t = time.TimeOfDay;
        return t >= TimeSpan.FromHours(22) || t < TimeSpan.FromHours(6);
    }
}