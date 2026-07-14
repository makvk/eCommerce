using ECommerce.Application.Features.Cart;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/cart")]
public class CartController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;

    [HttpGet]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetCart()
    {
        var response = await _mediator.Send(new GetCart.Query());
        return Ok(response);
    }

    [HttpPost("items")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> UpdateCart(
        [FromBody] UpdateCart.Command command)
    {
        await _mediator.Send(command);
        return Ok();
    }

    [HttpDelete]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> ClearCart()
    {
        await _mediator.Send(new ClearCart.Command());
        return NoContent();
    }
    
    [HttpDelete("items/{id:guid}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> RemoveCartItem(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new RemoveCartItem.Command(id));
        return NoContent();
    }
}