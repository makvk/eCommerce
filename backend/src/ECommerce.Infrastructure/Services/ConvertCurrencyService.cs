using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
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
                          ?? throw new ServiceUnavailableException("Currency rates are not available");
        var rates = JsonSerializer.Deserialize<Dictionary<string, decimal>>(ratesString)
                    ?? throw new ServiceUnavailableException("Currency rates are not available");

        if (!rates.TryGetValue(oldBalance.Currency, out var oldRate))
            throw new BadRequestException($"Currency '{oldBalance.Currency}' is not supported");

        if (!rates.TryGetValue(newCurrency, out var newRate))
            throw new BadRequestException($"Currency '{newCurrency}' is not supported");

        var amountRub = oldBalance.Amount * oldRate;
        var newAmount = amountRub / newRate;
        var newBalance = new Money(newCurrency, newAmount);
        
        return newBalance;
    }
}