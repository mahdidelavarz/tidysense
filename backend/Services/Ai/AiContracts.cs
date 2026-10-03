namespace TidySense.Services.Ai;

/// <summary>Internal failure classes. They are logged and stored; a client sees only a bounded failure code.</summary>
public static class AiFailureClasses
{
    public const string Transport = "TRANSPORT";
    public const string Timeout = "TIMEOUT";
    public const string ProviderUnavailable = "PROVIDER_UNAVAILABLE";
    public const string ProviderRateLimited = "PROVIDER_RATE_LIMITED";
    public const string ProviderRejected = "PROVIDER_REJECTED";
    public const string ProviderRefused = "PROVIDER_REFUSED";
    public const string SpendCap = "SPEND_CAP";
    public const string Incomplete = "INCOMPLETE";
    public const string Parse = "PARSE";
    public const string Schema = "SCHEMA";
    public const string Policy = "POLICY";
    public const string Semantic = "SEMANTIC";
    public const string Context = "CONTEXT";
    public const string Budget = "BUDGET";
    public const string CircuitOpen = "CIRCUIT_OPEN";
    public const string KillSwitch = "KILL_SWITCH";
    public const string Configuration = "CONFIGURATION";

    /// <summary>Failures that say the provider is unhealthy. Only these move a circuit breaker.</summary>
    public static bool IsProviderAvailability(string failureClass) =>
        failureClass is Transport or Timeout or ProviderUnavailable or ProviderRateLimited;
}

/// <summary>One complete, non-streamed completion. It carries no tool, function or connector definition.</summary>
public sealed record AiCompletionRequest(string Model, string SystemPrompt, string UserContent, int MaxOutputTokens);

public sealed record AiCompletionResult(string Text, string FinishReason, int? InputTokens, int? OutputTokens);

public sealed class AiProviderException(string failureClass, bool transient) : Exception(failureClass)
{
    public string FailureClass { get; } = failureClass;

    /// <summary>True only for failures the one controlled retry may follow.</summary>
    public bool Transient { get; } = transient;
}

/// <summary>
/// The provider boundary: text in, text out. An implementation performs exactly one HTTP call per
/// invocation, never retries on its own and never exposes provider types to its caller.
/// </summary>
public interface IAiCompletionClient
{
    Task<AiCompletionResult> CompleteAsync(string providerKey, AiCompletionRequest request,
        CancellationToken cancellationToken);
}
