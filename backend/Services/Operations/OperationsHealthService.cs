using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.DTOs.Operations;
using TidySense.Models;
using TidySense.Services.Ai;

namespace TidySense.Services.Operations;

/// <summary>
/// The operational view of the AI runtime and of maintenance: switches, limits, spend, call
/// results and alerts. It reads metadata only; no prompt, response or user text exists to read.
/// </summary>
public sealed class OperationsHealthService(
    AppDbContext db,
    ApplicationDateService dates,
    IOptionsMonitor<AiOptions> ai,
    IOptionsMonitor<OperationsOptions> options,
    AiRuntimeState runtime)
{
    // In flight for longer than any generation may take.
    private static readonly TimeSpan StuckAfter = TimeSpan.FromMinutes(3);

    public async Task<OperationsAiDto> AiAsync(DateTimeOffset from, DateTimeOffset to,
        CancellationToken cancellationToken)
    {
        var calls = await db.Database.SqlQuery<AiCallSummaryDto>($"""
            SELECT "Family" AS "Family", COUNT(*)::int AS "Calls",
                   COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY "LatencyMs"), 0)::int AS "LatencyP50Ms",
                   COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY "LatencyMs"), 0)::int AS "LatencyP95Ms",
                   COALESCE(SUM("InputTokens"), 0)::bigint AS "InputTokens",
                   COALESCE(SUM("OutputTokens"), 0)::bigint AS "OutputTokens",
                   COALESCE(SUM("EstimatedCostMicros"), 0)::bigint AS "CostMicros"
            FROM "AiInvocations"
            WHERE "Sequence" > 0 AND "StartedAt" >= {from} AND "StartedAt" < {to}
            GROUP BY "Family" ORDER BY "Family"
            """).ToListAsync(cancellationToken);
        var outcomes = await db.AiInvocations.AsNoTracking()
            .Where(x => x.StartedAt >= from && x.StartedAt < to)
            .GroupBy(x => new { x.Family, x.Outcome, x.FailureClass, x.Gate })
            .Select(x => new AiOutcomeDto(x.Key.Family, x.Key.Outcome, x.Key.FailureClass, x.Key.Gate, x.Count()))
            .ToListAsync(cancellationToken);
        return new OperationsAiDto(from, to, ai.CurrentValue.GlobalKillSwitch,
            await FamiliesAsync(cancellationToken), calls,
            outcomes.OrderBy(x => x.Family).ThenBy(x => x.Outcome).ThenBy(x => x.FailureClass).ThenBy(x => x.Gate)
                .ToArray());
    }

    public async Task<OperationsHealthDto> HealthAsync(CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var stuckBefore = now - StuckAfter;
        var hourAgo = now.AddHours(-1);
        var stuckExplanations = await db.ReconcileExplanations.CountAsync(x =>
            x.Status == ReconcileExplanationStatuses.Running && x.CreatedAt < stuckBefore, cancellationToken);
        var stuckAttempts = await db.PlanningAttempts.CountAsync(x => x.UpdatedAt < stuckBefore &&
            (x.Status == PlanningAttemptStatuses.Queued || x.Status == PlanningAttemptStatuses.Running),
            cancellationToken);
        var lastRun = await db.OperationsRecords.AsNoTracking()
            .Where(x => x.Kind == OperationsRecordKinds.MaintenanceRun)
            .OrderByDescending(x => x.CreatedAt).Select(x => new { x.CreatedAt, x.Outcome })
            .FirstOrDefaultAsync(cancellationToken);
        // The daily e-mail is the only path out of the application; a failed send is itself an alert.
        var lastDigestOutcome = await db.OperationsRecords.AsNoTracking()
            .Where(x => x.Kind == OperationsRecordKinds.AlertDigest)
            .OrderByDescending(x => x.CreatedAt).Select(x => x.Outcome).FirstOrDefaultAsync(cancellationToken);
        var lastHour = await db.AiInvocations.AsNoTracking()
            .Where(x => x.Sequence > 0 && x.StartedAt >= hourAgo)
            .GroupBy(x => x.Family)
            .Select(x => new
            {
                Family = x.Key, Calls = x.Count(),
                Rejected = x.Count(i => i.Outcome == AiInvocationOutcomes.Rejected),
                Failed = x.Count(i => i.Outcome == AiInvocationOutcomes.Failed)
            }).ToDictionaryAsync(x => x.Family, cancellationToken);

        var families = (await FamiliesAsync(cancellationToken)).Select(x =>
        {
            var hour = lastHour.GetValueOrDefault(x.Family);
            return new AlertFamilyInput(x.Family, x.KillSwitch, x.ProviderDisabled, x.CircuitOpen, x.SpendLatched,
                x.SpentTodayMicros, x.Sample ? 0 : x.DailyBudgetMicros, hour?.Calls ?? 0, hour?.Rejected ?? 0,
                hour?.Failed ?? 0);
        }).ToArray();
        var alerts = OperationsAlertRules.Evaluate(new AlertInput(now, ai.CurrentValue.GlobalKillSwitch, families,
            stuckExplanations, stuckAttempts, lastRun?.CreatedAt, lastRun?.Outcome,
            options.CurrentValue.AlertDigest.Enabled && lastDigestOutcome == OperationsRecordOutcomes.Failed),
            options.CurrentValue.Alerts);
        return new OperationsHealthDto(alerts, lastRun?.CreatedAt, lastRun?.Outcome, stuckExplanations,
            stuckAttempts, await db.OutboxMessages.CountAsync(x => x.Status == "PENDING", cancellationToken));
    }

    private async Task<AiFamilyStateDto[]> FamiliesAsync(CancellationToken cancellationToken)
    {
        var settings = ai.CurrentValue;
        var now = dates.UtcNow;
        var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var spent = await db.AiInvocations.AsNoTracking().Where(x => x.StartedAt >= dayStart)
            .GroupBy(x => x.Family).Select(x => new { Family = x.Key, Micros = x.Sum(i => i.EstimatedCostMicros) })
            .ToDictionaryAsync(x => x.Family, x => x.Micros, cancellationToken);
        return
        [
            Family(AiPlanningGenerator.Family, settings.Planning),
            Family(AiReconcileExplainer.Family, settings.Reconcile)
        ];

        AiFamilyStateDto Family(string family, AiFamilyOptions value)
        {
            var sample = string.IsNullOrWhiteSpace(value.Provider) ||
                value.Provider.Equals(AiFamilyOptions.MockProvider, StringComparison.OrdinalIgnoreCase);
            var provider = sample ? AiFamilyOptions.MockProvider : value.Provider;
            return new AiFamilyStateDto(family, provider, sample, value.KillSwitch, value.RetryEnabled,
                !sample && settings.Providers.TryGetValue(provider, out var configured) && configured.Disabled,
                !sample && runtime.IsCircuitOpen(AiRuntimeState.CircuitKey(provider, family)),
                !sample && runtime.IsSpendLatched(provider),
                spent.GetValueOrDefault(family), (long)(value.DailyBudgetUsd * 1_000_000m));
        }
    }
}
