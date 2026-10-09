using Microsoft.Extensions.Options;

namespace TidySense.Services.Operations;

/// <summary>
/// Who may read operational evidence, how long each retention class is kept, and when an alert is
/// raised. Phone numbers are supplied through user-secrets or the environment, never tracked.
/// </summary>
public sealed class OperationsOptions
{
    public const string SectionName = "Operations";

    /// <summary>Normalized phone numbers of the accounts that may open the operator page.</summary>
    public string[] OperatorPhones { get; set; } = [];

    /// <summary>Internal, seeded, demo and QA accounts: reported apart from the primary population.</summary>
    public string[] InternalPhones { get; set; } = [];

    public RetentionOptions Retention { get; set; } = new();

    public AlertOptions Alerts { get; set; } = new();
}

/// <summary>Provisional durations per 019C class, pending legal and security review. R1 is never purged.</summary>
public sealed class RetentionOptions
{
    public bool Enabled { get; set; } = true;
    public int R4Days { get; set; } = 90;
    public int R3DaysAfterExpiry { get; set; } = 30;
    public int R2DaysAfterClose { get; set; } = 180;

    /// <summary>The most rows one purge statement removes in a run; the rest waits for the next run.</summary>
    public int BatchSize { get; set; } = 5000;
}

public sealed class AlertOptions
{
    /// <summary>Share of a family's daily budget, in percent, from which spend is reported.</summary>
    public int BudgetWarningPercent { get; set; } = 80;

    /// <summary>Share of the last hour's provider calls, in percent, that may be rejected by the output gate.</summary>
    public int RejectionRatePercent { get; set; } = 30;

    /// <summary>Share of the last hour's provider calls, in percent, that may fail.</summary>
    public int FailureRatePercent { get; set; } = 30;

    /// <summary>Below this many calls in the hour a rate is not evaluated.</summary>
    public int MinimumSample { get; set; } = 10;

    public int MaintenanceMissingHours { get; set; } = 48;
}

/// <summary>The only place that decides whether an account is an operator or an internal account.</summary>
public sealed class OperatorAccess(IOptionsMonitor<OperationsOptions> options)
{
    public bool IsOperator(string phoneNumber) =>
        options.CurrentValue.OperatorPhones.Contains(phoneNumber, StringComparer.Ordinal);

    /// <summary>Operators are internal accounts too: their activity never enters a primary metric.</summary>
    public string[] ExcludedPhones() =>
        options.CurrentValue.OperatorPhones.Concat(options.CurrentValue.InternalPhones).Distinct().ToArray();
}
