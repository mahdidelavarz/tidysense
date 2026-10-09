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

    public AlertDigestOptions AlertDigest { get; set; } = new();
}

/// <summary>Durations per 019C class, fixed for the pilot and stated in the privacy notice. R1 is never purged.</summary>
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

/// <summary>
/// The daily e-mail that carries alerts outside the application. It is sent every day, also when
/// nothing was raised, so a day without it means the backend or the mail path is down.
/// </summary>
public sealed class AlertDigestOptions
{
    public bool Enabled { get; set; }

    /// <summary>The UTC hour from which the day's digest is sent.</summary>
    public int HourUtc { get; set; } = 4;

    public string To { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool SmtpTls { get; set; } = true;
}

/// <summary>What pilot participants are told and how they reach the operator.</summary>
public sealed class PilotOptions
{
    public const string SectionName = "Pilot";

    /// <summary>The channel a participant uses for support and to ask for their account to be erased.</summary>
    public string SupportContact { get; set; } = string.Empty;

    /// <summary>
    /// The time inside which an erasure is complete everywhere. Logs and backups are kept no
    /// longer than this, so nothing about an erased account outlives it.
    /// </summary>
    public int ErasureCompletionDays { get; set; } = 30;
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
