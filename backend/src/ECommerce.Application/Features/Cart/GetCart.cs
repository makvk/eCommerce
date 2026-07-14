using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class GetCart
{
    public record ResponseDto(Domain.Entities.Cart Cart);

    public record Query() : IRequest<ResponseDto>;

    public class Handler(
        ICurrentUserService currentUserService,
        IDistributedCache distributedCache) : IRequestHandler<Query, ResponseDto>
    {
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly  IDistributedCache _distributedCache = distributedCache;
        
        public async Task<ResponseDto> Handle(Query message, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId 
                         ?? throw new UnauthorizedAccessException("User not found");
            
            var productsString = await _distributedCache.GetStringAsync(userId, cancellationToken);
            if (string.IsNullOrEmpty(productsString))
            {
                return new ResponseDto(new Domain.Entities.Cart(new List<CartItem>()));
            }
            var cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(productsString)
                ?? new Domain.Entities.Cart();
            return new ResponseDto(cart);
        }
    }
}