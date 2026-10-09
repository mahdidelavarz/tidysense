using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>What one queued generation needs. The context was built when the attempt was accepted.</summary>
public sealed record PlanningWorkItem(
    Guid AttemptId,
    Guid UserId,
    string Intention,
    PlanningContext Context,
    string? Fixture,
    IReadOnlyList<PlanningTurn> Turns,
    bool AllowClarification);

/// <summary>
/// Lets a cancellation reach the generation that is running for an attempt, so a provider call is
/// abandoned instead of waited for. The attempt's stored status stays the authority: a result that
/// arrives anyway is still discarded.
/// </summary>
public sealed class PlanningAttemptCancellation
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, CancellationTokenSource> _running = new();

    public CancellationTokenSource Register(Guid attemptId, CancellationToken stoppingToken)
    {
        var source = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        _running[attemptId] = source;
        return source;
    }

    public void Cancel(Guid attemptId)
    {
        if (!_running.TryGetValue(attemptId, out var source)) return;
        try
        {
            source.Cancel();
        }
        catch (ObjectDisposedException)
        {
            // The generation finished at the same moment.
        }
    }

    public void Remove(Guid attemptId) => _running.TryRemove(attemptId, out _);
}

/// <summary>In-process hand-off from the request that accepts an attempt to the worker that runs it.</summary>
public sealed class PlanningAttemptQueue
{
    private readonly Channel<PlanningWorkItem> _channel = Channel.CreateUnbounded<PlanningWorkItem>();

    public void Enqueue(PlanningWorkItem item) => _channel.Writer.TryWrite(item);

    public IAsyncEnumerable<PlanningWorkItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

public sealed class PlanningAttemptWorker(
    PlanningAttemptQueue queue,
    IServiceScopeFactory scopes,
    ILogger<PlanningAttemptWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Attempts run side by side so one slow generation never holds back another user's.
        await foreach (var item in queue.ReadAllAsync(stoppingToken))
            _ = Task.Run(() => RunAsync(item, stoppingToken), stoppingToken);
    }

    private async Task RunAsync(PlanningWorkItem item, CancellationToken stoppingToken)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<PlanningAttemptRunner>().RunAsync(item, stoppingToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError("Planning attempt run failed. ExceptionType: {ExceptionType}, AttemptId: {AttemptId}",
                exception.GetType().Name, item.AttemptId);
        }
    }
}

