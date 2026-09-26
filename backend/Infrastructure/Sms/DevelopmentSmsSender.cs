using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Services;

namespace TidySense.Infrastructure.Sms;

public sealed class DevelopmentSmsSender(IOptions<OtpOptions> options) : ISmsSender
{
    private readonly ConcurrentDictionary<string, (string Code, DateTimeOffset ExpiresAt)> _latest = new();

    public Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        _latest[phoneNumber] = (message, DateTimeOffset.UtcNow.AddMinutes(options.Value.ExpirationMinutes));
        return Task.CompletedTask;
    }

    public string? Latest(string phoneNumber) =>
        _latest.TryGetValue(phoneNumber, out var code) && code.ExpiresAt > DateTimeOffset.UtcNow
            ? code.Code
            : null;
}
