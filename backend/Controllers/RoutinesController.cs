using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Common;
using TidySense.DTOs.Routines;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/routines")]
public sealed class RoutinesController(RoutineService routines) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CursorPageDto<RoutineDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPageDto<RoutineDto>>> List(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await routines.ListAsync(status, cursor, limit, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<RoutineDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoutineDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await routines.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<RoutineDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineDto>> Create(CreateRoutineRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await routines.CreateAsync(request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/routines/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<RoutineDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineDto>> Update(Guid id, UpdateRoutineRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await routines.UpdateAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/stop")]
    [ProducesResponseType<RoutineDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineDto>> Stop(Guid id, StopRoutineRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await routines.StopAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/continuation")]
    [ProducesResponseType<RoutineDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineDto>> Continue(Guid id, CreateRoutineRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await routines.ContinueAsync(id, request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/routines/{created.Id}", created);
    }

    [HttpGet("{id:guid}/occurrences")]
    [ProducesResponseType<CursorPageDto<RoutineOccurrenceDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CursorPageDto<RoutineOccurrenceDto>>> ListOccurrences(Guid id,
        [FromQuery] string? cursor, [FromQuery, Range(1, 100)] int limit = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await routines.ListOccurrencesAsync(id, cursor, limit, cancellationToken));
}
