using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using TidySense.Common;
using TidySense.Services;

namespace TidySense.Common.Auth;

public sealed class SessionCookieEvents : CookieAuthenticationEvents
{
    private readonly SessionService _sessionService;

    public SessionCookieEvents(
        SessionService sessionService)
    {
        _sessionService = sessionService;
    }

    public override async Task ValidatePrincipal(
        CookieValidatePrincipalContext context)
    {
        var token = context.Principal?
            .FindFirstValue(
                AuthConstants.SessionTokenClaim);

        if (string.IsNullOrWhiteSpace(token))
        {
            context.RejectPrincipal();
            return;
        }

        var session = await _sessionService
            .GetValidSessionAsync(token);

        if (session is null)
        {
            context.RejectPrincipal();
        }
    }
}