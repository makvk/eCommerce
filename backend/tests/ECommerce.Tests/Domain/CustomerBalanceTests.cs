using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;

namespace ECommerce.Tests.Domain;

public class CustomerBalanceTests
{
    [Fact]
    public void UpToBalance_IncreasesAmount()
    {
        var customer = new Customer("a@b.c", "hash", new FullName("A", "B", ""));
        customer.UpToBalance(150);

        Assert.Equal(150, customer.Balance.Amount);
    }

    [Fact]
    public void UpToBalance_Throws_WhenNegative()
    {
        var customer = new Customer("a@b.c", "hash", new FullName("A", "B", ""));
        Assert.Throws<ArgumentException>(() => customer.UpToBalance(-1));
    }
}
