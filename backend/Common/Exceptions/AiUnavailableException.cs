namespace TidySense.Common.Exceptions;

/// <summary>AI assistance is switched off or cannot be used right now. Manual work is unaffected.</summary>
public sealed class AiUnavailableException() : Exception("AI planning is unavailable. Nothing was changed.");

/// <summary>The user started more AI operations than the configured limit allows.</summary>
public sealed class AiRateLimitException(int retryAfterSeconds)
    : Exception("Too many planning requests. Nothing was changed.")
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}
