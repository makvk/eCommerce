using System.Security.Claims;
using ECommerce.Application.Common;

namespace ECommerce.Infrastructure.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    public string GenerateToken(Guid userId, string role, string email)
    {
        var claims = new List<Claim>()
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.Email, email),
        };
        var token = 
        
        return 
    }
}