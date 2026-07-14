using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Cart;

public class UpdateCart
{
    public record Command(Guid ProductId, int Quantity) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(c => c.ProductId)
                .NotNull().NotEmpty();
            RuleFor(c => c.Quantity)
                .GreaterThan(0);
        }
    }

    public class Handler(
        ICurrentUserService currentUserService,
        IDistributedCache distributedCache,
        IEDbContext eDbContext) : IRequestHandler<Command>
    {
        private readonly IDistributedCache _distributedCache = distributedCache;
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId
                         ?? throw new UnauthorizedAccessException("User not found");

            var product = await _eDbContext.Products.FirstOrDefaultAsync(
                p => p.Id == request.ProductId, cancellationToken)
                ?? throw new NotFoundException("Product not found");

            if (request.Quantity > product.StockQuantity)
                throw new BadRequestException("Quantity greater than stock quantity");
            
            var currentCartString = await _distributedCache.GetStringAsync(userId, cancellationToken);
            Domain.Entities.Cart cart;
            
            if (!string.IsNullOrEmpty(currentCartString))
            {
                cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(currentCartString)
                       ?? new Domain.Entities.Cart(new List<CartItem>());
            }
            else
            {
                cart = new Domain.Entities.Cart(new List<CartItem>());
            }
            
            var currentCartItem = cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
            
            if (currentCartItem == null)
            {
                var newCartItem = new CartItem(
                    product.Id,
                    product.Name,
                    request.Quantity,
                    product.Price,
                    product.ImageUrl);
                    
                cart.AddItem(newCartItem);
            }
            else
            {
                currentCartItem.UpdateQuantity(request.Quantity);
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