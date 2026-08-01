using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerce.Application.Features.Orders;

public class CreateOrder
{
    public record ResponseDto(Guid OrderId);

    public record Command(Address Address) : IRequest<ResponseDto>;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.Address.City)
                .NotNull().NotEmpty();

            RuleFor(x => x.Address.Street)
                .NotNull().NotEmpty();

            RuleFor(x => x.Address.Country)
                .NotNull().NotEmpty();

            RuleFor(x => x.Address.PostalCode)
                .NotNull().NotEmpty();
        }
    }

    public class Handler(
        IDistributedCache cache,
        IEDbContext eDbContext,
        IConvertCurrencyService convertCurrencyService,
        ICurrentUserService currentUserService,
        IOrderNotificationClient orderNotificationClient) : IRequestHandler<Command, ResponseDto>
    {
        public async Task<ResponseDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var userIdString = currentUserService.UserId;

            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new UnauthorizedException("Invalid user id");

            var cartString = await cache.GetStringAsync(userIdString, cancellationToken)
                ?? throw new BadRequestException("Cart is empty");

            var cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(cartString);
            if (cart == null || cart.Items.Count == 0)
                throw new BadRequestException("Cart is empty");

            Order order;
            Money orderPrice;

            await using var tx = await eDbContext.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = await eDbContext.Customers.FirstOrDefaultAsync(c => c.Id == userId, cancellationToken)
                    ?? throw new NotFoundException("User not found");

                var userBalance = user.Balance;
                var amount = 0.0m;
                order = new Order(userId, request.Address);

                foreach (var item in cart.Items)
                {
                    var productId = item.ProductId;
                    var quantity = item.Quantity;

                    var product = await eDbContext.Products
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken)
                        ?? throw new BadRequestException($"Product {productId} is not available");

                    var convertPrice = await convertCurrencyService
                        .ConvertCurrencyAsync(item.Price, userBalance.Currency, cancellationToken);

                    var now = DateTimeOffset.UtcNow;
                    var rowsAffected = await eDbContext.Products
                        .Where(p => p.Id == productId && p.StockQuantity >= quantity)
                        .ExecuteUpdateAsync(
                            setters => setters
                                .SetProperty(p => p.StockQuantity, p => p.StockQuantity - quantity)
                                .SetProperty(p => p.LastUpdatedAt, _ => now),
                            cancellationToken);

                    if (rowsAffected == 0)
                    {
                        throw new BadRequestException(
                            $"Insufficient stock for product '{product.Name}'. Requested: {quantity}");
                    }

                    order.AddItem(productId, item.ProductName, quantity, convertPrice);
                    amount += convertPrice.Amount * quantity;
                }

                if (amount > userBalance.Amount)
                {
                    throw new BadRequestException($"Amount {amount} is greater than current balance");
                }

                var newBalance = new Money(userBalance.Currency, userBalance.Amount - amount);
                user.UpdateBalance(newBalance);

                orderPrice = new Money(userBalance.Currency, amount);
                order.SetTotalPrice(orderPrice);

                await eDbContext.AddOrderAsync(order, cancellationToken);
                await eDbContext.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
            }

            await cache.RemoveAsync(userIdString, cancellationToken);

            await orderNotificationClient.NotifyOrderCreatedAsync(
                new OrderCreatedNotification(
                    EventId: Guid.NewGuid(),
                    OrderId: order.Id,
                    CustomerId: userId,
                    Total: orderPrice.Amount,
                    Currency: orderPrice.Currency),
                cancellationToken);

            return new ResponseDto(order.Id);
        }
    }
}
