using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Products.Admin;

public class GetProductById
{
    public record Query(Guid ProductId) : IRequest<ProductDto>;

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query, ProductDto>
    {
        public async Task<ProductDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var product = await eDbContext.Products
                .AsNoTracking()
                .Where(p => p.Id == request.ProductId)
                .Select(p => new ProductDto(
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.StockQuantity,
                    p.ImageUrl,
                    p.CreatedAt,
                    p.LastUpdatedAt))
                .FirstOrDefaultAsync(cancellationToken);

            return product ?? throw new NotFoundException($"Product with id {request.ProductId} was not found.");
        }
    }
}
