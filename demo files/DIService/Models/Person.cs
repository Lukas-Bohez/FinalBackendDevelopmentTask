namespace DIService.Models;

public record Person(string Role, Guid Id)
{
    // Override ToString for nicer output
    public override string ToString() => $"{Role} [{Id.ToString()[^4..]}]";
}
