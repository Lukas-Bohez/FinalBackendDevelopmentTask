using FluentValidation;
using NovaDrive.DTOs;

namespace NovaDrive.Validators
{
    public class RegisterValidator : AbstractValidator<RegisterDto>
    {
        public RegisterValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
            RuleFor(x => x.FullName).NotEmpty().When(x => !string.IsNullOrEmpty(x.FullName));
        }
    }
}