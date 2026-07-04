using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ECommerce.Application.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace ECommerce.Infrastructure.Security;

public class JwtTokenGenerator(IConfiguration configuration) : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration = configuration;
    public string GenerateToken(Guid userId, string role, string email)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secret = jwtSettings.GetSection("Secret").Value
                     ?? throw new InvalidOperationException("Secret key missing");
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim>()
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.Email, email),
        };
        var token = new JwtSecurityToken(
            issuer : _configuration["JwtSettings:Issuer"],
            audience : _configuration["JwtSettings:Audience"],
            claims : claims,
            expires : DateTime.UtcNow.AddMinutes(60),
            signingCredentials : creds
        );
        
        return new  JwtSecurityTokenHandler().WriteToken(token);
    }
}