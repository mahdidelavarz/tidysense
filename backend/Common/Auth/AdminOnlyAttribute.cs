using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TidySense.Common;

namespace TidySense.Common.Auth;

[AttributeUsage(
    AttributeTargets.Class |
    AttributeTargets.Method,
    AllowMultiple = false)]
public sealed class AdminOnlyAttribute
    : Attribute, IAsyncAuthorizationFilter
{
    public Task OnAuthorizationAsync(
        AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated
            != true)
        {
            context.Result =
                new UnauthorizedResult();

            return Task.CompletedTask;
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

            return Task.CompletedTask;
        }

        if (userId != 1)
        {
            context.Result =
                new ForbidResult();
        }

        return Task.CompletedTask;
    }
}