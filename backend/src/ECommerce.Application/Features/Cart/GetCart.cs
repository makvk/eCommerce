using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class GetCart
{
    public record ResponseDto(List<CartItem> CartItems);

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
                return new ResponseDto(new List<CartItem>());
            }
            var cartItems = JsonSerializer.Deserialize<List<CartItem>>(productsString);
            return new ResponseDto(cartItems ?? new List<CartItem>());
        }
    }
}