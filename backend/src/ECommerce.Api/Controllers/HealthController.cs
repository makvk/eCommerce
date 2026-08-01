using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("")]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    [EndpointDescription("Liveness probe")]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "ok",
            message = "ok"
        });
    }
}
