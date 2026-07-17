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
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateOrder.Command command)
    {
        var order = await _mediator.Send(command);
        return Created("/api/orders", order);
    }

    [HttpGet]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _mediator.Send(new GetOrders.Query());
        return Ok(orders);
    }
}