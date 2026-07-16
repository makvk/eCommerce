namespace ECommerce.Domain.Modles;

public class CurrencyOptions()
{
    public string DefaultCurrency { get; init; } = "RUB";
    public List<string> SupportedCurrencies { get; init; } = new();
}