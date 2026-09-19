using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common;
using TidySense.DTOs.Auth;
using TidySense.DTOs.Auth.Users;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly SessionService _sessionService;
    private readonly UserService _userService;

    public AuthController(
        AuthService authService,
        SessionService sessionService,
        UserService userService)
    {
        _authService = authService;
        _sessionService = sessionService;
        _userService = userService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(
        CreateUserDto dto)
    {
        await _authService.RegisterAsync(
            dto);

        return NoContent();
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        RequestOtpDto dto)
    {
        await _authService.LoginAsync(
            dto.PhoneNumber);

        return NoContent();
    }

    [HttpPost("otp/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyOtp(
        [FromBody] VerifyOtpDto dto)
    {
        var result = await _authService.VerifyOtpAsync(
            dto.PhoneNumber,
            dto.Code);

        var claims = new[]
        {
            new Claim(
                AuthConstants.UserIdClaim,
                result.Session.UserId.ToString()),

            new Claim(
                AuthConstants.SessionTokenClaim,
                result.Token)
        };

        var identity = new ClaimsIdentity(
            claims,
            AuthConstants.AuthenticationScheme);

        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            AuthConstants.AuthenticationScheme,
            principal);

        return NoContent();
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var token = User.FindFirstValue(
            AuthConstants.SessionTokenClaim);

        if (!string.IsNullOrWhiteSpace(token))
        {
            var session =
                await _sessionService
                    .GetValidSessionAsync(token);

            if (session is not null)
            {
                await _sessionService.RevokeAsync(
                    session);
            }
        }

        await HttpContext.SignOutAsync(
            AuthConstants.AuthenticationScheme);

        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        return Ok(
            await _authService.GetCurrentUserAsync());
    }
    
    private int GetUserId()
    {
        var value = User.FindFirstValue(
            AuthConstants.UserIdClaim);

        if (!int.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException();
        }

        return userId;
    }
}