using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Auth;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/auth/sessions")]
public class SessionsController : ControllerBase
{
    private readonly SessionService _sessionService;

    public SessionsController(
        SessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>>
        GetSessions()
    {
        var userId = GetUserId();

        var currentToken = User.FindFirstValue(
            Common.AuthConstants.SessionTokenClaim);

        var sessions =
            await _sessionService
                .GetUserSessionsAsync(userId);

        var result = sessions
            .Select(x => new SessionDto
            {
                Id = x.Id,
                CreatedAt = x.CreatedAt,
                ExpiresAt = x.ExpiresAt,
                RevokedAt = x.RevokedAt,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                IsCurrent =
                    currentToken is not null &&
                    x.TokenHash == HashToken(currentToken)
            })
            .ToList();

        return Ok(result);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Revoke(
        long id)
    {
        var userId = GetUserId();

        var sessions =
            await _sessionService
                .GetUserSessionsAsync(userId);

        var session = sessions
            .FirstOrDefault(x => x.Id == id);

        if (session is not null)
        {
            await _sessionService.RevokeAsync(
                session);
        }

        return NoContent();
    }

    [HttpPost("revoke-all")]
    public async Task<IActionResult> RevokeAll()
    {
        var userId = GetUserId();

        await _sessionService.RevokeAllAsync(userId);

        await HttpContext.SignOutAsync(
            Common.AuthConstants.AuthenticationScheme);

        return NoContent();
    }

    private int GetUserId()
    {
        var value = User.FindFirstValue(
            Common.AuthConstants.UserIdClaim);

        if (!int.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException();
        }

        return userId;
    }

    private static string HashToken(string token)
    {
        var bytes = System.Security.Cryptography
            .SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(bytes);
    }
}