namespace ECommerce.Domain.Records;

public record FullName(string FirstName, string LastName, string MiddleName);

public record Money(string Currency, decimal Amount)
{
    public static Money Zero(string currency = "RUB") => new(currency, 0);

    public override string ToString() 
        =>  $"{Amount} {Currency}";
}

public record Address(string Country, string Street, string City, string PostalCode);