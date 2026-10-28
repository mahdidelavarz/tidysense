using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.Common.Errors;

namespace TidySense.Common.Auth;

public static class JwtCookieEvents
{
    public static JwtBearerEvents Create() => new()
    {
        OnMessageReceived = context =>
        {
            var options = context.HttpContext.RequestServices.GetRequiredService<IOptions<JwtOptions>>().Value;
            // The browser's cookie first; the native app's bearer header only when no cookie is present (ADR-008).
            var cookie = context.Request.Cookies[options.CookieName];
            var authorization = context.Request.Headers.Authorization.ToString();
            context.Token = !string.IsNullOrEmpty(cookie) ? cookie
                : authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? authorization[7..].Trim()
                : null;
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var userIdValue = context.Principal?.FindFirstValue(AuthConstants.UserIdClaim);
            var epochValue = context.Principal?.FindFirstValue(AuthConstants.SessionEpochClaim);
            if (!Guid.TryParse(userIdValue, out var userId) || !int.TryParse(epochValue, out var epoch))
            {
                context.Fail("Invalid authentication claims.");
                return;
            }

            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var valid = await db.Users.AsNoTracking().AnyAsync(
                user => user.Id == userId && user.IsActive && user.SessionEpoch == epoch,
                context.HttpContext.RequestAborted);
            if (!valid) context.Fail("The session is no longer valid.");
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            await WriteProblemAsync(context.HttpContext, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
        },
        OnForbidden = context =>
            WriteProblemAsync(context.HttpContext, 403, "FORBIDDEN", "Access denied")
    };

    private static Task WriteProblemAsync(HttpContext context, int status, string code, string title)
    {
        return ApiProblem.WriteAsync(context, status, code, title);
    }
}
