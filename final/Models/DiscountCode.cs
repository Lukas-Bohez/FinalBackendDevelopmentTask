namespace NovaDrive.Models;

public enum DiscountType { Percentage, Flat }

public class DiscountCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = null!;
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public decimal? MinAmount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
}
