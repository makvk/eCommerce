using ECommerce.Application.Common.Exceptions;
using ECommerce.Application.Features.Products;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;
    [HttpGet]
    [EndpointDescription("Get all products")]
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
        var query = new GetProductById.Query(id);
        var product = await _mediator.Send(query, cancellationToken);
        if (product == null)
        {
            throw new NotFoundException($"Product with id {id} was not found.");
        }
        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [EndpointDescription("Add a new product")]
    public async Task<IActionResult> AddProduct(
        [FromBody] AddProduct.Command product,
        CancellationToken cancellationToken)
    {
        var newProductId = await _mediator.Send(product, cancellationToken);
        return Created($"api/products/{newProductId}", newProductId);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [EndpointDescription("Delete product by id")]
    public async Task<IActionResult> DeleteProductById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var query = new DeleteProductById.Query(id);
        await  _mediator.Send(query, cancellationToken);
        return NoContent();
    }
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [EndpointDescription("Update product by id")]
    public async Task<IActionResult> UpdateProduct(
        [FromRoute] Guid id,
        [FromBody] UpdateProduct.CommandDto commandDto,
        CancellationToken cancellationToken)
    {
        var command = new UpdateProduct.Command(id, commandDto);
        
        await _mediator.Send(command, cancellationToken);
        
        return NoContent(); 
    }
}