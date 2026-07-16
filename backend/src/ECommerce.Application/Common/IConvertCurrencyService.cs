using System.Runtime.InteropServices.ComTypes;
using ECommerce.Domain.Records;

namespace ECommerce.Application.Common;

public interface IConvertCurrencyService
{
    Task<Money> ConvertCurrencyAsync(Money oldBalance, 
        string newCurrency,
        CancellationToken cancellationToken);
}