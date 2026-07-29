using ECommerce.Application.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Products.Admin;

public class GetProducts
{
    public record Query(string? Search = null, int Page = 1, int PageSize = 20) : IRequest<ProductsResponseDto>;

    public class QueryValidator : AbstractValidator<Query>
    {
        public QueryValidator()
        {
            RuleFor(x => x.Page).GreaterThan(0);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        }
    }

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query, ProductsResponseDto>
    {
        public async Task<ProductsResponseDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var productsQuery = eDbContext.Products.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLower();
                productsQuery = productsQuery.Where(p =>
                    p.Name.ToLower().Contains(term) || p.Description.ToLower().Contains(term));
            }

            var totalCount = await productsQuery.CountAsync(cancellationToken);

            var products = await productsQuery
                .OrderByDescending(p => p.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(p => new ProductDto(
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.StockQuantity,
                    p.ImageUrl,
                    p.CreatedAt,
                    p.LastUpdatedAt))
                .ToListAsync(cancellationToken);

            return new ProductsResponseDto(products, totalCount, request.Page, request.PageSize);
        }
    }
}
