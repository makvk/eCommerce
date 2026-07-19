using ECommerce.Application.Features.Orders;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;

    [HttpPost]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Create new order from active cart")]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateOrder.Command command)
    {
        var order = await _mediator.Send(command);
        return Created("/api/orders", order);
    }

    [HttpGet]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Get orders history for current customer")]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _mediator.Send(new GetOrders.Query());
        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Get detailed order information by id")]
    public async Task<IActionResult> GetOrderById(
        [FromRoute] Guid id)
    {
        var response = await _mediator.Send(new GetOrderById.Command(id));
        return Ok(response);
    }

    [HttpPatch("{id:guid}/cancel")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Cancel order and return items to stock")]
    public async Task<IActionResult> CancelOrder(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new CancelOrder.Command(id));
        return NoContent();
    }
}