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
        var retryAfterSeconds = await auth.RequestOtpAsync(dto.PhoneNumber,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", cancellationToken);
        return Accepted(new { retryAfterSeconds });
    }

    [AllowAnonymous]
    [HttpPost("otp/verify")]
    public async Task<ActionResult<CurrentUserDto>> VerifyOtp(VerifyOtpDto dto, CancellationToken cancellationToken)
    {
        var result = await auth.VerifyOtpAsync(dto.PhoneNumber, dto.Code,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", cancellationToken);
        WriteCookie(result.Token);
        return Ok(result.User);
    }

    // The Android app's sign-in (ADR-008): the token comes back in the body and no cookie is written.
    [AllowAnonymous]
    [HttpPost("otp/verify-native")]
    public async Task<ActionResult<NativeSessionDto>> VerifyNativeOtp(VerifyOtpDto dto, CancellationToken cancellationToken)
    {
        if (!ApiRequestSecurityMiddleware.IsNativeClient(Request))
            throw new ArgumentException($"The {AuthConstants.ClientHeader} header is required.");
        return Ok(await auth.VerifyNativeOtpAsync(dto.PhoneNumber, dto.Code,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", cancellationToken));
    }

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
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddMinutes(options.LifetimeMinutes),
            IsEssential = true
        });
    }

    private void DeleteCookie() => Response.Cookies.Delete(jwtOptions.Value.CookieName,
        new CookieOptions { Path = "/", SameSite = SameSiteMode.Lax });
}
