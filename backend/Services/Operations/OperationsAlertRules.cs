using TidySense.DTOs.Operations;

namespace TidySense.Services.Operations;

public sealed record AlertFamilyInput(string Family, bool KillSwitch, bool ProviderDisabled, bool CircuitOpen,
    bool SpendLatched, long SpentTodayMicros, long DailyBudgetMicros, int CallsLastHour, int RejectedLastHour,
    int FailedLastHour);

public sealed record AlertInput(DateTimeOffset Now, bool GlobalKillSwitch, IReadOnlyList<AlertFamilyInput> Families,
    int StuckExplanations, int StuckPlanningAttempts, DateTimeOffset? LastMaintenanceAt,
    string? LastMaintenanceOutcome, bool AlertDigestFailed = false);

public static class OperationsAlertSeverities
{
    public const string Warning = "WARNING";
    public const string Critical = "CRITICAL";
}

/// <summary>
/// The alert rules. Pure: the same input always raises the same alerts. Each rule's owner,
/// consumer and response are in <c>devmap/operations/runbooks.md</c>.
/// </summary>
public static class OperationsAlertRules
{
    public const string KillSwitchActive = "AI_KILL_SWITCH_ACTIVE";
    public const string SpendCapLatched = "AI_PROVIDER_SPEND_CAP_LATCHED";
    public const string CircuitOpen = "AI_CIRCUIT_OPEN";
    public const string BudgetNearLimit = "AI_BUDGET_NEAR_LIMIT";
    public const string BudgetExhausted = "AI_BUDGET_EXHAUSTED";
    public const string RejectionRate = "AI_OUTPUT_REJECTION_RATE";
    public const string FailureRate = "AI_PROVIDER_FAILURE_RATE";
    public const string WorkStuck = "AI_WORK_STUCK_RUNNING";
    public const string MaintenanceFailed = "MAINTENANCE_FAILED";
    public const string MaintenanceMissing = "MAINTENANCE_MISSING";
    public const string AlertDigestFailed = "ALERT_DIGEST_FAILED";

    public static IReadOnlyList<OperationsAlertDto> Evaluate(AlertInput input, AlertOptions thresholds)
    {
        var alerts = new List<OperationsAlertDto>();
        if (input.GlobalKillSwitch)
            alerts.Add(new(KillSwitchActive, OperationsAlertSeverities.Warning, "GLOBAL", 1, 0));
        foreach (var family in input.Families)
        {
            if (family.KillSwitch || family.ProviderDisabled)
                alerts.Add(new(KillSwitchActive, OperationsAlertSeverities.Warning, family.Family, 1, 0));
            if (family.SpendLatched)
                alerts.Add(new(SpendCapLatched, OperationsAlertSeverities.Critical, family.Family, 1, 0));
            if (family.CircuitOpen)
                alerts.Add(new(CircuitOpen, OperationsAlertSeverities.Warning, family.Family, 1, 0));
            if (family.DailyBudgetMicros > 0)
            {
                var warnAt = family.DailyBudgetMicros * thresholds.BudgetWarningPercent / 100;
                if (family.SpentTodayMicros >= family.DailyBudgetMicros)
                    alerts.Add(new(BudgetExhausted, OperationsAlertSeverities.Critical, family.Family,
                        family.SpentTodayMicros, family.DailyBudgetMicros));
                else if (family.SpentTodayMicros >= warnAt)
                    alerts.Add(new(BudgetNearLimit, OperationsAlertSeverities.Warning, family.Family,
                        family.SpentTodayMicros, warnAt));
            }
            // A rate over a handful of calls says nothing.
            if (family.CallsLastHour < Math.Max(1, thresholds.MinimumSample)) continue;
            if (family.RejectedLastHour * 100 >= family.CallsLastHour * thresholds.RejectionRatePercent)
                alerts.Add(new(RejectionRate, OperationsAlertSeverities.Warning, family.Family,
                    family.RejectedLastHour * 100L / family.CallsLastHour, thresholds.RejectionRatePercent));
            if (family.FailedLastHour * 100 >= family.CallsLastHour * thresholds.FailureRatePercent)
                alerts.Add(new(FailureRate, OperationsAlertSeverities.Warning, family.Family,
                    family.FailedLastHour * 100L / family.CallsLastHour, thresholds.FailureRatePercent));
        }
        var stuck = input.StuckExplanations + input.StuckPlanningAttempts;
        if (stuck > 0) alerts.Add(new(WorkStuck, OperationsAlertSeverities.Warning, "ALL", stuck, 0));
        if (input.LastMaintenanceOutcome == Models.OperationsRecordOutcomes.Failed)
            alerts.Add(new(MaintenanceFailed, OperationsAlertSeverities.Critical, "MAINTENANCE", 1, 0));
        var missingAfter = TimeSpan.FromHours(thresholds.MaintenanceMissingHours);
        if (input.LastMaintenanceAt is not { } last || input.Now - last > missingAfter)
            alerts.Add(new(MaintenanceMissing, OperationsAlertSeverities.Warning, "MAINTENANCE",
                input.LastMaintenanceAt is { } at ? (long)(input.Now - at).TotalHours : -1,
                thresholds.MaintenanceMissingHours));
        if (input.AlertDigestFailed)
            alerts.Add(new(AlertDigestFailed, OperationsAlertSeverities.Warning, "ALERT_DIGEST", 1, 0));
        return alerts;
    }
}
