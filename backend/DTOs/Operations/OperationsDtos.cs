namespace TidySense.DTOs.Operations;

/// <summary>One row of a metric: a count over its population, never a bare rate.</summary>
public sealed record MetricRowDto(string Segment, long Numerator, long Denominator);

public sealed record MetricResultDto(string Id, int DefinitionVersion, string Hypothesis, string MetricClass,
    string Numerator, string Denominator, IReadOnlyList<MetricRowDto> Rows);

/// <summary>A required metric the product cannot compute: it comes from a research instrument.</summary>
public sealed record ExternalMetricDto(string Id, string Hypothesis, string Instrument);

/// <summary>
/// H1/H2 evidence for a window. Internal accounts are reported apart and never enter the primary
/// rows. Everything is an aggregate: no user, entity or text is identified.
/// </summary>
public sealed record OperationsMetricsDto(string CatalogVersion, DateTimeOffset From, DateTimeOffset To,
    IReadOnlyList<MetricResultDto> Primary, IReadOnlyList<MetricResultDto> Internal,
    IReadOnlyList<ExternalMetricDto> External);

public sealed record AiFamilyStateDto(string Family, string Provider, bool Sample, bool KillSwitch,
    bool RetryEnabled, bool ProviderDisabled, bool CircuitOpen, bool SpendLatched, long SpentTodayMicros,
    long DailyBudgetMicros);

public sealed record AiCallSummaryDto(string Family, int Calls, int LatencyP50Ms, int LatencyP95Ms,
    long InputTokens, long OutputTokens, long CostMicros);

/// <summary>Operation steps by result. Sequence 0 rows are operations that were blocked before a call.</summary>
public sealed record AiOutcomeDto(string Family, string Outcome, string? FailureClass, string? Gate, int Count);

public sealed record OperationsAiDto(DateTimeOffset From, DateTimeOffset To, bool GlobalKillSwitch,
    IReadOnlyList<AiFamilyStateDto> Families, IReadOnlyList<AiCallSummaryDto> Calls,
    IReadOnlyList<AiOutcomeDto> Outcomes);

public sealed record OperationsAlertDto(string Rule, string Severity, string Scope, long Value, long Threshold);

public sealed record OperationsHealthDto(IReadOnlyList<OperationsAlertDto> Alerts,
    DateTimeOffset? LastMaintenanceAt, string? LastMaintenanceOutcome, int StuckExplanations,
    int StuckPlanningAttempts, int PendingOutboxMessages);
