using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Orders;

public class SetStatusToDelivered
{
    public record Command(Guid OrderId) : IRequest;

    public class Handler(
        IEDbContext eDbContext) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var order = await eDbContext.Orders
                            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
                        ??  throw new NotFoundException("Order not found");
            if (order.Status != Status.Shipped)
                throw new BadRequestException("Cannot set status to delivered");
            
            order.UpdateStatus(Status.Delivered);
            await eDbContext.SaveChangesAsync(cancellationToken);
        }
    }
}