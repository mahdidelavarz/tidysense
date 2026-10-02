using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Reconcile;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reconcile")]
public sealed class ReconcileController(ReconcileService reconcile) : ControllerBase
{
    [HttpGet("overview")]
    [ProducesResponseType<ReconcileOverviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReconcileOverviewDto>> Overview(CancellationToken cancellationToken) =>
        Ok(await reconcile.OverviewAsync(cancellationToken));

    [HttpPost("prompt")]
    [ProducesResponseType<ReconcilePromptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReconcilePromptDto>> ResolvePrompt(ResolveReconcilePromptRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await reconcile.ResolvePromptAsync(request, idempotencyKey, cancellationToken));

    [HttpPost("sessions")]
    [ProducesResponseType<ReconcileSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReconcileSessionDto>> OpenSession(OpenReconcileSessionRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await reconcile.OpenSessionAsync(request, idempotencyKey, cancellationToken));

    [HttpGet("sessions/{id:guid}")]
    [ProducesResponseType<ReconcileSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReconcileSessionDto>> GetSession(Guid id,
        CancellationToken cancellationToken) =>
        Ok(await reconcile.GetSessionAsync(id, cancellationToken));

    [HttpPost("sessions/{id:guid}/complete")]
    [ProducesResponseType<ReconcileSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ReconcileSessionDto>> CompleteSession(Guid id,
        CompleteReconcileSessionRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await reconcile.CompleteSessionAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("sessions/{id:guid}/previews")]
    [ProducesResponseType<ActionConfirmationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ActionConfirmationDto>> CreatePreview(Guid id,
        CreateReconcilePreviewRequest request, CancellationToken cancellationToken) =>
        Ok(await reconcile.CreatePreviewAsync(id, request, cancellationToken));

    [HttpPost("confirmations/{id:guid}/submit")]
    [ProducesResponseType<ConfirmationResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ConfirmationResultDto>> Submit(Guid id, SubmitConfirmationRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await reconcile.SubmitAsync(id, request, idempotencyKey, cancellationToken));
}
