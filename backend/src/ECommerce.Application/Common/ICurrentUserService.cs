namespace ECommerce.Application.Common;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Role { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
}