/// <summary>
/// Runs one attempt: generate, check the output came from the supplied context, repair once,
/// validate, and only then store a reviewable draft. A result that arrives after the attempt was
/// cancelled is discarded. Partial or invalid output never becomes a draft.
/// </summary>
public sealed class PlanningAttemptRunner(
    AppDbContext db,
    IPlanningGenerator generator,
    PlanningAttemptCancellation cancellations,
    ApplicationDateService dates,
    AiConsentPolicy consent,
    ILogger<PlanningAttemptRunner> logger)
{
    // Longer than the AI operation deadline, so the runtime's own timeout is the one that reports.
    public static readonly TimeSpan GenerationTimeout = TimeSpan.FromSeconds(120);
    public static readonly TimeSpan DraftLifetime = TimeSpan.FromHours(24);

    public async Task RunAsync(PlanningWorkItem item, CancellationToken stoppingToken)
    {
        var startedAt = dates.UtcNow;
        var started = await db.PlanningAttempts
            .Where(x => x.Id == item.AttemptId && x.Status == PlanningAttemptStatuses.Queued)
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.Status, PlanningAttemptStatuses.Running)
                .SetProperty(a => a.UpdatedAt, startedAt), stoppingToken);
        if (started == 0) return;

        PlanningDraftContent? content = null;
        PlanningClarification? clarification = null;
        var outcome = PlanningOutcomes.Draft;
        string? failure = null;
        using var running = cancellations.Register(item.AttemptId, stoppingToken);
        try
        {
            running.CancelAfter(GenerationTimeout);
            // Checked again where the text would leave: consent may have been withdrawn since the attempt was queued.
            await AiConsentService.RequireAsync(db, consent, item.UserId, running.Token);
            var result = await generator.GenerateAsync(
                new PlanningGenerationRequest(item.AttemptId, item.Intention, item.Context, item.Fixture)
                {
                    Turns = item.Turns, AllowClarification = item.AllowClarification, UserId = item.UserId
                }, running.Token);
            outcome = result.Outcome;
            if (result.ContextFingerprint != item.Context.Fingerprint) failure = PlanningFailureCodes.ContextIntegrity;
            else if (outcome == PlanningOutcomes.Draft)
            {
                content = result.Draft is null ? null : Validated(result.Draft, item.Context);
                if (content is null) failure = PlanningFailureCodes.DraftInvalid;
            }
            // A question after the turn budget or after "draft now" is not a usable result.
            else if ((outcome == PlanningOutcomes.Clarification && !item.AllowClarification) ||
                !PlanningClarificationRules.IsValid(outcome, result.Clarification))
                failure = PlanningFailureCodes.DraftInvalid;
            else clarification = result.Clarification;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }
        catch (OperationCanceledException)
        {
            // The timeout, or a cancellation; a cancelled attempt is recognised when it is completed.
            failure = PlanningFailureCodes.GenerationTimeout;
        }
        catch (PlanningGenerationException exception)
        {
            failure = exception.FailureCode;
        }
        catch (AiConsentRequiredException)
        {
            failure = PlanningFailureCodes.ConsentRequired;
        }
        catch (Exception exception)
        {
            failure = PlanningFailureCodes.ProviderError;
            logger.LogWarning("Planning generation failed. ExceptionType: {ExceptionType}, AttemptId: {AttemptId}",
                exception.GetType().Name, item.AttemptId);
        }
        finally
        {
            cancellations.Remove(item.AttemptId);
        }
        await CompleteAsync(item, content, outcome, clarification, failure, stoppingToken);
    }

    /// <summary>
    /// The repair is a normalisation that leaves valid content unchanged, so applying it before
    /// the structural check is the same as validate, repair once, revalidate. Null when the
    /// output is still not a usable draft.
    /// </summary>
    private static PlanningDraftContent? Validated(PlanningDraftContent draft, PlanningContext context)
    {
        try
        {
            // The window is the server's, whatever the generator returned.
            var repaired = PlanningDraftRules.Repair(
                draft with { WindowStart = context.WindowStart, WindowEnd = context.WindowEnd }, context.Today);
            return PlanningDraftRules.StructuralErrors(repaired, context.Scope?.Type).Count == 0 ? repaired : null;
        }
        catch (Exception exception) when (exception is NullReferenceException or ArgumentException
            or KeyNotFoundException or InvalidOperationException)
        {
            return null;
        }
    }

    private async Task CompleteAsync(PlanningWorkItem item, PlanningDraftContent? content, string outcome,
        PlanningClarification? clarification, string? failure, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var attempt = await db.PlanningAttempts.FromSqlInterpolated($"SELECT * FROM \"PlanningAttempts\" WHERE \"Id\" = {item.AttemptId} FOR UPDATE")
            .SingleAsync(cancellationToken);
        if (attempt.Status != PlanningAttemptStatuses.Running)
        {
            logger.LogInformation("Late planning result discarded. AttemptId: {AttemptId}, Status: {Status}",
                attempt.Id, attempt.Status);
            return;
        }

        var now = dates.UtcNow;
        if (failure is null && clarification is not null)
        {
            // Questions or a blocked input: the attempt is finished and nothing reviewable exists.
            attempt.UpdatedAt = now;
            attempt.CompletedAt = now;
            attempt.Status = PlanningAttemptStatuses.Succeeded;
            attempt.Outcome = outcome;
            attempt.ClarificationJson = PlanningJson.Serialize(clarification);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Planning attempt completed. AttemptId: {AttemptId}, Status: {Status}, Outcome: {Outcome}",
                attempt.Id, attempt.Status, attempt.Outcome);
            return;
        }
        if (failure is null)
        {
            await db.PlanningDrafts
                .Where(x => x.UserId == attempt.UserId && x.Status == PlanningDraftStatuses.Reviewable &&
                    x.ExpiresAt <= now)
                .ExecuteUpdateAsync(x => x
                    .SetProperty(d => d.Status, PlanningDraftStatuses.Expired)
                    .SetProperty(d => d.UpdatedAt, now)
                    .SetProperty(d => d.Version, d => d.Version + 1), cancellationToken);
            if (await db.PlanningDrafts.AsNoTracking().AnyAsync(x => x.UserId == attempt.UserId &&
                    x.Status == PlanningDraftStatuses.Reviewable, cancellationToken)) failure = "DRAFT_COLLISION";
        }

        attempt.UpdatedAt = now;
        attempt.CompletedAt = now;
        if (failure is not null)
        {
            attempt.Status = PlanningAttemptStatuses.Failed;
            attempt.FailureCode = failure;
        }
        else
        {
            var draft = new PlanningDraft
            {
                Id = Guid.NewGuid(), UserId = attempt.UserId, AttemptId = attempt.Id,
                ContextGoalId = attempt.ContextGoalId, ContextProjectId = attempt.ContextProjectId,
                SchemaVersion = PlanningJson.SchemaVersion, ContextFingerprint = attempt.ContextFingerprint,
                CreatedAt = now, UpdatedAt = now, ExpiresAt = now.Add(DraftLifetime),
                Revisions =
                [
                    new PlanningDraftRevision
                    {
                        Id = Guid.NewGuid(), Revision = 1, ContentJson = PlanningJson.Serialize(content),
                        CreatedAt = now
                    }
                ]
            };
            db.PlanningDrafts.Add(draft);
            attempt.Status = PlanningAttemptStatuses.Succeeded;
            attempt.Outcome = PlanningOutcomes.Draft;
            attempt.DraftId = draft.Id;
            PlanningEvents.Add(db, attempt.UserId, EventActors.SystemDeterministic, "PlanningDraft", draft.Id,
                1, PlanningEventTypes.DraftCreated, JsonSerializer.Serialize(new
                {
                    generator = attempt.GeneratorKey,
                    contextScope = item.Context.Scope?.Type ?? "NONE",
                    proposalCount = content!.Proposals.Count,
                    factCount = content.Facts.Count
                }), now);
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        logger.LogInformation("Planning attempt completed. AttemptId: {AttemptId}, Status: {Status}, FailureCode: {FailureCode}",
            attempt.Id, attempt.Status, attempt.FailureCode);
    }
}

internal static class PlanningEvents
{
    /// <summary>A durable planning event written outside a user command, with its outbox intent.</summary>
    public static void Add(AppDbContext context, Guid userId, string actor, string aggregateType,
        Guid aggregateId, long version, string eventType, string payloadJson, DateTimeOffset now)
    {
        var domainEvent = new DomainEvent
        {
            EventId = Guid.NewGuid(), EventType = eventType, EventVersion = 1, OccurredAt = now,
            RecordedAt = now, UserId = userId, Actor = actor, AggregateType = aggregateType,
            AggregateId = aggregateId, AggregateVersion = version, TransactionId = Guid.NewGuid(),
            CorrelationId = Guid.NewGuid().ToString("N"), PayloadJson = payloadJson
        };
        context.DomainEvents.Add(domainEvent);
        context.OutboxMessages.Add(new OutboxMessage
        {
            Id = Guid.NewGuid(), EventId = domainEvent.EventId, CreatedAt = now
        });
    }
}
