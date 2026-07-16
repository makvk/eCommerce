using System.Text.Json.Serialization;
using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class Cart
{
    [JsonInclude]
    public List<CartItem> Items { get; private set; } = new();
    

    public Cart() { }

    public Cart(List<CartItem> cartItems)
    {
        Items = cartItems;
    }

    public void AddItem(CartItem item)
    {
        Items.Add(item);
    }
}