using System;
using NovaDrive.Models;
using NovaDrive.Services;
using Xunit;

namespace NovaDrive.Tests
{
    public class PricingServiceTests
    {
        private readonly PricingService _pricing = new PricingService(0.21m);

        [Fact]
        public void BasicCalculation_StandardDay_ReturnsExpected()
        {
            var res = _pricing.CalculatePrice(10m, 15m, VehicleType.Standard, new DateTime(2025, 1, 1, 14, 0, 0));
            // base = 2.50 + 10*1.10 + 15*0.30 = 2.5 + 11 + 4.5 = 18.0
            // multiplier 1.0 => 18.0
            // VAT 21% => total 21.78, but minimum fare rule not triggered
            Assert.Equal(18.00m, res.BasePrice);
            Assert.Equal(18.00m, res.AfterMultipliers);
            Assert.Equal(0.00m, res.LoyaltyDiscount);
            Assert.Equal(0.00m, res.PromoDiscount);
            Assert.Equal(3.78m, res.VatAmount);
            Assert.Equal(21.78m, res.TotalPrice);
        }

        [Fact]
        public void LuxuryNightAndLoyalty_ApplyMultipliersAndCaps()
        {
            var res = _pricing.CalculatePrice(5m, 10m, VehicleType.Luxury, new DateTime(2025, 1, 1, 23, 0, 0), loyaltyPoints: 250);
            // base = 2.5 + 5*1.1 + 10*0.3 = 2.5+5.5+3 = 11.0
            // vehicle multiplier 2.2 => 24.2
            // night surcharge 15% of base (11.0*0.15=1.65) => 25.85
            // loyalty units = 2 -> €2 discount, but max 20% of current fare (20% of 25.85 = 5.17) -> ok
            // after loyalty = 23.85
            // VAT = 23.85*0.21 = 5.0085 -> 5.01
            // total = 28.86
            Assert.Equal(11.00m, res.BasePrice);
            Assert.Equal(25.85m, res.AfterMultipliers);
            Assert.Equal(2.00m, res.LoyaltyDiscount);
            Assert.Equal(0.00m, res.PromoDiscount);
            Assert.Equal(5.01m, res.VatAmount);
            Assert.Equal(28.86m, res.TotalPrice);
        }

        [Fact]
        public void DiscountCode_PercentageAndMinAmount_Applied()
        {
            var res = _pricing.CalculatePrice(20m, 10m, VehicleType.Standard, DateTime.UtcNow, loyaltyPoints: 0, discountCode: "SUMMER24");
            // ensure SUMMER24 (15% off) has min amount 10 and is valid in PricingService demo data
            Assert.True(res.PromoDiscount > 0);
        }

        [Fact]
        public void MinimumFare_Enforced()
        {
            var res = _pricing.CalculatePrice(0.1m, 0.5m, VehicleType.Standard, DateTime.UtcNow);
            Assert.Equal(5.00m, res.TotalPrice);
        }
    }
}
