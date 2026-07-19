using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ECommerce.Application.Features.Orders;

public class CancelOrder
{
    public record Command(Guid OrderId) : IRequest;

    public class Handler(
        IEDbContext eDbContext,
        ICurrentUserService currentUserService,
        IConvertCurrencyService convertCurrencyService,
        ILogger<CancelOrder> logger) : IRequestHandler<Command>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly IConvertCurrencyService _convertCurrencyService = convertCurrencyService;
        private readonly ILogger<CancelOrder> _logger = logger;
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userIdString = _currentUserService.UserId;
            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new NotFoundException("User not found");
            var user = await _eDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == userId,  cancellationToken)
                ?? throw new NotFoundException("User not found");
            var order = await _eDbContext.Orders.Include(o => o.Items)               
                    .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.CustomerId == userId, cancellationToken)
                    ?? throw new NotFoundException("Order not found");
            if (order.Status == Status.Delivered || order.Status == Status.Cancelled)
                throw new BadRequestException("Cannot cancel order");

            var orderPrice = await _convertCurrencyService
                .ConvertCurrencyAsync(order.TotalPrice, user.Balance.Currency, cancellationToken);
            user.UpToBalance(orderPrice.Amount);
            order.UpdateStatus(Status.Cancelled);
            
            var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
            
            var products = await _eDbContext.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync(cancellationToken);;
            foreach (var item in order.Items)
            {
                var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                if (product == null)
                {
                    _logger.LogError($"Product {item.ToString()}, not found");
                    continue;
                }
                product.UpdateStockQuantity(product.StockQuantity + item.Quantity);
            }
            await _eDbContext.SaveChangesAsync(cancellationToken);
        }
    }
}