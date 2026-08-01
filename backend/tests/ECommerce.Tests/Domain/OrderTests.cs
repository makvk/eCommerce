using ECommerce.Domain.Entities;
using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;

namespace ECommerce.Tests.Domain;

public class OrderTests
{
    [Fact]
    public void AddItem_IncreasesQuantity_ForSameProduct()
    {
        var order = new Order(Guid.NewGuid(), new Address("RU", "Lenina 1", "Moscow", "101000"));
        var price = new Money("RUB", 100);

        order.AddItem(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Phone", 1, price);
        order.AddItem(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Phone", 2, price);

        Assert.Single(order.Items);
        Assert.Equal(3, order.Items[0].Quantity);
    }

    [Fact]
    public void AddItem_Throws_WhenQuantityIsNotPositive()
    {
        var order = new Order(Guid.NewGuid(), new Address("RU", "Lenina 1", "Moscow", "101000"));

        Assert.Throws<ArgumentException>(() =>
            order.AddItem(Guid.NewGuid(), "Phone", 0, new Money("RUB", 10)));
    }

    [Fact]
    public void UpdateStatus_ChangesStatus()
    {
        var order = new Order(Guid.NewGuid(), new Address("RU", "Lenina 1", "Moscow", "101000"));
        order.UpdateStatus(Status.Cancelled);
        Assert.Equal(Status.Cancelled, order.Status);
    }
}
