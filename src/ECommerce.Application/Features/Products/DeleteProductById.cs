using ECommerce.Application.Common;
using MediatR;

namespace ECommerce.Application.Features.Products;

public class DeleteProductById
{
    public record Query(Guid ProductId) : IRequest;

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        public async Task Handle(Query query, CancellationToken cancellationToken)
        {
            await _eDbContext.RemoveProductByIdAsync(query.ProductId, cancellationToken);
        }
    }
}