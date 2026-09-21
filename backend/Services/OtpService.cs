using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public sealed class OtpService(
    AppDbContext dbContext,
    IOptions<OtpOptions> options,
    ISmsSender smsSender)
{
    public async Task RequestAsync(User user, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var active = await dbContext.OtpChallenges
            .Where(x => x.UserId == user.Id && x.ConsumedAt == null && x.ExpiresAt > now)
            .ToListAsync(cancellationToken);
        foreach (var challenge in active) challenge.ConsumedAt = now;

        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        dbContext.OtpChallenges.Add(new OtpChallenge
        {
            Id = Guid.NewGuid(), UserId = user.Id, CodeHash = Hash(code), CreatedAt = now,
            ExpiresAt = now.AddMinutes(AuthConstants.OtpExpirationMinutes)
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        await smsSender.SendAsync(user.PhoneNumber, code, cancellationToken);
    }

    public async Task<bool> VerifyAsync(User user, string code, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var challenge = await dbContext.OtpChallenges
            .Where(x => x.UserId == user.Id && x.ConsumedAt == null && x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (challenge is null || challenge.FailedAttempts >= AuthConstants.OtpMaxAttempts) return false;

        var valid = CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(challenge.CodeHash), Convert.FromHexString(Hash(code)));
        if (!valid) challenge.FailedAttempts++;
        else challenge.ConsumedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
        return valid;
    }

    private string Hash(string code)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(options.Value.HashingKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(code)));
    }
}
