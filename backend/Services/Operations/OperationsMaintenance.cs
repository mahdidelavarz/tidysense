using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services.Operations;

/// <summary>
/// One maintenance run: close work whose process was lost, purge what its retention class no
/// longer keeps, and report active alerts. It never touches R1 evidence or canonical state.
/// </summary>
public sealed class OperationsMaintenance(
    AppDbContext db,
    ApplicationDateService dates,
    IOptionsMonitor<OperationsOptions> options,
    OperationsHealthService health,
    ILogger<OperationsMaintenance> logger)
{
    public async Task<IReadOnlyDictionary<string, int>> RunAsync(CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var counts = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["lostExplanations"] = await ReconcileExplanationService.CloseLostAsync(db, null, now, cancellationToken),
            ["lostPlanningAttempts"] = await PlanningService.CloseStaleAsync(db, null, now, cancellationToken)
        };
        var retention = options.CurrentValue.Retention;
        if (retention.Enabled)
        {
            // Each statement removes at most one batch, oldest first; whatever is left is taken by the next run.
            var batch = Math.Max(1, retention.BatchSize);
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
            await PurgeDiagnosticsAsync(now.AddDays(-retention.R4Days), now, batch, counts, cancellationToken);
            await PurgeDraftsAsync(now.AddDays(-retention.R3DaysAfterExpiry), batch, counts, cancellationToken);
            await PurgeSessionsAsync(now.AddDays(-retention.R2DaysAfterClose), batch, counts, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        var record = new OperationsRecord
        {
            Id = Guid.NewGuid(), Kind = OperationsRecordKinds.MaintenanceRun, CreatedAt = now,
            DetailsJson = JsonSerializer.Serialize(new { retentionEnabled = retention.Enabled, counts })
        };
        db.OperationsRecords.Add(record);
        await db.SaveChangesAsync(cancellationToken);

        // Evaluated after the run is recorded, because the maintenance rules read that record.
        var alerts = (await health.HealthAsync(cancellationToken)).Alerts;
        foreach (var alert in alerts)
            logger.LogWarning(
                "OPS_ALERT. Rule: {Rule}, Severity: {Severity}, Scope: {Scope}, Value: {Value}, Threshold: {Threshold}",
                alert.Rule, alert.Severity, alert.Scope, alert.Value, alert.Threshold);
        // The run keeps what it raised, so the daily digest can report alerts that have cleared since.
        record.DetailsJson = JsonSerializer.Serialize(new { retentionEnabled = retention.Enabled, counts, alerts },
            OperationsAlertDigest.Json);
        await db.SaveChangesAsync(cancellationToken);
        return counts;
    }

    /// <summary>R4: operational diagnostics. The R1 events and results they refer to stay.</summary>
    private async Task PurgeDiagnosticsAsync(DateTimeOffset before, DateTimeOffset now, int batch,
        Dictionary<string, int> counts, CancellationToken cancellationToken)
    {
        counts["aiInvocations"] = await db.AiInvocations.Where(x => x.StartedAt < before)
            .OrderBy(x => x.StartedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
        counts["idempotencyRecords"] = await db.IdempotencyRecords
            .Where(x => x.Status != "IN_PROGRESS" && x.ExpiresAt < now && x.CreatedAt < before)
            .OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
        counts["outboxMessages"] = await db.OutboxMessages.Where(x => x.CreatedAt < before)
            .OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
        counts["otpChallenges"] = await db.OtpChallenges.Where(x => x.CreatedAt < before)
            .OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
        // Maintenance runs and alert digests; an erasure record is kept.
        counts["maintenanceRuns"] = await db.OperationsRecords
            .Where(x => x.Kind != OperationsRecordKinds.UserErasure && x.CreatedAt < before)
            .OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
    }

    /// <summary>R3: drafts that ended, their revisions and confirmations, then the attempts nothing refers to.</summary>
    private async Task PurgeDraftsAsync(DateTimeOffset before, int batch, Dictionary<string, int> counts,
        CancellationToken cancellationToken)
    {
        var drafts = await db.PlanningDrafts
            .Where(x => x.Status != PlanningDraftStatuses.Reviewable && x.UpdatedAt < before)
            .OrderBy(x => x.UpdatedAt).Select(x => x.Id).Take(batch).ToArrayAsync(cancellationToken);
        counts["planningConfirmations"] = await db.ActionConfirmations
            .Where(x => x.PlanningDraftId != null && drafts.Contains(x.PlanningDraftId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        counts["planningDrafts"] = await db.PlanningDrafts.Where(x => drafts.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);

        // An attempt stays while a draft or a newer attempt of its flow that is not yet due still refers to it.
        var attempts = await db.PlanningAttempts
            .Where(x => x.CompletedAt < before &&
                !db.PlanningDrafts.Any(d => d.AttemptId == x.Id) &&
                !db.PlanningAttempts.Any(c => c.PreviousAttemptId == x.Id && !(c.CompletedAt < before)))
            .OrderBy(x => x.CompletedAt).Select(x => x.Id).Take(batch).ToArrayAsync(cancellationToken);
        // The rows about to go are unlinked from each other first, so their order does not matter.
        await db.PlanningAttempts.Where(x => attempts.Contains(x.Id) && x.PreviousAttemptId != null)
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.PreviousAttemptId, (Guid?)null)
                .SetProperty(a => a.ClarificationTurn, 0), cancellationToken);
        // An attempt whose answering attempt fell outside this batch waits for the next run.
        counts["planningAttempts"] = await db.PlanningAttempts
            .Where(x => attempts.Contains(x.Id) && !db.PlanningAttempts.Any(c => c.PreviousAttemptId == x.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    /// <summary>R2: closed sessions with their facts, rule matches, explanations, recommendations and confirmations; pilot answers.</summary>
    private async Task PurgeSessionsAsync(DateTimeOffset before, int batch, Dictionary<string, int> counts,
        CancellationToken cancellationToken)
    {
        var sessions = await db.ReconcileSessions
            .Where(x => x.Status != ReconcileSessionStatuses.Open && x.CompletedAt < before)
            .OrderBy(x => x.CompletedAt).Select(x => x.Id).Take(batch).ToArrayAsync(cancellationToken);
        counts["reconcileConfirmations"] = await db.ActionConfirmations
            .Where(x => x.ReconcileSessionId != null && sessions.Contains(x.ReconcileSessionId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        counts["reconcileSessions"] = await db.ReconcileSessions.Where(x => sessions.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);
        var beforeDate = dates.LocalDateOf(before);
        counts["reconcilePrompts"] = await db.ReconcilePrompts.Where(x => x.LocalDate < beforeDate)
            .OrderBy(x => x.LocalDate).Take(batch).ExecuteDeleteAsync(cancellationToken);
        counts["reconcileExposures"] = await db.ReconcileExposures.Where(x => x.FirstSeenAt < before)
            .OrderBy(x => x.FirstSeenAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
        counts["pilotFeedbackResponses"] = await db.PilotFeedbackResponses.Where(x => x.CreatedAt < before)
            .OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(cancellationToken);
    }
}

/// <summary>Runs maintenance shortly after start and then every hour. A failed run is recorded and retried next hour.</summary>
public sealed class OperationsMaintenanceService(
    IServiceScopeFactory scopes,
    TimeProvider time,
    ILogger<OperationsMaintenanceService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
            do
            {
                await RunOnceAsync(stoppingToken);
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // The host is stopping.
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<OperationsMaintenance>().RunAsync(stoppingToken);
        }
        catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
        {
            logger.LogError("Operations maintenance failed. ExceptionType: {ExceptionType}", exception.GetType().Name);
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.OperationsRecords.Add(new OperationsRecord
                {
                    Id = Guid.NewGuid(), Kind = OperationsRecordKinds.MaintenanceRun,
                    Outcome = OperationsRecordOutcomes.Failed, CreatedAt = time.GetUtcNow(),
                    DetailsJson = JsonSerializer.Serialize(new { exceptionType = exception.GetType().Name })
                });
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception recording) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError("Operations maintenance failure could not be recorded. ExceptionType: {ExceptionType}",
                    recording.GetType().Name);
            }
        }
    }
}
