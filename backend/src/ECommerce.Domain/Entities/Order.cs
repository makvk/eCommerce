using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class Order
{
    private readonly List<OrderItem> _items;
    public IReadOnlyList<OrderItem> Items => _items;
    
    public Guid Id { get; init; }
    public Guid CustomerId { get; init; }
    public Money TotalPrice { get; private set; }
    public Address Address { get; private set; }
    public Status Status { get; private set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset LastUpdatedAt { get; private set; }

    public Order(Guid customerId, Address address)
    {
        _items = new List<OrderItem>();
            
        Id = Guid.NewGuid();
        CustomerId = customerId;
        Address = address;
        Status = Status.Created;
        CreatedAt = DateTimeOffset.UtcNow;
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
    
    private Order() {} // ctor for ef core

    public void AddItem(Guid productId, string title, int quantity, Money unitPrice)
    {
        if (quantity <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero");
        }

        if (Status != Status.Created)
        {
            throw new InvalidOperationException("Cannot add items when order is already created");
        }
        var exsistingItem = _items.FirstOrDefault(i => i.ProductId == productId);
        if (exsistingItem != null)
        {
            exsistingItem.IncreaseQuantity(quantity);
        }
        else
        {
            _items.Add(new OrderItem(Id, productId, title, quantity, unitPrice));
        }
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
    
    public void SetTotalPrice(Money totalPrice)
    {
        TotalPrice = totalPrice;
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
    
    public void UpdateStatus(Status status)
    {
        Status = status;
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
}