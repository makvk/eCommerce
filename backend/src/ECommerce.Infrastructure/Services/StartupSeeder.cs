using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Domain.Constants;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;
using ECommerce.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECommerce.Infrastructure.Services;

public static class StartupSeeder
{
    public const string CurrencyRatesCacheKey = "currency_rates";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("StartupSeeder");

        await SeedCurrencyRatesAsync(sp, logger, cancellationToken);

        try
        {
            var db = sp.GetRequiredService<IEDbContext>();
            if (db is DbContext ef)
            {
                await ef.Database.MigrateAsync(cancellationToken);
                logger.LogInformation("Database migrations applied");
            }

            await SeedAdminAsync(sp, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database migrate/admin seed skipped (database may be unavailable)");
        }
    }

    public static async Task SeedCurrencyRatesAsync(
        IServiceProvider sp,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var cache = sp.GetRequiredService<IDistributedCache>();
            var existing = await cache.GetStringAsync(CurrencyRatesCacheKey, cancellationToken);
            if (!string.IsNullOrEmpty(existing))
            {
                logger.LogInformation("Currency rates already present in cache");
                return;
            }

            try
            {
                var rateApi = sp.GetRequiredService<GetCurrencyRateApi>();
                var rates = await rateApi.GetCurrencyRatesAsync(cancellationToken);
                if (rates is { Count: > 0 })
                {
                    await cache.SetStringAsync(
                        CurrencyRatesCacheKey,
                        JsonSerializer.Serialize(rates),
                        cancellationToken);
                    logger.LogInformation("Seeded {Count} currency rates from CBR", rates.Count);
                    return;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to fetch currency rates from CBR; using fallback rates");
            }

            var fallback = new Dictionary<string, decimal>
            {
                ["RUB"] = 1.0m,
                ["USD"] = 90.0m,
                ["EUR"] = 100.0m,
                ["KZT"] = 0.18m
            };

            await cache.SetStringAsync(
                CurrencyRatesCacheKey,
                JsonSerializer.Serialize(fallback),
                cancellationToken);
            logger.LogInformation("Seeded fallback currency rates");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Currency rates seed skipped (cache unavailable)");
        }
    }

    public static async Task SeedAdminAsync(
        IServiceProvider sp,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var db = sp.GetRequiredService<IEDbContext>();
        var hasher = sp.GetRequiredService<IPasswordHasher>();
        var options = sp.GetRequiredService<IOptions<AdminSeedOptions>>().Value;

        var email = options.Email.Trim().ToLowerInvariant();
        var exists = await db.Customers.AnyAsync(c => c.Email == email, cancellationToken);
        if (exists)
        {
            logger.LogInformation("Admin user {Email} already exists", email);
            return;
        }

        var admin = new Customer(
            email,
            hasher.HashPassword(options.Password),
            new FullName(options.FirstName, options.LastName, string.Empty),
            AppRoles.Admin);

        await db.AddCustomerAsync(admin, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded admin user {Email}", email);
    }
}
