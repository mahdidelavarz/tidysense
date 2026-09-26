using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public sealed class OtpService(AppDbContext db, IOptions<OtpOptions> options, ISmsSender smsSender)
{
    public async Task<int> RequestAsync(string rawPhone, string ip, CancellationToken cancellationToken)
    {
        var phone = UserService.NormalizeIranianMobile(rawPhone);
        var settings = options.Value;
        var now = DateTimeOffset.UtcNow;
        var phoneKey = Hash($"rate:phone:{phone}");
        var ipKey = Hash($"rate:ip:{ip}");
        var ipLimited = false;
        string? code = null;
        Guid challengeId = Guid.Empty;

        await using (var tx = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            await LockAsync($"phone:{phoneKey}", cancellationToken);
            await LockAsync($"ip:{ipKey}", cancellationToken);
            var phoneCount = await CountAsync("REQUEST_PHONE", phoneKey, now.AddMinutes(-15), cancellationToken);
            var ipCount = await CountAsync("REQUEST_IP", ipKey, now.AddHours(-1), cancellationToken);
            var latest = await db.OtpChallenges.AsNoTracking()
                .Where(x => x.NormalizedPhone == phone && x.Purpose == "LOGIN")
                .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(cancellationToken);
            ipLimited = ipCount >= settings.IpRequestsPerHour;
            var permitted = !ipLimited && phoneCount < settings.PhoneRequestsPer15Minutes &&
                (latest is null || latest.UsedAt is not null ||
                 latest.CreatedAt.AddSeconds(settings.ResendSeconds) <= now);
            if (permitted)
            {
                await db.OtpChallenges.Where(x => x.NormalizedPhone == phone && x.Purpose == "LOGIN" && x.UsedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.UsedAt, now), cancellationToken);
                code = RandomNumberGenerator.GetInt32((int)Math.Pow(10, settings.CodeLength - 1),
                    (int)Math.Pow(10, settings.CodeLength)).ToString();
                challengeId = Guid.NewGuid();
                db.OtpChallenges.Add(new OtpChallenge
                {
                    Id = challengeId, NormalizedPhone = phone, Purpose = "LOGIN",
                    CodeDigest = Hash(phone + "LOGIN" + code), CreatedAt = now,
                    ExpiresAt = now.AddMinutes(settings.ExpirationMinutes)
                });
                AddRateEvent("REQUEST_PHONE", phoneKey, now);
                AddRateEvent("REQUEST_IP", ipKey, now);
                await db.SaveChangesAsync(cancellationToken);
            }
            await tx.CommitAsync(cancellationToken);
        }
        if (ipLimited) throw new OtpRateLimitException();
        if (code is not null)
        {
            try { await smsSender.SendAsync(phone, code, cancellationToken); }
            catch
            {
                await db.OtpChallenges.Where(x => x.Id == challengeId && x.UsedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.UsedAt, DateTimeOffset.UtcNow), CancellationToken.None);
                throw new SmsSendException("Verification is temporarily unavailable.");
            }
        }
        return settings.ResendSeconds;
    }

    public async Task<User> VerifyAsync(string rawPhone, string code, string ip, CancellationToken cancellationToken)
    {
        var phone = UserService.NormalizeIranianMobile(rawPhone);
        var settings = options.Value;
        var now = DateTimeOffset.UtcNow;
        var phoneKey = Hash($"rate:phone:{phone}");
        var ipKey = Hash($"rate:ip:{ip}");
        User? user = null;
        var limited = false;

        await using (var tx = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            await LockAsync($"phone:{phoneKey}", cancellationToken);
            await LockAsync($"ip:{ipKey}", cancellationToken);
            var count = await CountAsync("VERIFY_IP", ipKey, now.AddMinutes(-10), cancellationToken);
            limited = count >= settings.IpVerificationsPer10Minutes;
            if (!limited)
            {
                AddRateEvent("VERIFY_IP", ipKey, now);
                var challenge = await db.OtpChallenges
                    .Where(x => x.NormalizedPhone == phone && x.Purpose == "LOGIN")
                    .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(cancellationToken);
                if (challenge is { UsedAt: null } && challenge.ExpiresAt > now && challenge.AttemptCount < settings.MaxAttempts)
                {
                    if (code.Length == settings.CodeLength && code.All(char.IsAsciiDigit) &&
                        CryptographicOperations.FixedTimeEquals(
                            Convert.FromHexString(challenge.CodeDigest),
                            Convert.FromHexString(Hash(phone + "LOGIN" + code))))
                    {
                        challenge.UsedAt = now;
                        await db.Database.ExecuteSqlInterpolatedAsync(
                            $"INSERT INTO \"Users\" (\"Id\", \"PhoneNumber\", \"IsActive\", \"SessionEpoch\", \"SetupComplete\", \"CreatedAt\") VALUES ({Guid.NewGuid()}, {phone}, {true}, {0}, {false}, {now}) ON CONFLICT (\"PhoneNumber\") DO NOTHING",
                            cancellationToken);
                        user = await db.Users.SingleAsync(x => x.PhoneNumber == phone, cancellationToken);
                        if (!user.IsActive) user = null;
                    }
                    else challenge.AttemptCount++;
                }
                await db.SaveChangesAsync(cancellationToken);
            }
            await tx.CommitAsync(cancellationToken);
        }
        if (limited) throw new OtpRateLimitException();
        return user ?? throw new UnauthorizedException("Invalid verification code or expired challenge.");
    }

    private async Task LockAsync(string key, CancellationToken cancellationToken) =>
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({key}, 0))", cancellationToken);

    private Task<int> CountAsync(string kind, string digest, DateTimeOffset after, CancellationToken cancellationToken) =>
        db.OtpRateEvents.CountAsync(x => x.Kind == kind && x.KeyDigest == digest && x.CreatedAt > after, cancellationToken);

    private void AddRateEvent(string kind, string digest, DateTimeOffset now) =>
        db.OtpRateEvents.Add(new OtpRateEvent { Kind = kind, KeyDigest = digest, CreatedAt = now });

    private string Hash(string value)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(options.Value.HashingKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }
}
