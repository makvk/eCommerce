using ECommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Common;

public interface IEDbContext
{
    DbSet<Customer> Customers { get; set; }
    DbSet<Product> Products { get; set; }
    DbSet<Order> Orders { get; set; }
    
    Task AddCustomerAsync(Customer customer, CancellationToken cancellationToken);
    Task<Product?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddProductAsync(Product product, CancellationToken cancellationToken);
    Task RemoveProductByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddOrderAsync(Order order, CancellationToken cancellationToken);
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}