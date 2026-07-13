using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class CartItem(
    Guid productId,
    string productName,
    int quantity,
    Money price,
    string? imageUrl)
{
    public Guid ProductId { get; private set; } = productId;
    public string ProductName { get; private set; } = productName;
    public int Quantity { get; private set; } = quantity;
    public Money Price { get; private set; } = price;
    public string? ImageUrl { get; private set; } = imageUrl;

    public void UpdateQuantity(int quantity)
    {
        Quantity = quantity;
    }
}