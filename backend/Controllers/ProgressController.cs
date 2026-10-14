using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Progress;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/progress")]
public sealed class ProgressController(ProgressService progress) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ProgressDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProgressDto>> Get(CancellationToken cancellationToken) =>
        Ok(await progress.GetAsync(cancellationToken));
}
