namespace NovaDrive.DTOs;

public record RegisterDto(string Email, string Password, string? FullName, string? HomeAddress);
public record LoginDto(string Email, string Password);
public record AuthResultDto(string Token, string Role, Guid UserId);