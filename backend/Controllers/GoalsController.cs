using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/goals")]
public sealed class GoalsController(GoalService goals) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CursorPageDto<GoalDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPageDto<GoalDto>>> List(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await goals.ListAsync(status, cursor, limit, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<GoalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GoalDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await goals.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<GoalDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GoalDto>> Create(CreateGoalRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await goals.CreateAsync(request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/goals/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<GoalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GoalDto>> Update(Guid id, UpdateGoalRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await goals.UpdateAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/review")]
    [ProducesResponseType<GoalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GoalDto>> Review(Guid id, ReviewGoalRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await goals.ReviewAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/terminal-preview")]
    [ProducesResponseType<TerminalPreviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TerminalPreviewDto>> PreviewTerminal(Guid id,
        TerminalPreviewRequest request, CancellationToken cancellationToken) =>
        Ok(await goals.PreviewTerminalAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/terminal")]
    [ProducesResponseType<GoalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GoalDto>> Terminal(Guid id, TerminalCommandRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await goals.TerminalAsync(id, request, idempotencyKey, cancellationToken));
}
