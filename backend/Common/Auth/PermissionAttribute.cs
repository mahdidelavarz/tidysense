using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TidySense.Common;
using TidySense.Services;

namespace TidySense.Common.Auth;

[AttributeUsage(
    AttributeTargets.Class |
    AttributeTargets.Method,
    AllowMultiple = true)]
public sealed class PermissionAttribute
    : Attribute, IAsyncAuthorizationFilter
{
    public PermissionAttribute(
        string resource,
        string action)
    {
        Resource = resource;
        Action = action;
    }

    public string Resource { get; }

    public string Action { get; }

    public async Task OnAuthorizationAsync(
        AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated
            != true)
        {
            context.Result =
                new UnauthorizedResult();

            return;
        }

        var userIdClaim =
            context.HttpContext.User.FindFirst(
                AuthConstants.UserIdClaim);

        if (userIdClaim is null ||
            !int.TryParse(
                userIdClaim.Value,
                out var userId))
        {
            context.Result =
                new UnauthorizedResult();

            return;
        }

        var authorizationService =
            context.HttpContext.RequestServices
                .GetRequiredService<
                    AuthorizationService>();

        var allowed =
            await authorizationService
                .HasPermissionAsync(
                    userId,
                    Resource,
                    Action);

        if (!allowed)
        {
            context.Result =
                new ForbidResult();
        }
    }
}