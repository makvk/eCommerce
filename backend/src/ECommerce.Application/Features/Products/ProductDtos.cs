using ECommerce.Domain.Records;

namespace ECommerce.Application.Features.Products;

public record ProductDto(
    Guid Id,
    string Name,
    string Description,
    Money Price,
    int StockQuantity,
    string? ImageUrl,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastUpdatedAt);

public record ProductsResponseDto(
    List<ProductDto> Products,
    int TotalCount,
    int Page,
    int PageSize);
