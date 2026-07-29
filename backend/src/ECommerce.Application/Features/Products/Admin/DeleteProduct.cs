using ECommerce.Application.Common;
using MediatR;

namespace ECommerce.Application.Features.Products.Admin;

public class DeleteProduct
{
    public record Command(Guid ProductId) : IRequest;

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            await eDbContext.RemoveProductByIdAsync(request.ProductId, cancellationToken);
        }
    }
}
