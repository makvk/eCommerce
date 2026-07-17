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
    [EndpointDescription("Get cart")]
    public async Task<IActionResult> GetCart()
    {
        var response = await _mediator.Send(new GetCart.Query());
        return Ok(response);
    }

    [HttpPost("items")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Add item(s) to cart")]
    public async Task<IActionResult> UpdateCart(
        [FromBody] UpdateCart.Command command)
    {
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Remove items from cart")]
    public async Task<IActionResult> ClearCart()
    {
        await _mediator.Send(new ClearCart.Command());
        return NoContent();
    }
    
    [HttpDelete("items/{id:guid}")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Remove item from cart")]
    public async Task<IActionResult> RemoveCartItem(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new RemoveCartItem.Command(id));
        return NoContent();
    }

    [HttpPatch("items")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Adjust quantity of cart item(+-)")]
    public async Task<IActionResult> AdjustCartItemQuantity(
        [FromBody] AdjustCartItemQuantity.Command command)
    {
        await  _mediator.Send(command);
        return NoContent();
    }
}