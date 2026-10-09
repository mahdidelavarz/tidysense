namespace TidySense.Services.Ai;

/// <summary>
/// Runtime configuration of the AI layer. Kill switches and limits are read before every provider
/// call, so a change takes effect without a restart.
/// </summary>
public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>Stops every provider call. Manual and deterministic flows are unaffected.</summary>
    public bool GlobalKillSwitch { get; set; }

    public AiPlanningOptions Planning { get; set; } = new();

    public AiReconcileOptions Reconcile { get; set; } = new();

    public Dictionary<string, AiProviderOptions> Providers { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

/// <summary>The switches and limits every output family has on its own.</summary>
public class AiFamilyOptions
{
    public const string MockProvider = "mock";

    public bool KillSwitch { get; set; }

    /// <summary>A key of <see cref="AiOptions.Providers"/>, or "mock" for the deterministic implementation.</summary>
    public string Provider { get; set; } = MockProvider;

    /// <summary>The single controlled retry of a transient provider failure.</summary>
    public bool RetryEnabled { get; set; } = true;

    public int MaxInputTokens { get; set; } = 12000;
    public int MaxOutputTokens { get; set; } = 4000;
    public int ConnectionTimeoutSeconds { get; set; } = 10;
    public int InvocationTimeoutSeconds { get; set; } = 45;
    public int OperationDeadlineSeconds { get; set; } = 100;
    public int MaxConcurrentInvocations { get; set; } = 4;
    public decimal DailyBudgetUsd { get; set; } = 2m;
    public int CircuitFailureThreshold { get; set; } = 5;
    public int CircuitOpenSeconds { get; set; } = 60;
    public int SpendCapLatchMinutes { get; set; } = 60;
}

public sealed class AiPlanningOptions : AiFamilyOptions
{
    public int AttemptsPerUserPerHour { get; set; } = 20;
    public int AttemptsPerUserPerDay { get; set; } = 60;
}

/// <summary>Reconcile explanation: a small request over structured evidence, so its limits are tighter.</summary>
public sealed class AiReconcileOptions : AiFamilyOptions
{
    public AiReconcileOptions()
    {
        MaxInputTokens = 6000;
        MaxOutputTokens = 1500;
        InvocationTimeoutSeconds = 30;
        OperationDeadlineSeconds = 70;
        DailyBudgetUsd = 1m;
    }

    public int ExplanationsPerUserPerDay { get; set; } = 20;
}

public sealed class AiProviderOptions
{
    /// <summary>The provider-specific kill switch.</summary>
    public bool Disabled { get; set; }

    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;

    /// <summary>The name users are shown when asked to agree that their text is sent to this provider.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Sends <c>thinking: disabled</c>. DeepSeek reasons by default, which is slower and spends
    /// output tokens; a provider that does not know the field should leave this off.
    /// </summary>
    public bool DisableThinking { get; set; }

    public decimal InputPricePerMillionTokens { get; set; }
    public decimal OutputPricePerMillionTokens { get; set; }
}
