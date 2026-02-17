using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NovaDrive.Models;

namespace NovaDrive.Services
{
    public interface IAuthService
    {
        string HashPassword(string password);
        bool VerifyPassword(string hash, string password);
        string GenerateJwtToken(User user);
    }

    public class AuthService : IAuthService
    {
        private readonly string _jwtKey;
        private readonly string _issuer;
        private readonly string _audience;

        public AuthService(IConfiguration cfg)
        {
            _jwtKey = cfg["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key");
            _issuer = cfg["Jwt:Issuer"] ?? "novadrive";
            _audience = cfg["Jwt:Audience"] ?? "novadrive_clients";
        }

        public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password);
        public bool VerifyPassword(string hash, string password) => BCrypt.Net.BCrypt.Verify(password, hash);

        public string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}