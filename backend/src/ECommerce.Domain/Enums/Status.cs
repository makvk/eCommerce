using System.Text.Json.Serialization;

namespace ECommerce.Domain.Enums;

public enum Status : byte
{
    Created,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
}