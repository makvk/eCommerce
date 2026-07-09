using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Products;

public class GetProducts
{
    public record Query() :  IRequest<List<Product>>;

    public class Handler(
        IEDbContext eDbContext) : IRequestHandler<Query, List<Product>>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        public async Task<List<Product>> Handle(
            Query request, 
            CancellationToken cancellationToken)
        {
            var products = await _eDbContext.Products.ToListAsync(cancellationToken);
            return products;
        }
    }
}