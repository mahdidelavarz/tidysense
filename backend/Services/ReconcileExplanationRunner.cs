using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.DTOs.Reconcile;
using TidySense.Models;
using TidySense.Services.Ai;

namespace TidySense.Services;

/// <summary>What one queued explanation needs. The evidence was derived when the request was accepted.</summary>
public sealed record ReconcileExplanationWorkItem(
    Guid ExplanationId,
    Guid UserId,
    Guid SessionId,
    ReconcileExplanationInput Input);

/// <summary>In-process hand-off from the request that accepts an explanation to the worker that runs it.</summary>
public sealed class ReconcileExplanationQueue
{
    private readonly Channel<ReconcileExplanationWorkItem> _channel = Channel.CreateUnbounded<ReconcileExplanationWorkItem>();

    public void Enqueue(ReconcileExplanationWorkItem item) => _channel.Writer.TryWrite(item);

    public IAsyncEnumerable<ReconcileExplanationWorkItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

public sealed class ReconcileExplanationWorker(
    ReconcileExplanationQueue queue,
    IServiceScopeFactory scopes,
    ILogger<ReconcileExplanationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var item in queue.ReadAllAsync(stoppingToken))
            _ = Task.Run(() => RunAsync(item, stoppingToken), stoppingToken);
    }

    private async Task RunAsync(ReconcileExplanationWorkItem item, CancellationToken stoppingToken)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<ReconcileExplanationRunner>().RunAsync(item, stoppingToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError("Reconcile explanation run failed. ExceptionType: {ExceptionType}, ExplanationId: {ExplanationId}",
                exception.GetType().Name, item.ExplanationId);
        }
    }
}

