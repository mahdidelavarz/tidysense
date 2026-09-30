using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Tasks;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/today")]
public sealed class TodayController(TaskService tasks) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TodayDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TodayDto>> Get(CancellationToken cancellationToken) =>
        Ok(await tasks.TodayAsync(cancellationToken));
}
