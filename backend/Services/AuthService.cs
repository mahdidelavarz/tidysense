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
    public Task<int> RequestOtpAsync(string phoneNumber, string ip, CancellationToken cancellationToken) =>
        otp.RequestAsync(phoneNumber, ip, cancellationToken);

    public async Task<(CurrentUserDto User, string Token)> VerifyOtpAsync(
        string phoneNumber, string code, string ip, CancellationToken cancellationToken)
    {
        var user = await otp.VerifyAsync(phoneNumber, code, ip, cancellationToken);
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
        await dbContext.Users.Where(x => x.Id == currentUser.UserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.SessionEpoch, x => x.SessionEpoch + 1)
                .SetProperty(x => x.UpdatedAt, DateTimeOffset.UtcNow), cancellationToken);
    }

    public static CurrentUserDto ToDto(Models.User user) =>
        new(user.Id, user.PhoneNumber, user.DisplayName, user.SetupComplete);
}
