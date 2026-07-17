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
        ICurrentUserService currentUserService) : IRequestHandler<Command, ResponseDto>
    {
        private readonly IDistributedCache _cache = cache;
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly IConvertCurrencyService _convertCurrencyService = convertCurrencyService;
        public async Task<ResponseDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var userIdString = _currentUserService.UserId;
            
            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new UnauthorizedAccessException();
            
            var user = _eDbContext.Customers.FirstOrDefault(c => c.Id == userId)
                ?? throw new UnauthorizedAccessException();
            
            var userBalance = user.Balance;
            
            var cartString = await _cache.GetStringAsync(userIdString, cancellationToken)
                ?? throw new BadRequestException("Cart is empty");

            var cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(cartString);
            if (cart == null || cart.Items.Count == 0)
                throw new BadRequestException("Cart is empty");
            var amount = 0.0m;
            var order = new Order(userId, request.Address);
            foreach (var item in cart.Items)
            {
                var convertPrice = await _convertCurrencyService
                    .ConvertCurrencyAsync(item.Price, userBalance.Currency, cancellationToken);
                var product = await _eDbContext.Products
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId, cancellationToken);
                if (product == null || product.StockQuantity < item.Quantity)
                    throw new BadRequestException($"Current quantity {item.Quantity} is less than stock quantity");
                order.AddItem(item.ProductId, item.ProductName, item.Quantity, convertPrice);
                product.UpdateStockQuantity(product.StockQuantity - item.Quantity);

                amount += convertPrice.Amount * item.Quantity;
            }
            
            if (amount > userBalance.Amount)
            {
                throw new BadRequestException($"Amount {amount} is greater than current amount");
            }
            
            var newBalance = new Money(userBalance.Currency, userBalance.Amount - amount);
            user.UpdateBalance(newBalance);
            
            var orderPrice = new Money(userBalance.Currency, amount);
            order.SetTotalPrice(orderPrice);
            await _eDbContext.AddOrderAsync(order, cancellationToken);
            
            await _eDbContext.SaveChangesAsync(cancellationToken);
            await _cache.RemoveAsync(userIdString, cancellationToken);
            
            var response = new ResponseDto(order.Id);
            return response;
        }
    }
}