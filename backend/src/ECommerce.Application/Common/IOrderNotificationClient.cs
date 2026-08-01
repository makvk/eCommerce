namespace ECommerce.Application.Common;

public record OrderCreatedNotification(
    Guid EventId,
    Guid OrderId,
    Guid CustomerId,
    decimal Total,
    string Currency);

public interface IOrderNotificationClient
{
    Task NotifyOrderCreatedAsync(OrderCreatedNotification notification, CancellationToken cancellationToken);
}
