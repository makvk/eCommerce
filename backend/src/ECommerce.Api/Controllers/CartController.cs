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
}