using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class CartItem(
    Guid productId,
    string productName,
    int quantity,
    Money price,
    string? imageUrl)
{
    public Guid ProductId { get; init; } = productId;
    public string ProductName { get; init; } = productName;
    public int Quantity { get; set; } = quantity;
    public Money Price { get; set; } = price;
    public string? ImageUrl { get; set; } = imageUrl;

    public void UpdateQuantity(int quantity)
    {
        Quantity = quantity;
    }
    public void AddQuantity(int quantity)
    {
        Quantity += quantity;
    }
}