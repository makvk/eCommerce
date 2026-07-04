using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/auth/[controller]")]
public class AuthController() : ControllerBase
{
    
    [HttpGet]
    public async Task<IActionResult> Login()
    {
        
    }
}