using FluentValidation.Results;

public class ValidationException : Exception
{
    public IEnumerable<ValidationFailure> Errors { get; }

    public ValidationException(IEnumerable<ValidationFailure> errors)
        : base("Validation failed")
    {
        Errors = errors;
    }
}

