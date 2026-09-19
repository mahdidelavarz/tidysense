using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TidySense.Common;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public class OtpService
{
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;

    private readonly ISmsSender _smsSender;

    public OtpService(
        AppDbContext dbContext,
        IConfiguration configuration,
        ISmsSender smsSender)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _smsSender = smsSender;
    }

public async Task RequestAsync(int userId, string phoneNumber)
{
    var now = DateTime.UtcNow;

    var activeChallenges =
        await _dbContext.OtpChallenges
            .Where(x =>
                x.UserId == userId &&
                x.ConsumedAt == null &&
                x.ExpiresAt > now)
            .ToListAsync();

    foreach (var challenge in activeChallenges)
    {
        challenge.ConsumedAt = now;
    }

    var code = GenerateCode();

    var challengeEntity = new OtpChallenge
    {
        UserId = userId,
        CodeHash = HashCode(code),
        FailedAttempts = 0,
        CreatedAt = now,
        ExpiresAt = now.AddMinutes(
            AuthConstants.OtpExpirationMinutes)
    };

    _dbContext.OtpChallenges.Add(challengeEntity);

    await _dbContext.SaveChangesAsync();

    // Development only.
    Console.WriteLine(
        $"[OTP] UserId={userId}, Code={code}, " +
        $"ExpiresAt={challengeEntity.ExpiresAt:O}");

    await _smsSender.SendAsync(
            phoneNumber,
            code);
}

    public async Task<bool> VerifyAsync(
        User user,
        string code)
    {
        var now = DateTime.UtcNow;

        var challenge =
            await _dbContext.OtpChallenges
                .Where(x =>
                    x.UserId == user.Id &&
                    x.ConsumedAt == null &&
                    x.ExpiresAt > now)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

        if (challenge is null)
        {
            return false;
        }

        if (challenge.FailedAttempts >=
            AuthConstants.OtpMaxAttempts)
        {
            return false;
        }

        var suppliedHash = HashCode(code);

        var valid =
            CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(
                    challenge.CodeHash),
                Convert.FromHexString(
                    suppliedHash));

        if (!valid)
        {
            challenge.FailedAttempts++;

            await _dbContext.SaveChangesAsync();

            return false;
        }

        challenge.ConsumedAt = now;

        await _dbContext.SaveChangesAsync();

        return true;
    }

    private static string GenerateCode()
    {
        var min = (int)Math.Pow(
            10,
            AuthConstants.OtpLength - 1);

        var max = (int)Math.Pow(
            10,
            AuthConstants.OtpLength);

        return RandomNumberGenerator
            .GetInt32(min, max)
            .ToString();
    }

    private string HashCode(string code)
    {
        var secret =
            _configuration[
                "Authentication:OtpSecret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException(
                "Authentication:OtpSecret is not configured.");
        }

        using var hmac = new HMACSHA256(
            Encoding.UTF8.GetBytes(secret));

        var hash = hmac.ComputeHash(
            Encoding.UTF8.GetBytes(code));

        return Convert.ToHexString(hash);
    }
}