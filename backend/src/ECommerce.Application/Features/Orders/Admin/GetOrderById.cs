using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Orders.Admin;

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

    public record Query(Guid OrderId) : IRequest<ResponseDto>;

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query, ResponseDto>
    {
        private readonly IEDbContext _eDbContext = eDbContext;

        public async Task<ResponseDto> Handle(
            Query request,
            CancellationToken cancellationToken)
        {
            var order = await _eDbContext.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
                ?? throw new NotFoundException("Order not found");

            return new ResponseDto(
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
        }
    }
}
