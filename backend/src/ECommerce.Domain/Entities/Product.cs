using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class Product
{
    public Guid Id { get; init; }
    public string Name { get; private set; }
    public string Description  { get; private set; }
    public Money Price { get; private set; }
    public int StockQuantity { get; private set; }
    public string? ImageUrl { get; set; }
    public DateTimeOffset LastUpdatedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; init; }

    public Product(string name, string description, Money price, int stockQuantity)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        Price = price;
        StockQuantity = stockQuantity;
        CreatedAt = DateTimeOffset.UtcNow;
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
    
    private Product() {} // ctor for ef core

    public void UpdatePrice(Money price)
    {
        if (price.Amount <= 0)
        {
            throw new ArgumentException("Price must be greater than zero");
        }
        Price = price;
        LastUpdatedAt =  DateTimeOffset.UtcNow;
    }
    
    public void UpdateDetails(
        string name,
        string description,
        Money price,
        int stockQuantity)
    {
        Name = name;
        Description = description;
        Price = price;
        StockQuantity = stockQuantity;
        LastUpdatedAt =  DateTimeOffset.UtcNow;
    }
}