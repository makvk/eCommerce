using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using FluentValidation;
using MediatR;

namespace ECommerce.Application.Features.Products;

public class GetProductById
{
    public record Query(Guid ProductId) : IRequest<Product?>;
    
    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query, Product?>
    {
        private readonly IEDbContext _eDbContext = eDbContext;

        public async Task<Product?> Handle(Query request, CancellationToken cancellationToken)
        {
            var product = await _eDbContext.GetProductByIdAsync(request.ProductId, cancellationToken);
            return product;
        }
    }
}