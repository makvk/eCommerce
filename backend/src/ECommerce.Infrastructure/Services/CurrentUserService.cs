using System.Security.Claims;
using ECommerce.Application.Common;
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

    public async Task<string?> GetCurrencyAsync(CancellationToken cancellationToken = default)
    {
        if (UserId == null || !Guid.TryParse(UserId, out var userIdGuid))
            return null;
        
        var customer = await _eDbContext.Customers
            .AsNoTracking()
            .Where(c => c.Id == userIdGuid)
            .Select(c => new { c.Balance.Currency })
            .FirstOrDefaultAsync(cancellationToken);

        return customer?.Currency;
    }


    public bool IsAuthenticated => 
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}