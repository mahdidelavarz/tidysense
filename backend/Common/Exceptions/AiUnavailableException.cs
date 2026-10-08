namespace TidySense.Common.Exceptions;

/// <summary>AI assistance is switched off or cannot be used right now. Manual work is unaffected.</summary>
public sealed class AiUnavailableException(string errorCode = AiUnavailableException.Planning)
    : Exception("AI assistance is unavailable. Nothing was changed.")
{
    public const string Planning = "PLANNING_AI_UNAVAILABLE";
    public const string Reconcile = "RECONCILE_AI_UNAVAILABLE";

    public string ErrorCode { get; } = errorCode;
}

/// <summary>The user started more AI operations than the configured limit allows.</summary>
public sealed class AiRateLimitException(int retryAfterSeconds)
    : Exception("Too many AI requests. Nothing was changed.")
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}
