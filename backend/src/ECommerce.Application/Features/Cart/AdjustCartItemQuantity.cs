using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class AdjustCartItemQuantity
{
    public record Command(Guid ProductId, int Delta) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.Delta)
                .Must(d => d != 0);
        }
    }

    public class Handler(
        IDistributedCache distributedCache,
        IEDbContext eDbContext,
        ICurrentUserService currentUserService) : IRequestHandler<Command>
    {
        private readonly IDistributedCache _distributedCache = distributedCache;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly IEDbContext _eDbContext = eDbContext;
        
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId 
                         ?? throw new NotFoundException("User not found");
            var cartString = await _distributedCache.GetStringAsync(userId, cancellationToken) 
                             ?? throw new BadRequestException("Cart is empty");
            var cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(cartString);
            var cartItem = cart?.Items.FirstOrDefault(x => x.ProductId == request.ProductId) 
                           ?? throw new NotFoundException("Cart item not found");
            var currentQuantity = cartItem.Quantity + request.Delta;
            var product = await _eDbContext.Products
                              .AsNoTracking()
                              .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
                          ?? throw new NotFoundException("Product not found");
            var stockQuantity = product.StockQuantity;
            
            if (currentQuantity <= 0)
            {
                cart.Items.Remove(cartItem);
            }
            else
            {
                if (currentQuantity > stockQuantity) 
                    throw new BadRequestException("Quantity exceeds stock quantity");
                cartItem.Quantity = currentQuantity;
            }
            var updatedCartString = JsonSerializer.Serialize(cart);
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(14)
            };
            await _distributedCache.SetStringAsync(userId, updatedCartString, cacheOptions, cancellationToken);
        }
    }
}