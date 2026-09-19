using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TidySense.Common;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public class SessionService
{
    private readonly AppDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SessionService(
        AppDbContext dbContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _dbContext = dbContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<(Session Session, string Token)> CreateAsync(
        User user)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        var ipAddress = httpContext?
            .Connection
            .RemoteIpAddress?
            .ToString();

        var userAgent = httpContext?
            .Request
            .Headers
            .UserAgent
            .ToString();

        var token = GenerateToken();

        var now = DateTime.UtcNow;

        var session = new Session
        {
            UserId = user.Id,
            TokenHash = HashToken(token),
            CreatedAt = now,
            ExpiresAt = now.AddHours(
                AuthConstants.SessionExpirationHours),
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        _dbContext.Sessions.Add(session);

        await _dbContext.SaveChangesAsync();

        return (session, token);
    }

    public async Task<Session?> GetValidSessionAsync(
        string token)
    {
        var tokenHash = HashToken(token);

        var session = await _dbContext.Sessions
            .Include(x => x.User)
            .FirstOrDefaultAsync(x =>
                x.TokenHash == tokenHash);

        if (session is null)
        {
            return null;
        }

        if (session.RevokedAt is not null)
        {
            return null;
        }

        if (session.ExpiresAt <= DateTime.UtcNow)
        {
            return null;
        }

        if (!session.User.IsActive)
        {
            return null;
        }

        return session;
    }

    public async Task RevokeAsync(
        Session session)
    {
        if (session.RevokedAt is not null)
        {
            return;
        }

        session.RevokedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
    }

    public async Task RevokeAllAsync(
        int userId)
    {
        var now = DateTime.UtcNow;

        var sessions = await _dbContext.Sessions
            .Where(x =>
                x.UserId == userId &&
                x.RevokedAt == null &&
                x.ExpiresAt > now)
            .ToListAsync();

        foreach (var session in sessions)
        {
            session.RevokedAt = now;
        }

        await _dbContext.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<Session>>
        GetUserSessionsAsync(int userId)
    {
        var now = DateTime.UtcNow;

        return await _dbContext.Sessions
            .AsNoTracking()
            .Where(x =>
                x.UserId == userId &&
                x.RevokedAt == null &&
                x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes);
    }

    public static string HashToken(string token)
    {
        var bytes = SHA256.HashData(
            Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(bytes);
    }
}