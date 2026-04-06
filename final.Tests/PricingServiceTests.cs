using NovaDrive.Models;
using NovaDrive.Repositories;
using NovaDrive.Services;
using Xunit;

namespace NovaDrive.Tests
{
    public class PricingServiceTests
    {
        private readonly PricingService _pricing;

        public PricingServiceTests()
        {
            _pricing = new PricingService(new FakeDiscountCodeRepository(), 0.21m);
        }

        [Fact]
        public async Task BasicCalculation_StandardDay_ReturnsExpected()
        {
            var res = await _pricing.CalculatePriceAsync(10m, 15m, VehicleType.Standard, new DateTime(2025, 1, 1, 14, 0, 0));
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
        public async Task LuxuryNightAndLoyalty_ApplyMultipliersAndCaps()
        {
            var res = await _pricing.CalculatePriceAsync(5m, 10m, VehicleType.Luxury, new DateTime(2025, 1, 1, 23, 0, 0), loyaltyPoints: 250);
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
        public async Task DiscountCode_PercentageAndMinAmount_Applied()
        {
            var res = await _pricing.CalculatePriceAsync(20m, 10m, VehicleType.Standard, DateTime.UtcNow, loyaltyPoints: 0, discountCode: "SUMMER24");
            // ensure SUMMER24 (15% off) has min amount 10 and is valid in PricingService demo data
            Assert.True(res.PromoDiscount > 0);
        }

        [Fact]
        public async Task MinimumFare_Enforced()
        {
            var res = await _pricing.CalculatePriceAsync(0.1m, 0.5m, VehicleType.Standard, DateTime.UtcNow);
            Assert.Equal(5.00m, res.TotalPrice);
        }

        private sealed class FakeDiscountCodeRepository : IDiscountCodeRepository
        {
            private readonly List<DiscountCode> _codes =
            [
                new DiscountCode
                {
                    Id = Guid.NewGuid(),
                    Code = "SUMMER24",
                    Type = DiscountType.Percentage,
                    Value = 15m,
                    MinAmount = 10m,
                    ExpiresAt = DateTime.UtcNow.AddDays(7),
                    IsActive = true
                }
            ];

            public Task<DiscountCode?> GetByCodeAsync(string code)
                => Task.FromResult(_codes.SingleOrDefault(c => c.Code == code));

            public Task<List<DiscountCode>> GetAllAsync()
                => Task.FromResult(_codes.ToList());

            public Task AddAsync(DiscountCode discount)
            {
                _codes.Add(discount);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(DiscountCode discount)
            {
                var idx = _codes.FindIndex(c => c.Id == discount.Id);
                if (idx >= 0)
                {
                    _codes[idx] = discount;
                }

                return Task.CompletedTask;
            }

            public Task DeleteAsync(Guid id)
            {
                _codes.RemoveAll(c => c.Id == id);
                return Task.CompletedTask;
            }
        }
    }
}
