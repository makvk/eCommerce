using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class RemoveCartItem
{
    public record Command(Guid ProductId) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.ProductId)
                .NotNull().NotEmpty();
        }
    }
    
    public class Handler(
        IDistributedCache distributedCache,
        ICurrentUserService currentUserService) : IRequestHandler<Command>
    {
        private static readonly DistributedCacheEntryOptions CacheOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(14)
        };
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userId = currentUserService.UserId 
                ?? throw new NotFoundException("User not found");
            var cartString = await distributedCache.GetStringAsync(userId, cancellationToken);
            if (string.IsNullOrEmpty(cartString))
            {
                throw new BadRequestException("Cart is empty");
            }

            var cart = JsonSerializer.Deserialize<ECommerce.Domain.Entities.Cart>(cartString);
            var cartItem = cart?.Items.FirstOrDefault(i => i.ProductId == request.ProductId)
                ?? throw new NotFoundException("Cart item not found");
            cart.Items.Remove(cartItem);
            await distributedCache.SetStringAsync(userId, JsonSerializer.Serialize(cart), CacheOptions, cancellationToken);
        }
    }
}