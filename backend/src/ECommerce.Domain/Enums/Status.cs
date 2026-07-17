using System.Text.Json.Serialization;

namespace ECommerce.Domain.Enums;

public enum Status : byte
{
    Created,
    Paid,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
}