using System.Globalization;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;

namespace ECommerce.Infrastructure.Services;

public class GetCurrencyRateApi(
    HttpClient httpClient,
    IConfiguration config)
{
    private const string BaseUrl = "https://www.cbr.ru/scripts/XML_daily.asp";
    public async Task<Dictionary<string, decimal>?> GetCurrencyRatesAsync(
        
        CancellationToken cancellationToken)
    {
        var currencies = config.GetSection("CurrencySettings:SupportedCurrencies").Get<List<string>>()
            ?? throw new Exception("Currencies not configured");
        var currencySet = new HashSet<string>(currencies.Select(c => c.ToUpper()));
        
        var rates = new Dictionary<string, decimal>();
        
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        
        var response = await httpClient.GetByteArrayAsync(BaseUrl, cancellationToken);
        var xmlString = System.Text.Encoding.GetEncoding("windows-1251").GetString(response);
        
        var xml = XDocument.Parse(xmlString);
        foreach (var valute in xml.Descendants("Valute"))
        {
            var currentCharCode = valute.Element("CharCode")?.Value.ToUpper();
            if (currentCharCode != null && currencySet.Contains(currentCharCode))
            {
                var rawRate = valute.Element("VunitRate")?.Value;
                if (rawRate != null)
                {
                    rawRate = rawRate.Replace(",", ".");
                    rates[currentCharCode] = Convert.ToDecimal(rawRate, CultureInfo.InvariantCulture);
                }
            }
        }

        rates["RUB"] = 1.0m;
        
        return rates;
    }
}