using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Reconcile;
using TidySense.Models;
using TidySense.Services.Ai;

namespace TidySense.Services;

public static class ReconcileAiAvailability
{
    public const string Available = "AVAILABLE";
    public const string NotEligible = "NOT_ELIGIBLE";
    public const string Disabled = "DISABLED";
}

public static class ReconcileRecommendationStatuses
{
    public const string Open = "OPEN";
    public const string Outdated = "OUTDATED";
}

/// <summary>
/// The optional AI layer of Reconcile. It is given a deterministic evaluation and never produces
/// one: without rule-matched evidence nothing is requested. A recommendation adds no authority;
/// using one only prefills the ordinary server preview, which is then confirmed and revalidated
/// like any other Reconcile action.
/// </summary>
public sealed class ReconcileExplanationService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    IReconcileExplainer explainer,
    IOptionsMonitor<AiOptions> ai,
    ReconcileExplanationQueue queue,
    PlanningAttemptCancellation cancellations,
    EventPayloadValidator events)
{
    // Longer than the runner's own timeout: only an explanation whose process was lost is closed here.
    private static readonly TimeSpan LostAfter = TimeSpan.FromMinutes(3);

    public async Task<ReconcileAiDto> ViewAsync(ReconcileSession session, ReconcileEvaluation evaluation,
        DateOnly today, CancellationToken cancellationToken)
    {
        var input = ReconcileExplanationContextBuilder.Build(evaluation, today);
        await CloseLostAsync(session.Id, cancellationToken);
        // A cancelled request leaves no trace in the view; an earlier explanation stays readable.
        // The one that is running is always the one shown.
        var latest = await db.ReconcileExplanations.AsNoTracking().Include(x => x.Recommendations)
            .Where(x => x.SessionId == session.Id && x.Status != ReconcileExplanationStatuses.Cancelled)
            .OrderByDescending(x => x.Status == ReconcileExplanationStatuses.Running)
            .ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var availability = IsSwitchedOff() ? ReconcileAiAvailability.Disabled
            : input is null ? ReconcileAiAvailability.NotEligible : ReconcileAiAvailability.Available;
        // Titles are read for display only; they are never part of what an explainer is told.
        var taskIds = latest?.Recommendations.SelectMany(x => x.TaskIds).Distinct().ToArray() ?? [];
        var titles = taskIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await db.Tasks.AsNoTracking().Where(x => x.UserId == session.UserId && taskIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Title, cancellationToken);
        var resultIds = latest?.Recommendations.Select(x => x.ResultingCommandResultId).OfType<Guid>().ToArray() ?? [];
        var commandStatuses = resultIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await db.CommandResults.AsNoTracking().Where(x => resultIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Status, cancellationToken);
        return new ReconcileAiDto(availability, explainer.Key == DeterministicReconcileExplainer.SampleKey,
            latest is null ? null : ToDto(latest, input, commandStatuses, titles));
    }

    public async Task RequestAsync(ReconcileSession session, ReconcileEvaluation evaluation, DateOnly today,
        CancellationToken cancellationToken)
    {
        if (session.Status != ReconcileSessionStatuses.Open)
            throw new DomainRuleException("RECONCILE_SESSION_NOT_OPEN", "The Reconcile session is not open.");
        // A switched-off AI path is said plainly before anything is stored; the deterministic lanes are unaffected.
        if (IsSwitchedOff()) throw new AiUnavailableException(AiUnavailableException.Reconcile);
        var input = ReconcileExplanationContextBuilder.Build(evaluation, today)
            ?? throw new DomainRuleException("EXPLANATION_NOT_ELIGIBLE", "No Reconcile rule matched.");

        var owner = currentUser.UserId;
        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM \"Users\" WHERE \"Id\" = {owner} FOR UPDATE", cancellationToken);
        await CloseLostAsync(session.Id, cancellationToken);
        // Asking again while one is running is the same request.
        if (await db.ReconcileExplanations.AsNoTracking().AnyAsync(x => x.SessionId == session.Id &&
                x.Status == ReconcileExplanationStatuses.Running, cancellationToken)) return;

        var window = TimeSpan.FromDays(1);
        var recent = db.ReconcileExplanations.AsNoTracking().Where(x => x.UserId == owner && x.CreatedAt > now - window);
        if (await recent.CountAsync(cancellationToken) >= ai.CurrentValue.Reconcile.ExplanationsPerUserPerDay)
        {
            var oldest = await recent.MinAsync(x => x.CreatedAt, cancellationToken);
            throw new AiRateLimitException(Math.Max(1, (int)Math.Ceiling((oldest + window - now).TotalSeconds)));
        }

        var explanation = new ReconcileExplanation
        {
            Id = Guid.NewGuid(), SessionId = session.Id, UserId = owner, ExplainerKey = explainer.Key,
            ContextBuilderVersion = input.Context.BuilderVersion,
            ContextFingerprint = ReconcileExplanationContextBuilder.Fingerprint(input.Targets),
            ContextManifestJson = ReconcileExplanationContextBuilder.Manifest(input.Context), CreatedAt = now
        };
        db.ReconcileExplanations.Add(explanation);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        queue.Enqueue(new ReconcileExplanationWorkItem(explanation.Id, owner, session.Id, input));
    }

    /// <summary>Cancelling is harmless to repeat. A result that arrives anyway is discarded.</summary>
    public async Task CancelAsync(Guid sessionId, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var running = await db.ReconcileExplanations.AsNoTracking()
            .Where(x => x.SessionId == sessionId && x.UserId == currentUser.UserId &&
                x.Status == ReconcileExplanationStatuses.Running)
            .Select(x => x.Id).ToListAsync(cancellationToken);
        await db.ReconcileExplanations
            .Where(x => running.Contains(x.Id) && x.Status == ReconcileExplanationStatuses.Running)
            .ExecuteUpdateAsync(x => x
                .SetProperty(e => e.Status, ReconcileExplanationStatuses.Cancelled)
                .SetProperty(e => e.CompletedAt, now), cancellationToken);
        foreach (var id in running) cancellations.Cancel(id);
    }

    /// <summary>Records that the user declined a recommendation. Nothing else changes; repeating it is harmless.</summary>
    public async Task<ReconcileRecommendationDispositionDto> DismissAsync(Guid recommendationId,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var recommendation = await LockAsync(recommendationId, cancellationToken)
            ?? throw new ResourceNotFoundException("ReconcileRecommendation", recommendationId);
        if (recommendation.Disposition == ReconcileRecommendationDispositions.Pending)
        {
            recommendation.Disposition = ReconcileRecommendationDispositions.Rejected;
            recommendation.DisposedAt = now;
            var sessionId = await db.ReconcileExplanations.AsNoTracking()
                .Where(x => x.Id == recommendation.ExplanationId).Select(x => x.SessionId).SingleAsync(cancellationToken);
            ReconcileRecommendationEvents.Add(db, events, recommendation, sessionId, EventActors.User,
                ReconcileEventTypes.RecommendationRejected,
                JsonSerializer.Serialize(new { actionType = recommendation.ActionType }), now);
            await db.SaveChangesAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        return new ReconcileRecommendationDispositionDto(recommendation.Id, recommendation.Disposition);
    }

    /// <summary>
    /// Checks that a preview may be requested from a recommendation: it belongs to this session,
    /// was not declined, still rests on the current evidence, and the request stays inside what
    /// was recommended. The preview itself is built and validated by the deterministic path.
    /// </summary>
    public async Task RequirePreviewableAsync(ReconcileSession session, Guid recommendationId, string actionType,
        IReadOnlyList<Guid> taskIds, Guid? sequenceId, ReconcileEvaluation evaluation, DateOnly today,
        CancellationToken cancellationToken)
    {
        var recommendation = await db.ReconcileRecommendations.AsNoTracking().Include(x => x.ExplanationRecord)
            .SingleOrDefaultAsync(x => x.Id == recommendationId && x.UserId == currentUser.UserId &&
                x.ExplanationRecord.SessionId == session.Id, cancellationToken)
            ?? throw new ResourceNotFoundException("ReconcileRecommendation", recommendationId);
        if (recommendation.ExplanationRecord.Status != ReconcileExplanationStatuses.Ready ||
            recommendation.Disposition is not (ReconcileRecommendationDispositions.Pending
                or ReconcileRecommendationDispositions.Accepted or ReconcileRecommendationDispositions.AcceptedEdited))
            throw new DomainRuleException("RECOMMENDATION_NOT_AVAILABLE", "The recommendation cannot be used.");
        if (!IsCurrent(recommendation, ReconcileExplanationContextBuilder.Build(evaluation, today)))
            throw new CommandConflictException("RECOMMENDATION_OUTDATED", "The evidence behind the recommendation changed.");
        if (actionType != recommendation.ActionType || sequenceId != recommendation.SequenceId ||
            (sequenceId is null && taskIds.Any(x => !recommendation.TaskIds.Contains(x))))
            throw new ArgumentException("The request is not what was recommended.");
    }

    /// <summary>
    /// Records the user's acceptance when they confirm a preview that came from a recommendation.
    /// It is stored on its own, before the command runs: accepting is not the same as applying,
    /// and a confirmation that then turns out stale leaves an accepted recommendation and no change.
    /// </summary>
    public async Task AcceptAsync(ActionConfirmation confirmation, DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (confirmation.ReconcileRecommendationId is not { } recommendationId ||
            confirmation.Status != ActionConfirmationStatuses.Created) return;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var recommendation = await LockAsync(recommendationId, cancellationToken);
        if (recommendation is { Disposition: ReconcileRecommendationDispositions.Pending })
        {
            using var request = JsonDocument.Parse(confirmation.RequestJson);
            var edited = recommendation.SequenceId is null &&
                request.RootElement.GetProperty("TaskIds").GetArrayLength() != recommendation.TaskIds.Length;
            recommendation.Disposition = edited
                ? ReconcileRecommendationDispositions.AcceptedEdited : ReconcileRecommendationDispositions.Accepted;
            recommendation.DisposedAt = now;
            ReconcileRecommendationEvents.Add(db, events, recommendation, confirmation.ReconcileSessionId!.Value,
                EventActors.User, ReconcileEventTypes.RecommendationAccepted,
                JsonSerializer.Serialize(new { actionType = recommendation.ActionType, edited }), now, confirmation.Id);
            await db.SaveChangesAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        db.ChangeTracker.Clear();
    }

    /// <summary>
    /// Links a recommendation to the result of the command submitted from it, whatever that result
    /// is. This is the only place application success can be read from.
    /// </summary>
    public Task LinkResultAsync(Guid? recommendationId, Guid commandResultId, CancellationToken cancellationToken) =>
        recommendationId is null
            ? Task.CompletedTask
            : db.ReconcileRecommendations
                .Where(x => x.Id == recommendationId && x.UserId == currentUser.UserId)
                .ExecuteUpdateAsync(x => x.SetProperty(r => r.ResultingCommandResultId, commandResultId),
                    cancellationToken);

    /// <summary>
    /// Closes recommendations nobody answered, when their session ends or a newer explanation
    /// replaces them. It records that no decision was captured; it is never read as a refusal.
    /// </summary>
    public static Task ExpireUndecidedAsync(IQueryable<ReconcileRecommendation> recommendations, DateTimeOffset now,
        CancellationToken cancellationToken) => recommendations
        .Where(x => x.Disposition == ReconcileRecommendationDispositions.Pending)
        .ExecuteUpdateAsync(x => x
            .SetProperty(r => r.Disposition, ReconcileRecommendationDispositions.ExpiredWithoutDecision)
            .SetProperty(r => r.DisposedAt, now), cancellationToken);

    private bool IsSwitchedOff() => ai.CurrentValue.GlobalKillSwitch || ai.CurrentValue.Reconcile.KillSwitch;

    private Task<ReconcileRecommendation?> LockAsync(Guid id, CancellationToken cancellationToken) =>
        db.ReconcileRecommendations.FromSqlInterpolated($"SELECT * FROM \"ReconcileRecommendations\" WHERE \"Id\" = {id} AND \"UserId\" = {currentUser.UserId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

    private Task CloseLostAsync(Guid sessionId, CancellationToken cancellationToken) =>
        CloseLostAsync(db, sessionId, dates.UtcNow, cancellationToken);

    /// <summary>Fails explanations whose process was lost: those of one session, or every one when none is named.</summary>
    public static Task<int> CloseLostAsync(AppDbContext context, Guid? sessionId, DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var lostBefore = now - LostAfter;
        return context.ReconcileExplanations
            .Where(x => (sessionId == null || x.SessionId == sessionId) &&
                x.Status == ReconcileExplanationStatuses.Running && x.CreatedAt < lostBefore)
            .ExecuteUpdateAsync(x => x
                .SetProperty(e => e.Status, ReconcileExplanationStatuses.Failed)
                .SetProperty(e => e.FailureCode, ReconcileExplanationFailureCodes.GenerationTimeout)
                .SetProperty(e => e.CompletedAt, now), cancellationToken);
    }

    private static ReconcileExplanationDto ToDto(ReconcileExplanation value, ReconcileExplanationInput? current,
        IReadOnlyDictionary<Guid, string> commandStatuses, IReadOnlyDictionary<Guid, string> titles) =>
        new(value.Id, value.Status, value.FailureCode,
            current is not null &&
            ReconcileExplanationContextBuilder.Fingerprint(current.Targets) == value.ContextFingerprint,
            value.Summary,
            value.Recommendations.OrderBy(x => x.Ordinal).Select(x => new ReconcileRecommendationDto(x.Id, x.RuleId,
                x.ActionType, x.TaskIds, x.SequenceId, x.Explanation,
                JsonSerializer.Deserialize<ReconcileRecommendationEvidenceDto[]>(x.EvidenceJson)!,
                x.Disposition != ReconcileRecommendationDispositions.Pending ? x.Disposition
                : IsCurrent(x, current) ? ReconcileRecommendationStatuses.Open
                : ReconcileRecommendationStatuses.Outdated,
                x.ResultingCommandResultId is { } resultId ? commandStatuses.GetValueOrDefault(resultId) : null,
                x.TaskIds.Where(titles.ContainsKey).Select(id => new ReconcileRecommendationTaskDto(id, titles[id]))
                    .ToArray())).ToArray(),
            value.CreatedAt);

    /// <summary>True while every decision the recommendation points at still carries the evidence it was built on.</summary>
    private static bool IsCurrent(ReconcileRecommendation recommendation, ReconcileExplanationInput? current)
    {
        if (current is null) return false;
        Guid[] entities = recommendation.SequenceId is { } sequenceId ? [sequenceId] : recommendation.TaskIds;
        var matching = current.Targets.Where(x => entities.Contains(x.EntityId)).ToArray();
        return matching.Length == entities.Length &&
            ReconcileExplanationContextBuilder.Fingerprint(matching) == recommendation.EvidenceFingerprint;
    }
}

internal static class ReconcileRecommendationEvents
{
    /// <summary>A durable recommendation event with its outbox intent. The recommendation is the proposal; AI is never the actor.</summary>
    public static void Add(AppDbContext context, EventPayloadValidator validator, ReconcileRecommendation recommendation,
        Guid sessionId, string actor, string eventType, string payloadJson, DateTimeOffset now,
        Guid? confirmationId = null)
    {
        validator.Validate(eventType, 1, payloadJson);
        var domainEvent = new DomainEvent
        {
            EventId = Guid.NewGuid(), EventType = eventType, EventVersion = 1, OccurredAt = now, RecordedAt = now,
            UserId = recommendation.UserId, Actor = actor, AggregateType = "ReconcileRecommendation",
            AggregateId = recommendation.Id, AggregateVersion = actor == EventActors.User ? 2 : 1,
            TransactionId = Guid.NewGuid(), CorrelationId = Guid.NewGuid().ToString("N"),
            ProposalId = recommendation.Id, ConfirmationId = confirmationId, ReconcileSessionId = sessionId,
            RuleId = recommendation.RuleId, RuleVersion = recommendation.RuleVersion, PayloadJson = payloadJson
        };
        context.DomainEvents.Add(domainEvent);
        context.OutboxMessages.Add(new OutboxMessage { Id = Guid.NewGuid(), EventId = domainEvent.EventId, CreatedAt = now });
    }
}
