using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.DTOs.Auth;
using TidySense.Services;

namespace TidySense.Controllers.Auth;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(AuthService auth, IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("otp/request")]
    public async Task<IActionResult> RequestOtp(RequestOtpDto dto, CancellationToken cancellationToken)
    {
        await auth.RequestOtpAsync(dto.PhoneNumber, cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("otp/verify")]
    public async Task<ActionResult<CurrentUserDto>> VerifyOtp(VerifyOtpDto dto, CancellationToken cancellationToken)
    {
        var result = await auth.VerifyOtpAsync(dto.PhoneNumber, dto.Code, cancellationToken);
        WriteCookie(result.Token);
        return Ok(result.User);
    }

    [Authorize]
    [HttpGet("current-user")]
    public async Task<ActionResult<CurrentUserDto>> CurrentUser(CancellationToken cancellationToken) =>
        Ok(await auth.GetCurrentAsync(cancellationToken));

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        DeleteCookie();
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(CancellationToken cancellationToken)
    {
        await auth.RevokeAllAsync(cancellationToken);
        DeleteCookie();
        return NoContent();
    }

    private void WriteCookie(string token)
    {
        var options = jwtOptions.Value;
        Response.Cookies.Append(options.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(options.LifetimeMinutes),
            IsEssential = true
        });
    }

    private void DeleteCookie() => Response.Cookies.Delete(jwtOptions.Value.CookieName);
}
