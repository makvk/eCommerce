using ECommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Common;

public interface IEDbContext
{
    DbSet<Customer> Customers { get; set; }
    DbSet<Product> Products { get; set; }
    DbSet<Order> Orders { get; set; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}