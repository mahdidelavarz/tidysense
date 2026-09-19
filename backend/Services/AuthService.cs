using System.Security.Claims;
using TidySense.Common;
using TidySense.Common.Exceptions;
using TidySense.DTOs.Auth.Users;
using TidySense.Models;

namespace TidySense.Services;

public class AuthService
{
    private readonly UserService _userService;
    private readonly OtpService _otpService;
    private readonly SessionService _sessionService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthService(
        UserService userService,
        OtpService otpService,
        SessionService sessionService,
        IHttpContextAccessor httpContextAccessor)
    {
        _userService = userService;
        _otpService = otpService;
        _sessionService = sessionService;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task RegisterAsync(
        CreateUserDto dto)
    {
        var user = await _userService
            .CreateAsync(dto);

        await _otpService.RequestAsync(
            user.Id,
            user.PhoneNumber);
    }

    public async Task LoginAsync(
        string phoneNumber)
    {
        var user = await _userService
            .GetByPhoneNumberAsync(phoneNumber);

        if (user == null || !user.IsActive)
        {
            throw new UnauthorizedException(
                "Invalid authentication request.");
        }

        await _otpService.RequestAsync(
            user.Id,
            user.PhoneNumber);
    }

    public async Task<(Session Session, string Token)>
        VerifyOtpAsync(
            string phoneNumber,
            string code)
    {
        var user = await _userService
            .GetByPhoneNumberAsync(phoneNumber);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedException(
                "Invalid authentication request.");
        }

        var verified = await _otpService.VerifyAsync(
            user,
            code);

        if (!verified)
        {
            throw new UnauthorizedException(
                "Invalid authentication request.");
        }

        return await _sessionService.CreateAsync(user);
    }


    public async Task<UserDto> GetCurrentUserAsync()
    {
        var userIdClaim =
            _httpContextAccessor.HttpContext?
                .User
                .FindFirst(
                    AuthConstants.UserIdClaim);

        if (userIdClaim is null ||
            !int.TryParse(
                userIdClaim.Value,
                out var userId))
        {
            throw new UnauthorizedException(
                "User is not authenticated.");
        }

        var user = await _userService
            .GetByIdAsync(userId);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedException(
                "User is not available.");
        }

        return new UserDto
        {
            Id = user.Id,
            PhoneNumber = user.PhoneNumber,
            DisplayName = user.DisplayName,
            IsActive = user.IsActive
        };
    }
}