using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; init; }
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public Money PriceAtPurchase { get; private set; }

    public OrderItem(Guid orderId, Guid productId, int quantity, Money priceAtPurchase)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        ProductId = productId;
        Quantity = quantity;
        PriceAtPurchase = priceAtPurchase;
    }
    
    private  OrderItem() {} // ctor for ef core
    
    public void IncreaseQuantity(int quantity) => Quantity += quantity;
}