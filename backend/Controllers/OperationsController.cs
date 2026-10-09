using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Errors;
using TidySense.Data;
using TidySense.DTOs.Operations;
using TidySense.Services;
using TidySense.Services.Operations;

namespace TidySense.Controllers;

/// <summary>
/// Read-only operational evidence for operator accounts. Anyone else gets 404, the same answer
/// as for a resource that is not theirs. Every response is an aggregate.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/operations")]
public sealed class OperationsController(
    AppDbContext db,
    ICurrentUser currentUser,
    OperatorAccess access,
    ApplicationDateService dates,
    PilotMetricsService metrics,
    OperationsHealthService health) : ControllerBase
{
    private const int DefaultDays = 28;
    private const int MaxDays = 366;

    [HttpGet("metrics")]
    [ProducesResponseType<OperationsMetricsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationsMetricsDto>> Metrics([FromQuery] int days = DefaultDays,
        CancellationToken cancellationToken = default)
    {
        if (!await IsOperatorAsync(cancellationToken)) return NotFound();
        var (from, to) = Window(days);
        return Ok(await metrics.ComputeAsync(from, to, cancellationToken));
    }

    [HttpGet("ai")]
    [ProducesResponseType<OperationsAiDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationsAiDto>> Ai([FromQuery] int days = DefaultDays,
        CancellationToken cancellationToken = default)
    {
        if (!await IsOperatorAsync(cancellationToken)) return NotFound();
        var (from, to) = Window(days);
        return Ok(await health.AiAsync(from, to, cancellationToken));
    }

    [HttpGet("health")]
    [ProducesResponseType<OperationsHealthDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationsHealthDto>> Health(CancellationToken cancellationToken)
    {
        if (!await IsOperatorAsync(cancellationToken)) return NotFound();
        return Ok(await health.HealthAsync(cancellationToken));
    }

    private (DateTimeOffset From, DateTimeOffset To) Window(int days)
    {
        var to = dates.UtcNow;
        return (to.AddDays(-Math.Clamp(days, 1, MaxDays)), to);
    }

    private async Task<bool> IsOperatorAsync(CancellationToken cancellationToken)
    {
        var phone = await db.Users.AsNoTracking().Where(x => x.Id == currentUser.UserId && x.IsActive)
            .Select(x => x.PhoneNumber).SingleOrDefaultAsync(cancellationToken);
        return phone is not null && access.IsOperator(phone);
    }
}
