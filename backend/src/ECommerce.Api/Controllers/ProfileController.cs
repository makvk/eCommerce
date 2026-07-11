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
    public async Task<IActionResult> GetProfile(
        [FromQuery] GetProfile.Query query,
        CancellationToken cancellationToken)
    {
        var customer = await _mediator.Send(query, cancellationToken);
        
        return Ok(customer);
    }
}