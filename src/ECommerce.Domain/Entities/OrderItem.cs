using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class OrderItem()
{
    
    public Guid Id { get; init; } =  Guid.NewGuid();
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public Money PriceAtPurchase { get; private set; } = Money.Zero();
}