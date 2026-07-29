using ECommerce.Application.Common.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AdminProducts = ECommerce.Application.Features.Products.Admin;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = "Admin")]
public class AdminProductsController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;

    [HttpGet]
    [EndpointDescription("Get all products with optional search and pagination")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await _mediator.Send(
            new AdminProducts.GetProducts.Query(search, page, pageSize),
            cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [EndpointDescription("Get product by id")]
    public async Task<IActionResult> GetProductById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var product = await _mediator.Send(new AdminProducts.GetProductById.Query(id), cancellationToken);
        return Ok(product);
    }

    [HttpPost]
    [EndpointDescription("Add a new product")]
    public async Task<IActionResult> AddProduct(
        [FromBody] AdminProducts.AddProduct.Command product,
        CancellationToken cancellationToken)
    {
        var newProductId = await _mediator.Send(product, cancellationToken);
        return Created($"/api/admin/products/{newProductId}", newProductId);
    }

    [HttpPut("{id:guid}")]
    [EndpointDescription("Update product by id")]
    public async Task<IActionResult> UpdateProduct(
        [FromRoute] Guid id,
        [FromBody] AdminProducts.UpdateProduct.CommandDto commandDto,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new AdminProducts.UpdateProduct.Command(id, commandDto), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [EndpointDescription("Delete product by id")]
    public async Task<IActionResult> DeleteProduct(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new AdminProducts.DeleteProduct.Command(id), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    [EndpointDescription("Upload/replace a product image")]
    public async Task<IActionResult> UploadProductImage(
        [FromRoute] Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            throw new BadRequestException("File is empty");

        await using var stream = file.OpenReadStream();
        var result = await _mediator.Send(
            new AdminProducts.UploadProductImage.Command(id, stream, file.Length, file.ContentType),
            cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/image")]
    [EndpointDescription("Remove a product image")]
    public async Task<IActionResult> DeleteProductImage(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new AdminProducts.DeleteProductImage.Command(id), cancellationToken);
        return NoContent();
    }
}
