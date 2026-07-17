using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ECommerce.Application.Features.Profile;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;
    
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Get user profile information")]
    public async Task<IActionResult> GetProfile(
        [FromQuery] GetProfile.Query query,
        CancellationToken cancellationToken)
    {
        var customer = await _mediator.Send(query, cancellationToken);
        
        return Ok(customer);
    }

    [HttpPatch("change-currency")]
    [Authorize(Roles = "Customer")]
    [EndpointDescription("Change user currency")]
    public async Task<IActionResult> ChangeCurrency(
        [FromBody] ChangeCurrency.Command command)
    {
        await _mediator.Send(command);
        return NoContent();
    }
}