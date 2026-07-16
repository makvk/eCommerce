using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Domain.Records;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Infrastructure.Services;

public class ConvertCurrencyService(
    IDistributedCache cache) : IConvertCurrencyService
{
    public async Task<Money> ConvertCurrencyAsync(
        Money oldBalance, 
        string newCurrency,
        CancellationToken cancellationToken)
    {
        if (oldBalance.Currency == newCurrency)
            return oldBalance;
        var ratesString = await cache.GetStringAsync("currency_rates", cancellationToken)
                          ?? throw new Exception("No currency rates");
        var rates = JsonSerializer.Deserialize<Dictionary<string, decimal>>(ratesString)
                    ?? throw new Exception("No currency rates");
        var amountRub = oldBalance.Amount * rates[oldBalance.Currency];
        var newAmount = amountRub / rates[newCurrency];
        var newBalance = new Money(newCurrency, newAmount);
        
        return newBalance;
    }
}