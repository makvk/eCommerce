using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Infrastructure.Persistence;

public class EDbContext(DbContextOptions<EDbContext> options) : DbContext(options), IEDbContext
{
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    
    // Users
    public async Task AddCustomerAsync(Customer customer, CancellationToken cancellationToken)
    {
        await Customers.AddAsync(customer, cancellationToken);
        
        await SaveChangesAsync(cancellationToken);
    }
    
    // Products
    public async Task<Product?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        return product;
    }
    public async Task AddProductAsync(Product product, CancellationToken cancellationToken)
    {
        await Products.AddAsync(product, cancellationToken);
        
        await SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveProductByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var rowsAffected = await Products
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        if (rowsAffected == 0)
        {
            throw new NotFoundException($"Product with id {id} not found");
        }
    }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customers", "customer");
            
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(150);
            
            entity.HasIndex(e => e.Email)
                .IsUnique();
            
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsRequired();
            
            entity.ComplexProperty(e => e.Name, builder =>
            {
                builder.Property(b => b.FirstName)
                    .IsRequired()
                    .HasMaxLength(50);
                
                builder.Property(b => b.LastName)
                    .IsRequired()
                    .HasMaxLength(50);
                
                builder.Property(b => b.MiddleName)
                    .HasMaxLength(50);
            });

            entity.ComplexProperty(e => e.Balance, builder =>
            {
                builder.Property(b => b.Amount)
                    .IsRequired()
                    .HasPrecision(18, 2);
                
                builder.Property(b => b.Currency)
                    .IsRequired()
                    .HasMaxLength(3);
            });
            
            entity.Property(e => e.LastUpdatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");
            
            entity.Property(e => e.CreatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products", "catalog");
            
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.Property(e => e.Description)
                .IsRequired()
                .HasMaxLength(500);

            entity.ComplexProperty(e => e.Price, builder =>
            {
                builder.Property(b => b.Amount)
                    .IsRequired()
                    .HasPrecision(18, 2);
                
                builder.Property(b => b.Currency)
                    .IsRequired()
                    .HasMaxLength(3);
            });

            entity.Property(e => e.StockQuantity)
                .IsRequired();
            
            entity.Property(e => e.LastUpdatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");
            
            entity.Property(e => e.CreatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders", "ordering");
            entity.HasKey(e => e.Id);
            
            entity.HasIndex(e => e.CustomerId); 
    
            entity.Property(e => e.CustomerId)
                .IsRequired();
            
            entity.ComplexProperty(e => e.Address, builder =>
            {
                builder.Property(b => b.City)
                    .IsRequired()
                    .HasMaxLength(50);

                builder.Property(b => b.Country)
                    .IsRequired()
                    .HasMaxLength(50);

                builder.Property(b => b.PostalCode)
                    .IsRequired()
                    .HasMaxLength(50);

                builder.Property(b => b.Street)
                    .IsRequired()
                    .HasMaxLength(50);
            });

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(e => e.LastUpdatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");

            entity.Property(e => e.CreatedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone");
            
            entity.HasMany(e => e.Items)
                .WithOne()
                .HasForeignKey(e => e.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.Navigation(o => o.Items)
                .Metadata.SetPropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("OrderItems", "ordering");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.OrderId)
                .IsRequired();

            entity.Property(ei => ei.ProductId)
                .IsRequired();

            entity.Property(ei => ei.Quantity)
                .IsRequired();

            entity.ComplexProperty(e => e.PriceAtPurchase, builder =>
            {
                builder.Property(b => b.Amount)
                    .IsRequired()
                    .HasPrecision(18, 2);

                builder.Property(b => b.Currency)
                    .IsRequired()
                    .HasMaxLength(3);
            });
        });
    }
}