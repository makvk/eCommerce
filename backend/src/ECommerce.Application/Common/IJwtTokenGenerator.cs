namespace ECommerce.Application.Common;

public interface IJwtTokenGenerator
{
    string GenerateToken(Guid userId, string role, string email);
}