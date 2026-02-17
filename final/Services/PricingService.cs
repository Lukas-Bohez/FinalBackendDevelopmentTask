using System;
using System.Collections.Generic;
using System.Linq;
using NovaDrive.DTOs;
using NovaDrive.Models;

namespace NovaDrive.Services
{
    public enum DiscountType { Percentage, Flat }

    public record DiscountCode(string Code, DiscountType Type, decimal Value, decimal MinAmount, DateTime ExpiresAt);

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
        PriceResult CalculatePrice(decimal distanceKm, decimal durationMinutes, VehicleType vehicleType, DateTime startTime, int loyaltyPoints = 0, string? discountCode = null);
    }

    public class PricingService : IPricingService
    {
        private readonly decimal _vatRate;
        private readonly IList<DiscountCode> _promoCodes;

        public PricingService(decimal vatRate = 0.21m)
        {
            _vatRate = vatRate;

            // demo promo codes (would normally come from DB)
            _promoCodes = new List<DiscountCode>
            {
                new DiscountCode("WELCOME5", DiscountType.Flat, 5m, 0m, DateTime.UtcNow.AddYears(1)),
                new DiscountCode("SUMMER24", DiscountType.Percentage, 15m, 10m, DateTime.UtcNow.AddMonths(6))
            };
        }

        public PriceResult CalculatePrice(decimal distanceKm, decimal durationMinutes, VehicleType vehicleType, DateTime startTime, int loyaltyPoints = 0, string? discountCode = null)
        {
            if (distanceKm < 0 || durationMinutes < 0) throw new ArgumentException("Distance and duration must be >= 0");

            // A. Basic
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

            // night surcharge 15% between 22:00 and 06:00 (apply before discounts)
            bool isNight = IsNightHour(startTime);
            decimal nightSurcharge = isNight ? 0.15m : 0m;

            decimal afterMultiplier = basePrice * vehicleMultiplier;
            if (isNight) afterMultiplier += basePrice * nightSurcharge; // surcharge applies on base price

            // C. Discounts - order matters
            // 1) Loyalty: €1 per 100 points, but cannot exceed 20% of current fare at that time
            int loyaltyUnits = loyaltyPoints / 100;
            decimal loyaltyDiscount = loyaltyUnits * 1.00m;
            decimal maxLoyalty = afterMultiplier * 0.20m;
            if (loyaltyDiscount > maxLoyalty) loyaltyDiscount = decimal.Round(maxLoyalty, 2);

            decimal afterLoyalty = afterMultiplier - loyaltyDiscount;

            // 2) Discount code
            decimal promoDiscount = 0m;
            if (!string.IsNullOrWhiteSpace(discountCode))
            {
                var code = _promoCodes.FirstOrDefault(c => c.Code.Equals(discountCode, StringComparison.OrdinalIgnoreCase));
                if (code != null && code.ExpiresAt > DateTime.UtcNow && afterLoyalty >= code.MinAmount)
                {
                    if (code.Type == DiscountType.Flat) promoDiscount = code.Value;
                    else promoDiscount = afterLoyalty * (code.Value / 100m);
                }
            }

            decimal afterPromo = afterLoyalty - promoDiscount;

            if (afterPromo < 0) afterPromo = 0;

            // VAT applied to the amount customer pays
            decimal vatAmount = decimal.Round(afterPromo * _vatRate, 2, MidpointRounding.AwayFromZero);
            decimal totalWithVat = afterPromo + vatAmount;

            // Hard business rules
            if (totalWithVat < 5.00m) totalWithVat = 5.00m; // minimum fare

            // Rounding
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
            return (t >= TimeSpan.FromHours(22)) || (t < TimeSpan.FromHours(6));
        }
    }
}