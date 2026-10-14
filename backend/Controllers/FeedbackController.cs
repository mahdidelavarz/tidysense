using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Feedback;
using TidySense.Services;

namespace TidySense.Controllers;

/// <summary>The satisfaction prompt that may follow an AI response. The server decides when it is shown.</summary>
[ApiController]
[Authorize]
[Route("api/v1/feedback/ai-responses")]
public sealed class FeedbackController(AiResponseFeedbackService feedback) : ControllerBase
{
    /// <summary>Whether to ask about this response; a prompt is created only when the rule selects it.</summary>
    [HttpPost]
    [ProducesResponseType<AiResponseFeedbackPromptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AiResponseFeedbackPromptDto>> Ask(RequestAiResponseFeedbackRequest request,
        CancellationToken cancellationToken) => Ok(await feedback.RequestAsync(request, cancellationToken));

    [HttpPost("{promptId:guid}/answer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Answer(Guid promptId, AnswerAiResponseFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        await feedback.AnswerAsync(promptId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("{promptId:guid}/close")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Close(Guid promptId, CancellationToken cancellationToken)
    {
        await feedback.CloseAsync(promptId, cancellationToken);
        return NoContent();
    }
}
