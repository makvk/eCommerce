using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using MediatR;

namespace ECommerce.Application.Features.Products.Admin;

public class DeleteProductImage
{
    public record Command(Guid ProductId) : IRequest;

    public class Handler(
        IEDbContext eDbContext,
        IFileStorageService fileStorageService) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var product = await eDbContext.GetProductByIdAsync(request.ProductId, cancellationToken)
                ?? throw new NotFoundException("Product not found");

            if (string.IsNullOrEmpty(product.ImageUrl))
                return;

            var imageUrl = product.ImageUrl;
            product.SetImageUrl(null);
            await eDbContext.SaveChangesAsync(cancellationToken);

            await fileStorageService.DeleteAsync(imageUrl, cancellationToken);
        }
    }
}
