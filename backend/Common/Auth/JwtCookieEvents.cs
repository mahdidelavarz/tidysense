using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;

namespace TidySense.Common.Auth;

public static class JwtCookieEvents
{
    public static JwtBearerEvents Create() => new()
    {
        OnMessageReceived = context =>
        {
            var options = context.HttpContext.RequestServices.GetRequiredService<IOptions<JwtOptions>>().Value;
            context.Token = context.Request.Cookies[options.CookieName];
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
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            type = $"https://tidysense.local/problems/{code.ToLowerInvariant().Replace('_', '-')}",
            title,
            status,
            code,
            traceId = context.TraceIdentifier
        }));
    }
}
