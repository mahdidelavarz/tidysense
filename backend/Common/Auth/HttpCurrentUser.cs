using System.Security.Claims;
using TidySense.Common.Exceptions;

namespace TidySense.Common.Auth;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid UserId
    {
        get
        {
            var value = accessor.HttpContext?.User.FindFirstValue(AuthConstants.UserIdClaim);
            return Guid.TryParse(value, out var id)
                ? id
                : throw new UnauthorizedException("Authentication is required.");
        }
    }
}
