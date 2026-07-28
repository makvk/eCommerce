using ECommerce.Application.Common;
using ECommerce.Domain.Enums;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Orders.Admin;

public class GetOrders
{
    public record OrderItemDto(Guid ProductId, string Title, int Quantity, Money Price);

    public record OrderDto(
        Guid OrderId,
        Guid CustomerId,
        Status Status,
        List<OrderItemDto> Items,
        Money TotalPrice,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastUpdatedAt);

    public record ResponseDto(List<OrderDto> Orders, int TotalCount, int Page, int PageSize);

    public record Query(Guid? CustomerId, Status? Status, int Page = 1, int PageSize = 20) : IRequest<ResponseDto>;

    public class QueryValidator : AbstractValidator<Query>
    {
        public QueryValidator()
        {
            RuleFor(x => x.Page).GreaterThan(0);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        }
    }

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Query, ResponseDto>
    {
        private readonly IEDbContext _eDbContext = eDbContext;

        public async Task<ResponseDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var ordersQuery = _eDbContext.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .AsQueryable();

            if (request.CustomerId.HasValue)
                ordersQuery = ordersQuery.Where(o => o.CustomerId == request.CustomerId.Value);

            if (request.Status.HasValue)
                ordersQuery = ordersQuery.Where(o => o.Status == request.Status.Value);

            var totalCount = await ordersQuery.CountAsync(cancellationToken);

            var orders = await ordersQuery
                .OrderByDescending(o => o.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(o => new OrderDto(
                    o.Id,
                    o.CustomerId,
                    o.Status,
                    o.Items.Select(i => new OrderItemDto(
                        i.ProductId,
                        i.Title,
                        i.Quantity,
                        i.PriceAtPurchase)).ToList(),
                    o.TotalPrice,
                    o.CreatedAt,
                    o.LastUpdatedAt))
                .ToListAsync(cancellationToken);

            return new ResponseDto(orders, totalCount, request.Page, request.PageSize);
        }
    }
}
