using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Routines;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/routine-occurrences")]
public sealed class RoutineOccurrencesController(RoutineService routines) : ControllerBase
{
    [HttpPost("{id:guid}/done")]
    [ProducesResponseType<RoutineOccurrenceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineOccurrenceDto>> Done(Guid id, CompleteOccurrenceRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await routines.CompleteOccurrenceAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/correct")]
    [ProducesResponseType<RoutineOccurrenceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RoutineOccurrenceDto>> Correct(Guid id, CorrectOccurrenceRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await routines.CorrectOccurrenceAsync(id, request, idempotencyKey, cancellationToken));
}
