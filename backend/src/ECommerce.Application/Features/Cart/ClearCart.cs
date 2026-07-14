using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class ClearCart
{
    public record Command() : IRequest;
    
    public class Handler(
        ICurrentUserService currentUserService,
        IDistributedCache distributedCache) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userId = currentUserService.UserId
                ?? throw new NotFoundException("User not found");
            await distributedCache.RemoveAsync(userId, cancellationToken);
        }
    }
}