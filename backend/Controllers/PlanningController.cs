using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Planning;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/planning")]
public sealed class PlanningController(PlanningService planning) : ControllerBase
{
    // Selects a mock fixture in development and tests. It is ignored everywhere else.
    private const string FixtureHeader = "X-Planning-Fixture";

    [HttpGet("active")]
    [ProducesResponseType<PlanningActiveDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PlanningActiveDto>> Active(CancellationToken cancellationToken) =>
        Ok(await planning.ActiveAsync(cancellationToken));

    [HttpPost("attempts")]
    [ProducesResponseType<PlanningAttemptDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlanningAttemptDto>> StartAttempt(StartPlanningAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var attempt = await planning.StartAttemptAsync(request,
            Request.Headers[FixtureHeader].FirstOrDefault(), cancellationToken);
        return Accepted($"/api/v1/planning/attempts/{attempt.Id}", attempt);
    }

    [HttpGet("attempts/{id:guid}")]
    [ProducesResponseType<PlanningAttemptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlanningAttemptDto>> GetAttempt(Guid id, CancellationToken cancellationToken) =>
        Ok(await planning.GetAttemptAsync(id, cancellationToken));

    [HttpPost("attempts/{id:guid}/cancel")]
    [ProducesResponseType<PlanningAttemptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlanningAttemptDto>> CancelAttempt(Guid id,
        CancellationToken cancellationToken) =>
        Ok(await planning.CancelAttemptAsync(id, cancellationToken));

    [HttpGet("drafts/{id:guid}")]
    [ProducesResponseType<PlanningDraftDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlanningDraftDto>> GetDraft(Guid id, CancellationToken cancellationToken) =>
        Ok(await planning.GetDraftAsync(id, cancellationToken));

    [HttpPost("drafts/{id:guid}/revisions")]
    [ProducesResponseType<PlanningDraftDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PlanningDraftDto>> Revise(Guid id, RevisePlanningDraftRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await planning.ReviseAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("drafts/{id:guid}/cancel")]
    [ProducesResponseType<PlanningDraftDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PlanningDraftDto>> CancelDraft(Guid id, PlanningDraftRevisionRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await planning.CancelDraftAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("drafts/{id:guid}/previews")]
    [ProducesResponseType<PlanningConfirmationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PlanningConfirmationDto>> CreatePreview(Guid id,
        PlanningDraftRevisionRequest request, CancellationToken cancellationToken) =>
        Ok(await planning.CreatePreviewAsync(id, request, cancellationToken));

    [HttpGet("confirmations/{id:guid}")]
    [ProducesResponseType<PlanningConfirmationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlanningConfirmationDto>> GetConfirmation(Guid id,
        CancellationToken cancellationToken) =>
        Ok(await planning.GetConfirmationAsync(id, cancellationToken));

    [HttpPost("confirmations/{id:guid}/submit")]
    [ProducesResponseType<PlanningApplyResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PlanningApplyResultDto>> Submit(Guid id,
        SubmitPlanningConfirmationRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await planning.SubmitAsync(id, request, idempotencyKey, cancellationToken));

    [HttpGet("facts")]
    [ProducesResponseType<IReadOnlyList<PlanningFactDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PlanningFactDto>>> ListFacts([FromQuery] Guid? goalId,
        [FromQuery] Guid? projectId, CancellationToken cancellationToken) =>
        Ok(await planning.ListFactsAsync(goalId, projectId, cancellationToken));

    [HttpPost("facts/{id:guid}/remove")]
    [ProducesResponseType<PlanningFactDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PlanningFactDto>> RemoveFact(Guid id, RemovePlanningFactRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await planning.RemoveFactAsync(id, request, idempotencyKey, cancellationToken));
}
