using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Today;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/today")]
public sealed class TodayController(TodayService today) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TodayDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TodayDto>> Get(CancellationToken cancellationToken) =>
        Ok(await today.GetAsync(cancellationToken));
}
