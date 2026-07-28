using ECommerce.Application.Features.Orders;
using ECommerce.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AdminOrders = ECommerce.Application.Features.Orders.Admin;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public class AdminOrdersController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;

    [HttpGet]
    [EndpointDescription("Get all orders, optionally filtered by customer or status")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] Guid? customerId,
        [FromQuery] Status? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var response = await _mediator.Send(new AdminOrders.GetOrders.Query(customerId, status, page, pageSize));
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [EndpointDescription("Get any order by id, regardless of owning customer")]
    public async Task<IActionResult> GetOrderById(
        [FromRoute] Guid id)
    {
        var response = await _mediator.Send(new AdminOrders.GetOrderById.Query(id));
        return Ok(response);
    }

    [HttpPatch("{id:guid}/processing")]
    [EndpointDescription("Take order in process")]
    public async Task<IActionResult> TakeOrderInProcess(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new TakeOrderInProcess.Command(id));
        return NoContent();
    }

    [HttpPatch("{id:guid}/shipped")]
    [EndpointDescription("Set order status to shipped")]
    public async Task<IActionResult> SetStatusToShipped(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new SetStatusToShipped.Command(id));
        return NoContent();
    }

    [HttpPatch("{id:guid}/delivered")]
    [EndpointDescription("Set order status to delivered")]
    public async Task<IActionResult> SetStatusToDelivered(
        [FromRoute] Guid id)
    {
        await _mediator.Send(new SetStatusToDelivered.Command(id));
        return NoContent();
    }
}
