using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Auth;
using TidySense.Services;

namespace TidySense.Controllers.Auth;

[ApiController]
[Authorize]
[Route("api/v1/users")]
public sealed class UsersController(AuthService auth) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken cancellationToken) =>
        Ok(await auth.GetCurrentAsync(cancellationToken));
}
