using ECommerce.Domain.Records;

namespace ECommerce.Domain.Entities;

public class Customer
{
    public Guid Id { get; init; }
    public string Email { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public FullName Name { get; private  set; } = null!;
    public Money Balance { get; private set; } = null!;
    public DateTimeOffset LastUpdatedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; init; }
    
    public Customer(string email, string passwordHash, FullName name)
    {
        Email = email;
        PasswordHash = passwordHash;
        Name = name;
        
        Id = Guid.NewGuid();
        Balance = Money.Zero();
        
        LastUpdatedAt = DateTimeOffset.UtcNow;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    private Customer() {} // ctor for ef core

    public void UpToBalance(decimal amount)
    {
        if (amount < 0)
        {
            throw new ArgumentException("Amount cannot be negative", nameof(amount));
        }
        Balance = Balance with { Amount = Balance.Amount + amount };
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
    
    public void UpdateBalance(Money newBalance)
    {
        Balance = newBalance;
        LastUpdatedAt = DateTimeOffset.UtcNow;
    }
}