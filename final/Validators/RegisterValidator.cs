using FluentValidation;
using NovaDrive.DTOs;

namespace NovaDrive.Validators;

public class RegisterValidator : AbstractValidator<RegisterDto>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .Matches(@"[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches(@"\d").WithMessage("Password must contain a digit.");
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
    }
}

public class LoginValidator : AbstractValidator<LoginDto>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class PriceRequestValidator : AbstractValidator<PriceRequestDto>
{
    public PriceRequestValidator()
    {
        RuleFor(x => x.DistanceKm).GreaterThan(0);
        RuleFor(x => x.DurationMinutes).GreaterThan(0);
        RuleFor(x => x.VehicleType).IsInEnum();
    }
}

public class CreateVehicleValidator : AbstractValidator<CreateVehicleDto>
{
    public CreateVehicleValidator()
    {
        RuleFor(x => x.VIN).NotEmpty().Length(17);
        RuleFor(x => x.LicensePlate).NotEmpty().MaximumLength(15);
        RuleFor(x => x.Model).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Year).InclusiveBetween(2000, DateTime.UtcNow.Year + 1);
    }
}

public class CreateMaintenanceLogValidator : AbstractValidator<CreateMaintenanceLogDto>
{
    public CreateMaintenanceLogValidator()
    {
        RuleFor(x => x.VehicleId).NotEmpty();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Technician).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0);
    }
}

public class CreateSupportTicketValidator : AbstractValidator<CreateSupportTicketDto>
{
    public CreateSupportTicketValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public class CreateDiscountCodeValidator : AbstractValidator<CreateDiscountCodeDto>
{
    public CreateDiscountCodeValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Value).GreaterThan(0);
        RuleFor(x => x.MinAmount).GreaterThanOrEqualTo(0).When(x => x.MinAmount.HasValue);
    }
}

public class RideRequestValidator : AbstractValidator<RideRequestDto>
{
    public RideRequestValidator()
    {
        RuleFor(x => x.PassengerId).NotEmpty();
        RuleFor(x => x.PickupAddress).NotEmpty();
        RuleFor(x => x.DropoffAddress).NotEmpty();
    }
}