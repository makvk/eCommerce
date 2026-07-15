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
    private const string RedisKey = "currency_rates";
    
    protected override async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                logger.LogInformation("Updating currencies");
                using (var scope = serviceProvider.CreateScope())
                {
                    var rateApi = scope.ServiceProvider.GetRequiredService<GetCurrencyRateApi>();
                    var rates = await rateApi.GetCurrencyRatesAsync(cancellationToken);
                    if (rates != null && rates.Count > 0)
                    {
                        var jsonData = JsonSerializer.Serialize(rates);
                        await cache.SetStringAsync(RedisKey, jsonData, cancellationToken);
                        foreach (var rate in rates)
                        {
                            logger.LogInformation("Val: {Currency} | Rate: {Rate}", rate.Key, rate.Value);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, ex.Message);
            }
            
            await Task.Delay(UpdateInterval, cancellationToken);
        }
    }
}