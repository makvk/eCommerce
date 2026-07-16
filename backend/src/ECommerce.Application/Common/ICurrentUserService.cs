namespace ECommerce.Application.Common;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Role { get; }
    string? Email { get; }
    Task<string?> GetCurrencyAsync(CancellationToken cancellationToken = default);
    bool IsAuthenticated { get; }
}