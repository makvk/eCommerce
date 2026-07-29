namespace ECommerce.Domain.Modles;

public class CurrencyOptions
{
    /// <summary>Базовая валюта из appsettings CurrencySettings:BaseCurrency.</summary>
    public string BaseCurrency { get; init; } = "RUB";

    /// <summary>Алиас для старого кода, который читал DefaultCurrency.</summary>
    public string DefaultCurrency => BaseCurrency;

    public List<string> SupportedCurrencies { get; init; } = new();
}
