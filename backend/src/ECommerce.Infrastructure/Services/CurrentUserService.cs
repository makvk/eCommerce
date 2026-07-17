using System.Security.Claims;
using ECommerce.Application.Common;
using ECommerce.Domain.Records;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Infrastructure.Services;

public class CurrentUserService(
    IHttpContextAccessor httpContextAccessor,
    IEDbContext eDbContext) : ICurrentUserService
{
    private readonly IEDbContext _eDbContext = eDbContext;
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    public string? UserId => 
        _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    
    public string? Role => 
        _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;

    public string? Email =>
        _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Email)?.Value;

    public async Task<Money?> GetBalanceAsync(CancellationToken cancellationToken = default)
    {
        if (UserId == null || !Guid.TryParse(UserId, out var userIdGuid))
            return null;
        
        var balance = await _eDbContext.Customers
            .AsNoTracking()
            .Where(c => c.Id == userIdGuid)
            .Select(c => new Money(c.Balance.Currency, c.Balance.Amount))
            .FirstOrDefaultAsync(cancellationToken);

        return balance;
    }


    public bool IsAuthenticated => 
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}