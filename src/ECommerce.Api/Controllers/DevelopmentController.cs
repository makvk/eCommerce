#if DEBUG
using ECommerce.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("")]
public class DevelopmentController :  ControllerBase
{
    [HttpGet]
    public IActionResult Index()
    {
        return Redirect("/scalar/v1");
    }
    
    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new 
        { 
            status = "ok", 
            message = "ok" 
        });
    }
    
    [HttpGet]
    [Route("get-test-admin-token")]
    public IActionResult GetTestAdminToken(
        [FromServices] IJwtTokenGenerator tokenGenerator)
    {
        var token = tokenGenerator.GenerateToken(
            Guid.Empty,
            "Admin",
            "test-admin");
        return Ok(new Dictionary<string, string> { { "token",  token } });
    }
    
    [HttpGet]
    [Authorize]
    [Route("test-auth")]
    public IActionResult TestAuth()
    {
        var currentRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        return Ok(currentRole);
    }
}
#endif