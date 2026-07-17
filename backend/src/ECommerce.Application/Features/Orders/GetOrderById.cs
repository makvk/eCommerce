using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Orders;

public class GetOrderById
{
    public record OrderItemDto(Guid ProductId, string Title, int Quantity, Money Price);
    public record ResponseDto(
        Guid Id,
        Guid CustomerId,
        List<OrderItemDto> Items,
        Money TotalPrice,
        Address Address,
        Status Status,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastUpdatedAt
    );

    public record Command(Guid OrderId) : IRequest<ResponseDto>;

    public class Handler(
        IEDbContext eDbContext,
        ICurrentUserService currentUserService) : IRequestHandler<Command, ResponseDto>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<ResponseDto> Handle(
            Command request,
            CancellationToken cancellationToken)
        {
            var userIdString = _currentUserService.UserId;
            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new UnauthorizedAccessException();

            var order = await _eDbContext.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.CustomerId == userId,  cancellationToken)
                ?? throw new NotFoundException("Order not found");
            
            var response = new ResponseDto(
                order.Id,
                order.CustomerId,
                order.Items.Select(
                        i => new OrderItemDto(
                            i.ProductId,
                            i.Title,
                            i.Quantity,
                            i.PriceAtPurchase)).ToList(),
                order.TotalPrice,
                order.Address,
                order.Status,
                order.CreatedAt,
                order.LastUpdatedAt);
            return response;
        }
    }
}