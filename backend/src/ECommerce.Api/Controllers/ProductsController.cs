using ECommerce.Application.Common.Exceptions;
using ECommerce.Application.Features.Products;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;

    [HttpGet]
    [EndpointDescription("Get products with optional search and pagination")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] GetProducts.Query query,
        CancellationToken cancellationToken)
    {
        var products = await _mediator.Send(query, cancellationToken);
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    [EndpointDescription("Get product by id")]
    public async Task<IActionResult> GetProductById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var product = await _mediator.Send(new GetProductById.Query(id), cancellationToken);
        return Ok(product);
    }
}
