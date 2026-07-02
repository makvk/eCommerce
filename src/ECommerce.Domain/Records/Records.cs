namespace ECommerce.Domain.Records;

public record FullName(string FirstName, string LastName, string MiddleName);

public record Money(string Currency, decimal Amount)
{
    public static Money Zero(string currency = "RUB") => new(currency, 0);
}