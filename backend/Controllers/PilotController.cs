using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TidySense.Common.Errors;
using TidySense.DTOs.Pilot;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Operations;

namespace TidySense.Controllers;

/// <summary>What a pilot participant is told about their data, and the answers to the in-app pilot questions.</summary>
[ApiController]
[Route("api/v1/pilot")]
public sealed class PilotController(
    PilotFeedbackService feedback,
    AiConsentPolicy consent,
    IOptionsMonitor<OperationsOptions> operations,
    IOptionsMonitor<PilotOptions> pilot) : ControllerBase
{
    /// <summary>Public: the notice must be readable before signing in.</summary>
    [AllowAnonymous]
    [HttpGet("notice")]
    [ProducesResponseType<PilotNoticeDto>(StatusCodes.Status200OK)]
    public ActionResult<PilotNoticeDto> Notice()
    {
        var retention = operations.CurrentValue.Retention;
        var settings = pilot.CurrentValue;
        return Ok(new PilotNoticeDto(AiConsentPolicy.NoticeVersion, consent.ProviderName, retention.R2DaysAfterClose,
            retention.R3DaysAfterExpiry, retention.R4Days, settings.ErasureCompletionDays,
            string.IsNullOrWhiteSpace(settings.SupportContact) ? null : settings.SupportContact.Trim(),
            PilotInstruments.Version));
    }

    [Authorize]
    [HttpPost("feedback")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Feedback(SubmitPilotFeedbackRequest request, CancellationToken cancellationToken)
    {
        await feedback.SubmitAsync(request, cancellationToken);
        return NoContent();
    }
}
