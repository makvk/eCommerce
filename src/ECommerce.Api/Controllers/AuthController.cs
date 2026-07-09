using ECommerce.Application.Common;
using ECommerce.Application.Features.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IMediator mediator) : ControllerBase
{
    private readonly IMediator _mediator = mediator;
    [HttpPost]
    [Route("login")]
    public async Task<IActionResult> Login(
            [FromBody] Login.Command command,
            CancellationToken cancellationToken
        )
    {
        var authResult = await _mediator.Send(command, cancellationToken);
        return Ok(authResult);
    }

    [HttpGet]
    [Authorize]
    [Route("test-auth")]
    public IActionResult TestAuth()
    {
        return Ok();
    }

    [HttpPost]
    [Route("register")]
    public async Task<IActionResult> Register(
        [FromBody] Register.Command command,
        CancellationToken cancellationToken
    )
    {
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [Route("get-test-admin-token")]
    public IActionResult GetTestAdminToken(IJwtTokenGenerator tokenGenerator)
    {
        var token = tokenGenerator.GenerateToken(
            Guid.Empty,
            "Admin",
            "test-admin");
        return Ok(new Dictionary<string, string> { { "token",  token } });
    }
}