using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Orders;

public class GetOrders
{
    public record OrderItemDto(Guid ProductId, string Title, int Quantity, Money Price);
    public record OrderDto(Guid OrderId, Status Status, List<OrderItemDto> Items, Money TotalPrice);
    public record ResponseDto(List<OrderDto> Orders);
    
    public record Query() : IRequest<ResponseDto>;

    public class Handler(
        IEDbContext eDbContext,
        ICurrentUserService currentUserService) : IRequestHandler<Query, ResponseDto>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;
            
        public async Task<ResponseDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var userIdString = _currentUserService.UserId;
            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new UnauthorizedAccessException();
            var orders = await _eDbContext.Orders
                .AsNoTracking()
                .Where(o => o.CustomerId == userId)
                .Include(o => o.Items)
                .Select(o => new OrderDto(
                    o.Id,
                    o.Status,
                    o.Items.Select(i => new OrderItemDto(
                        i.ProductId,
                        i.Title,
                        i.Quantity,
                        i.PriceAtPurchase)).ToList(),
                    o.TotalPrice))
                .ToListAsync(cancellationToken);
            
            var response = new ResponseDto(orders);
            return response;
        }
    }
}