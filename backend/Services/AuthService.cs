using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Auth;

namespace TidySense.Services;

public sealed class AuthService(
    UserService users,
    OtpService otp,
    JwtTokenService tokens,
    AppDbContext dbContext,
    ICurrentUser currentUser)
{
    public async Task RequestOtpAsync(string phoneNumber, CancellationToken cancellationToken)
    {
        var user = await users.GetOrCreateAsync(phoneNumber, cancellationToken);
        await otp.RequestAsync(user, cancellationToken);
    }

    public async Task<(CurrentUserDto User, string Token)> VerifyOtpAsync(
        string phoneNumber, string code, CancellationToken cancellationToken)
    {
        var normalized = UserService.NormalizeIranianMobile(phoneNumber);
        var user = await users.GetByPhoneNumberAsync(normalized, cancellationToken);
        if (user is null || !user.IsActive || !await otp.VerifyAsync(user, code, cancellationToken))
            throw new UnauthorizedException("Invalid authentication request.");
        return (ToDto(user), tokens.Create(user));
    }

    public async Task<CurrentUserDto> GetCurrentAsync(CancellationToken cancellationToken)
    {
        var user = await users.GetByIdAsync(currentUser.UserId, cancellationToken);
        return user is { IsActive: true }
            ? ToDto(user)
            : throw new UnauthorizedException("User is not available.");
    }

    public async Task RevokeAllAsync(CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleAsync(x => x.Id == currentUser.UserId, cancellationToken);
        user.SessionEpoch++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static CurrentUserDto ToDto(Models.User user) => new(user.Id, user.PhoneNumber, user.DisplayName);
}
