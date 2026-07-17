using ECommerce.Domain.Records;

namespace ECommerce.Application.Common;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Role { get; }
    string? Email { get; }
    Task<Money?> GetBalanceAsync(CancellationToken cancellationToken = default);
    bool IsAuthenticated { get; }
}