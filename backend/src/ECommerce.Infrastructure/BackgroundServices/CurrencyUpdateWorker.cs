using System.Runtime.CompilerServices;
using System.Text.Json;
using ECommerce.Infrastructure.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ECommerce.Infrastructure.BackgroundServices;

public class CurrencyUpdateWorker(
    IServiceProvider serviceProvider,
    IDistributedCache cache,
    ILogger<CurrencyUpdateWorker> logger) : BackgroundService
{
    private static readonly TimeSpan UpdateInterval = TimeSpan.FromHours(12);

    protected override async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        // Initial seed is done in StartupSeeder; worker refreshes on a schedule.
        await Task.Delay(UpdateInterval, cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                logger.LogInformation("Updating currencies");
                using var scope = serviceProvider.CreateScope();
                var rateApi = scope.ServiceProvider.GetRequiredService<GetCurrencyRateApi>();
                var rates = await rateApi.GetCurrencyRatesAsync(cancellationToken);
                if (rates is { Count: > 0 })
                {
                    var jsonData = JsonSerializer.Serialize(rates);
                    await cache.SetStringAsync(Services.StartupSeeder.CurrencyRatesCacheKey, jsonData, cancellationToken);
                    foreach (var rate in rates)
                    {
                        logger.LogInformation("Val: {Currency} | Rate: {Rate}", rate.Key, rate.Value);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to update currency rates");
            }

            await Task.Delay(UpdateInterval, cancellationToken);
        }
    }
}