/// <summary>
/// Runs one explanation: explain, validate against the evidence that was supplied, and only then
/// attach it. A result that arrives after a cancellation, or for a session that is no longer
/// open, is discarded. A failure leaves the session exactly as it was.
/// </summary>
public sealed class ReconcileExplanationRunner(
    AppDbContext db,
    IReconcileExplainer explainer,
    PlanningAttemptCancellation cancellations,
    ApplicationDateService dates,
    EventPayloadValidator events,
    ILogger<ReconcileExplanationRunner> logger)
{
    // Longer than the AI operation deadline, so the runtime's own timeout is the one that reports.
    public static readonly TimeSpan ExplanationTimeout = TimeSpan.FromSeconds(90);

    public async Task RunAsync(ReconcileExplanationWorkItem item, CancellationToken stoppingToken)
    {
        if (!await db.ReconcileExplanations.AsNoTracking().AnyAsync(x => x.Id == item.ExplanationId &&
                x.Status == ReconcileExplanationStatuses.Running, stoppingToken)) return;

        ReconcileExplanationContent? content = null;
        string? failure = null;
        using var running = cancellations.Register(item.ExplanationId, stoppingToken);
        try
        {
            running.CancelAfter(ExplanationTimeout);
            content = await explainer.ExplainAsync(
                new ReconcileExplanationRequest(item.ExplanationId, item.UserId, item.Input.Context), running.Token);
            // Whoever produced it, an explanation is usable only inside the evidence it was given.
            if (ReconcileExplanationGate.Validate(content, item.Input.Context) is not null)
                failure = ReconcileExplanationFailureCodes.ExplanationInvalid;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }
        catch (OperationCanceledException)
        {
            // The timeout, or a cancellation; a cancelled explanation is recognised when it is completed.
            failure = ReconcileExplanationFailureCodes.GenerationTimeout;
        }
        catch (ReconcileExplanationException exception)
        {
            failure = exception.FailureCode;
        }
        catch (Exception exception)
        {
            failure = ReconcileExplanationFailureCodes.ProviderError;
            logger.LogWarning("Reconcile explanation failed. ExceptionType: {ExceptionType}, ExplanationId: {ExplanationId}",
                exception.GetType().Name, item.ExplanationId);
        }
        finally
        {
            cancellations.Remove(item.ExplanationId);
        }
        await CompleteAsync(item, content, failure, stoppingToken);
    }

    private async Task CompleteAsync(ReconcileExplanationWorkItem item, ReconcileExplanationContent? content,
        string? failure, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var explanation = await db.ReconcileExplanations.FromSqlInterpolated($"SELECT * FROM \"ReconcileExplanations\" WHERE \"Id\" = {item.ExplanationId} FOR UPDATE")
            .SingleAsync(cancellationToken);
        if (explanation.Status != ReconcileExplanationStatuses.Running)
        {
            logger.LogInformation("Late Reconcile explanation discarded. ExplanationId: {ExplanationId}, Status: {Status}",
                explanation.Id, explanation.Status);
            return;
        }

        var now = dates.UtcNow;
        explanation.CompletedAt = now;
        var sessionOpen = await db.ReconcileSessions.AsNoTracking().AnyAsync(x => x.Id == item.SessionId &&
            x.Status == ReconcileSessionStatuses.Open, cancellationToken);
        // This explanation, ready or failed, is now the one shown: what an earlier one proposed is over.
        if (sessionOpen)
            await ReconcileExplanationService.ExpireUndecidedAsync(db.ReconcileRecommendations.Where(x =>
                x.ExplanationRecord.SessionId == item.SessionId && x.ExplanationId != explanation.Id), now,
                cancellationToken);
        // A result for a session that already closed has nowhere to attach.
        if (!sessionOpen) explanation.Status = ReconcileExplanationStatuses.Cancelled;
        else if (failure is not null)
        {
            explanation.Status = ReconcileExplanationStatuses.Failed;
            explanation.FailureCode = failure;
        }
        else
        {
            explanation.Status = ReconcileExplanationStatuses.Ready;
            explanation.Summary = content!.Summary;
            var targets = item.Input.Targets.ToDictionary(x => x.Ref, StringComparer.Ordinal);
            var facts = item.Input.Context.Units.ToDictionary(x => x.Ref, StringComparer.Ordinal);
            var ordinal = 0;
            foreach (var proposed in content.Recommendations)
            {
                var units = proposed.UnitRefs.Select(x => targets[x]).ToArray();
                var recommendation = new ReconcileRecommendation
                {
                    Id = Guid.NewGuid(), ExplanationId = explanation.Id, UserId = explanation.UserId,
                    Ordinal = ++ordinal, RuleId = proposed.RuleId,
                    RuleVersion = item.Input.Context.RulesCatalogVersion, ActionType = proposed.ActionType,
                    SequenceId = units[0].SequenceId, TaskIds = units.SelectMany(x => x.TaskIds).ToArray(),
                    EvidenceFingerprint = ReconcileExplanationContextBuilder.Fingerprint(units),
                    Explanation = proposed.Explanation,
                    EvidenceJson = JsonSerializer.Serialize(units.Select(x => Evidence(x, facts[x.Ref])))
                };
                db.ReconcileRecommendations.Add(recommendation);
                ReconcileRecommendationEvents.Add(db, events, recommendation, item.SessionId,
                    EventActors.SystemDeterministic, ReconcileEventTypes.RecommendationPresented,
                    JsonSerializer.Serialize(new
                    {
                        actionType = proposed.ActionType, unitCount = units.Length, explainer = explanation.ExplainerKey
                    }), now);
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        logger.LogInformation(
            "Reconcile explanation completed. ExplanationId: {ExplanationId}, Status: {Status}, FailureCode: {FailureCode}",
            explanation.Id, explanation.Status, explanation.FailureCode);
    }

    /// <summary>The facts of one recommended unit, copied from the evidence the explanation was given.</summary>
    private static ReconcileRecommendationEvidenceDto Evidence(ReconcileExplanationTarget target,
        ReconcileExplanationUnit unit) => new(unit.Kind, target.TaskIds, target.SequenceId, unit.ReasonCodes,
        unit.RuleIds, unit.AllowedActions, unit.AgeDays, unit.CarryCount, unit.IsProtected, unit.DaysToDeadline,
        unit.MemberCount, unit.BlockedMemberCount, unit.HasDroppedPredecessor, "SUFFICIENT");
}
