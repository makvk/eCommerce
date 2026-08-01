using System.Net.Http.Json;
using ECommerce.Application.Common;
using ECommerce.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECommerce.Infrastructure.Services;

public class HttpOrderNotificationClient(
    HttpClient httpClient,
    IOptions<NotificationsOptions> options,
    ILogger<HttpOrderNotificationClient> logger) : IOrderNotificationClient
{
    public async Task NotifyOrderCreatedAsync(
        OrderCreatedNotification notification,
        CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Enabled || string.IsNullOrWhiteSpace(settings.BaseUrl))
        {
            logger.LogDebug(
                "Notifications disabled; skipped OrderCreated for {OrderId}",
                notification.OrderId);
            return;
        }

        try
        {
            using var response = await httpClient.PostAsJsonAsync(
                "/v1/events/order-created",
                new
                {
                    event_id = notification.EventId,
                    order_id = notification.OrderId,
                    customer_id = notification.CustomerId,
                    total = notification.Total,
                    currency = notification.Currency
                },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Notifications service returned {StatusCode} for order {OrderId}: {Body}",
                    (int)response.StatusCode,
                    notification.OrderId,
                    body);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Failed to notify OrderCreated for order {OrderId}",
                notification.OrderId);
        }
    }
}
