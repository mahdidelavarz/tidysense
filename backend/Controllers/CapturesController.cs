using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Captures;
using TidySense.DTOs.Common;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/captures")]
public sealed class CapturesController(CaptureService captures) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CursorPageDto<CaptureDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPageDto<CaptureDto>>> List(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await captures.ListAsync(status, cursor, limit, cancellationToken));

    [HttpPost]
    [ProducesResponseType<CaptureDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CaptureDto>> Create(CreateCaptureRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await captures.CreateAsync(request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/captures/{created.Id}", created);
    }

    [HttpPost("{id:guid}/resolve-task")]
    [ProducesResponseType<CaptureResolutionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CaptureResolutionDto>> ResolveToTask(Guid id,
        ResolveCaptureToTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await captures.ResolveToTaskAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/resolve-routine")]
    [ProducesResponseType<CaptureResolutionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CaptureResolutionDto>> ResolveToRoutine(Guid id,
        ResolveCaptureToRoutineRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await captures.ResolveToRoutineAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/discard")]
    [ProducesResponseType<CaptureDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CaptureDto>> Discard(Guid id, DiscardCaptureRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await captures.DiscardAsync(id, request, idempotencyKey, cancellationToken));
}
