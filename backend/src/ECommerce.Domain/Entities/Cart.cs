using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class Cart
{
    public List<CartItem> Items { get; private set; } = new();
    
    private Cart() { }
    
    public Cart(List<CartItem> cartItems)
    {
        Items = cartItems;
    }

    public List<Money> TotalPrices => Items
        .GroupBy(item => item.Price.Currency)
        .Select(group => new Money(
            group.Key, 
            group.Sum(item => item.Price.Amount * item.Quantity)
        ))
        .ToList();

    public void AddItem(CartItem item)
    {
        Items.Add(item);
    }
}