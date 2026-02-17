

using FluentValidation;

public class PersonValidator : AbstractValidator<Person>{
    public PersonValidator(){
        RuleFor(x => x.Age).GreaterThan(18).WithMessage("Age must be greater than 18");
        RuleFor(x => x.Phone).MinimumLength(10).WithMessage("Phone number must be at least 10 characters");
    }
}

