using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Auth;
using TidySense.Services;

namespace TidySense.Controllers.Auth;

[ApiController]
[Authorize]
[Route("api/v1/users")]
public sealed class UsersController(AuthService auth, AiConsentService consent) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken cancellationToken) =>
        Ok(await auth.GetCurrentAsync(cancellationToken));

    /// <summary>Agrees to, or withdraws agreement to, sending planning text to the configured AI provider.</summary>
    [HttpPut("me/ai-consent")]
    [ProducesResponseType<CurrentUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CurrentUserDto>> SetAiConsent(SetAiConsentRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await consent.SetAsync(request, idempotencyKey, cancellationToken));
}
