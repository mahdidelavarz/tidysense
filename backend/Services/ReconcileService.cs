using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Captures;
using TidySense.DTOs.Reconcile;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// Deterministic Reconcile. Facts are derived from canonical state on every read; a session only
/// preserves what was observed when it opened. Every mutation goes through a stored preview that
/// is re-derived under locks before one all-or-nothing command applies it.
/// </summary>
public sealed class ReconcileService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    RoutineService routines,
    ReconcileExplanationService explanations,
    CommandExecutionService commands)
{
    private const int ReviewChunkSize = 5;
    private const int CaptureChunkSize = 20;
    private const string SessionAlreadyOpen = "RECONCILE_SESSION_ALREADY_OPEN";
    private static readonly TimeSpan ConfirmationLifetime = TimeSpan.FromMinutes(15);

    public async Task<ReconcileOverviewDto> OverviewAsync(CancellationToken cancellationToken)
    {
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        // The first eligible look of a local date is kept, so a day without a session can still be counted.
        if (evaluation.Eligible)
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "ReconcileExposures" ("Id", "UserId", "LocalDate", "Severity", "FirstSeenAt", "RetentionClass")
                VALUES ({Guid.NewGuid()}, {currentUser.UserId}, {today}, {evaluation.Severity}, {dates.UtcNow}, {"R2"})
                ON CONFLICT ("UserId", "LocalDate") DO NOTHING
                """, cancellationToken);
        var prompt = await db.ReconcilePrompts.AsNoTracking().SingleOrDefaultAsync(
            x => x.UserId == currentUser.UserId && x.LocalDate == today, cancellationToken);
        var counts = evaluation.Counts;
        return new ReconcileOverviewDto(today, evaluation.Eligible, evaluation.Severity,
            evaluation.TriggerReasons, counts,
            counts.ActionableBacklogCount + counts.ReviewDueCount + counts.UnresolvedCaptureCount,
            prompt?.State ?? ReconcilePromptStates.NotPresented, evaluation.Eligible && prompt is null);
    }

    /// <summary>Hides today's automatic prompt. It changes presentation only; no fact is resolved.</summary>
    public async Task<ReconcilePromptDto> ResolvePromptAsync(ResolveReconcilePromptRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "RESOLVE_RECONCILE_PROMPT", new { request.State, today }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await LockUserAsync(context, owner, ct);
            var prompt = await context.ReconcilePrompts.SingleOrDefaultAsync(
                x => x.UserId == owner && x.LocalDate == today, ct);
            if (prompt is null)
            {
                prompt = new ReconcilePrompt
                {
                    Id = Guid.NewGuid(), UserId = owner, LocalDate = today, State = request.State,
                    UpdatedAt = now
                };
                context.ReconcilePrompts.Add(prompt);
            }
            else
            {
                prompt.State = request.State;
                prompt.UpdatedAt = now;
                prompt.Version++;
            }
            return new CommandMutation("ReconcilePrompt", prompt.Id, prompt.Version,
                ReconcileEventTypes.PromptResolved, 1,
                JsonSerializer.Serialize(new { state = request.State, severity = evaluation.Severity }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return new ReconcilePromptDto(today, request.State);
    }

    public async Task<ReconcileSessionDto> OpenSessionAsync(OpenReconcileSessionRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        var now = dates.UtcNow;
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "OPEN_RECONCILE_SESSION", new { request.TriggerType, today }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await LockUserAsync(context, owner, ct);
            if (await context.ReconcileSessions.AsNoTracking().AnyAsync(x => x.UserId == owner &&
                    x.Status == ReconcileSessionStatuses.Open && x.LocalDate == today, ct))
                throw new CommandRejectedException(SessionAlreadyOpen);
            // An open session from an earlier local date is closed first; one session is open per user.
            // Recommendations it still held unanswered end with it.
            await ReconcileExplanationService.ExpireUndecidedAsync(context.ReconcileRecommendations.Where(x =>
                x.UserId == owner && x.ExplanationRecord.Session.Status == ReconcileSessionStatuses.Open), now, ct);
            await context.ReconcileSessions
                .Where(x => x.UserId == owner && x.Status == ReconcileSessionStatuses.Open)
                .ExecuteUpdateAsync(x => x
                    .SetProperty(s => s.Status, ReconcileSessionStatuses.Expired)
                    .SetProperty(s => s.CompletedAt, now)
                    .SetProperty(s => s.Version, s => s.Version + 1), ct);
            var counts = evaluation.Counts;
            context.ReconcileSessions.Add(new ReconcileSession
            {
                Id = id, UserId = owner, TriggerType = request.TriggerType,
                RulesCatalogVersion = ReconcileRules.CatalogVersion, LocalDate = today,
                Timezone = dates.TimeZoneId, Severity = evaluation.Severity,
                ActionableBacklogCount = counts.ActionableBacklogCount,
                OldestUnresolvedAgeDays = counts.OldestUnresolvedAgeDays,
                ReviewDueCount = counts.ReviewDueCount,
                UnresolvedCaptureCount = counts.UnresolvedCaptureCount, OpenedAt = now,
                Facts = Facts(id, evaluation), RuleMatches = evaluation.RuleMatches.Select(x => new RuleMatch
                {
                    Id = Guid.NewGuid(), SessionId = id, RuleId = x.RuleId, RuleVersion = x.RuleVersion,
                    AffectedEntityIds = x.AffectedEntityIds.ToArray(), MatchedAt = now,
                    AllowedActionTypes = x.AllowedActions.ToArray()
                }).ToList()
            });
            return new CommandMutation("ReconcileSession", id, 1, ReconcileEventTypes.SessionOpened, 1,
                JsonSerializer.Serialize(new
                {
                    triggerType = request.TriggerType, rulesCatalogVersion = ReconcileRules.CatalogVersion,
                    severity = evaluation.Severity, actionableBacklogCount = counts.ActionableBacklogCount,
                    reviewDueCount = counts.ReviewDueCount,
                    unresolvedCaptureCount = counts.UnresolvedCaptureCount
                }), now, ReconcileSessionId: id);
        }, cancellationToken);

        var sessionId = result.Status == "FAILED_FINAL" && result.ErrorCode == SessionAlreadyOpen
            ? await db.ReconcileSessions.AsNoTracking()
                .Where(x => x.UserId == currentUser.UserId &&
                    x.Status == ReconcileSessionStatuses.Open && x.LocalDate == today)
                .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken)
            : null;
        if (sessionId is null)
        {
            ParentCommandSupport.RequireSuccess(result);
            sessionId = result.AggregateId!.Value;
        }
        return await ToDtoAsync(await OwnedSessionAsync(sessionId.Value, cancellationToken), evaluation, today,
            cancellationToken);
    }

    public async Task<ReconcileSessionDto> GetSessionAsync(Guid id, CancellationToken cancellationToken)
    {
        var session = await OwnedSessionAsync(id, cancellationToken);
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        return await ToDtoAsync(session, evaluation, today, cancellationToken);
    }

    /// <summary>
    /// Completing closes the interaction. It does not claim the backlog is resolved: whatever is
    /// still actionable stays eligible for a later session.
    /// </summary>
    public async Task<ReconcileSessionDto> CompleteSessionAsync(Guid id,
        CompleteReconcileSessionRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        await OwnedSessionAsync(id, cancellationToken);
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "COMPLETE_RECONCILE_SESSION", new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var session = await LockSessionAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, session.Version);
            if (session.Status != ReconcileSessionStatuses.Open)
                throw new CommandRejectedException("RECONCILE_SESSION_NOT_OPEN");
            await ReconcileExplanationService.ExpireUndecidedAsync(
                context.ReconcileRecommendations.Where(x => x.ExplanationRecord.SessionId == id), now, ct);
            session.Status = ReconcileSessionStatuses.Completed;
            session.CompletedAt = now;
            session.Version++;
            var counts = evaluation.Counts;
            return new CommandMutation("ReconcileSession", id, session.Version,
                ReconcileEventTypes.SessionCompleted, 1, JsonSerializer.Serialize(new
                {
                    severity = evaluation.Severity, actionableBacklogCount = counts.ActionableBacklogCount,
                    reviewDueCount = counts.ReviewDueCount,
                    unresolvedCaptureCount = counts.UnresolvedCaptureCount
                }), now, ReconcileSessionId: id);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await ToDtoAsync(await OwnedSessionAsync(id, cancellationToken), evaluation, today, cancellationToken);
    }

    /// <summary>
    /// A single-item decision applied on tap (027 §6): complete the Task, or carry it to today. The
    /// Task must be an actionable decision of the current evaluation with that action allowed, and is
    /// revalidated under its lock exactly as the ordinary command would be. The action is recorded with
    /// what undo needs.
    /// </summary>
    public async Task<ReconcileSessionDto> ApplyQuickActionAsync(Guid sessionId,
        ApplyReconcileQuickActionRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        await OwnedSessionAsync(sessionId, cancellationToken);
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        var item = evaluation.ExecutionGroups
            .SelectMany(group => group.Tasks.Concat(group.Sequences.SelectMany(x => x.Items)))
            .FirstOrDefault(x => x.TaskId == request.TaskId);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "RECONCILE_QUICK_ACTION",
            new { sessionId, request.TaskId, request.ActionType, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var session = await LockSessionAsync(context, sessionId, owner, ct);
            if (session.Status != ReconcileSessionStatuses.Open || session.LocalDate != today)
                throw new CommandRejectedException("RECONCILE_SESSION_NOT_OPEN");
            var complete = request.ActionType == ReconcileQuickActionTypes.CompleteTask;
            // Only a decision this session offers, with the matching ordinary action allowed.
            if (item is not { Actionable: true } ||
                !item.AllowedActions.Contains(complete ? ReconcileRules.CompleteTask : ReconcileActionTypes.ReplanTasks))
                throw new CommandRejectedException("QUICK_ACTION_NOT_ALLOWED");
            var snapshot = await context.Tasks.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == request.TaskId && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Task", request.TaskId);
            // Parents first: done here may complete the Task's Project (owner decision 2026-10-19).
            await ParentCommandSupport.LockParentsAsync(context, owner, [(snapshot.GoalId, snapshot.ProjectId)], null, null, ct);
            if (snapshot.SequenceId is { } sequenceId) await TaskService.LockSequencesAsync(context, [sequenceId], ct);
            var task = await TaskService.LockOwnedAsync(context, request.TaskId, owner, ct);
            VersionGuard.RequireMatch(task.Id, request.ExpectedVersion, task.Version);
            if (task.Status != TaskStatuses.Active) throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");

            var previous = task.PlannedDate;
            string eventType, payload;
            if (complete)
            {
                if (await TaskService.HasUnresolvedPredecessorAsync(context, task, ct))
                    throw new CommandRejectedException("TASK_BLOCKED");
                task.Status = TaskStatuses.Completed;
                task.CompletedForLocalDate = today;
                task.TerminalAt = now;
                task.UpdatedAt = now;
                task.Version++;
                (eventType, payload) = (TaskEventTypes.TaskCompleted, "{}");
            }
            else
            {
                // «امروز» moves a Task planned for an earlier day; anything else needs a date and a preview.
                if (task.PlannedDate is not { } planned) throw new CommandRejectedException("TASK_NOT_SCHEDULED");
                if (planned >= today) throw new CommandRejectedException("NO_CHANGES");
                if (task.Deadline is { } deadline && today > deadline)
                    throw new CommandRejectedException("DEADLINE_EXCEEDED");
                (eventType, payload) = (TaskEventTypes.TaskCarried,
                    TaskService.Carry(task, today, today, now, TaskCarryScopes.Task));
            }
            var eventId = Guid.NewGuid();
            context.ReconcileQuickActions.Add(new ReconcileQuickAction
            {
                Id = Guid.NewGuid(), UserId = owner, SessionId = sessionId, TaskId = task.Id,
                ActionType = request.ActionType, PreviousPlannedDate = complete ? null : previous,
                ResultingVersion = task.Version, AppliedEventId = eventId, CreatedAt = now
            });
            var settled = await ParentLifecycle.SettleProjectsAsync(context, owner, [task.ProjectId], today, now, ct);
            return new CommandMutation("Task", task.Id, task.Version, eventType, 1, payload, now,
                ReconcileSessionId: sessionId, EventId: eventId) { CascadeEvents = settled };
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetSessionAsync(sessionId, cancellationToken);
    }

    /// <summary>
    /// Takes a one-tap decision back through a deterministic command: the Task returns to exactly
    /// the state the action found it in. Refused once the session closed, once it was undone, or when
    /// the Task changed after the action (including a later step of its sequence completed since).
    /// </summary>
    public async Task<ReconcileSessionDto> UndoQuickActionAsync(Guid quickActionId, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var action = await db.ReconcileQuickActions.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == quickActionId && x.UserId == currentUser.UserId, cancellationToken)
            ?? throw new ResourceNotFoundException("ReconcileQuickAction", quickActionId);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "UNDO_RECONCILE_QUICK_ACTION", new { quickActionId }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var session = await LockSessionAsync(context, action.SessionId, owner, ct);
            if (session.Status != ReconcileSessionStatuses.Open)
                throw new CommandRejectedException("RECONCILE_SESSION_NOT_OPEN");
            var tracked = await context.ReconcileQuickActions.SingleAsync(x => x.Id == quickActionId, ct);
            if (tracked.Status != ReconcileQuickActionStatuses.Applied)
                throw new CommandRejectedException("QUICK_ACTION_ALREADY_UNDONE");
            var snapshot = await context.Tasks.AsNoTracking().SingleAsync(x => x.Id == tracked.TaskId && x.UserId == owner, ct);
            await ParentCommandSupport.LockParentsAsync(context, owner, [(snapshot.GoalId, snapshot.ProjectId)], null, null, ct);
            if (snapshot.SequenceId is { } sequenceId) await TaskService.LockSequencesAsync(context, [sequenceId], ct);
            var task = await TaskService.LockOwnedAsync(context, tracked.TaskId, owner, ct);
            // Undo restores the state the action found only if nothing has happened to the Task since.
            if (task.Version != tracked.ResultingVersion)
                throw new CommandConflictException("QUICK_ACTION_STALE", "The Task changed after the action.");

            string eventType;
            if (tracked.ActionType == ReconcileQuickActionTypes.CompleteTask)
            {
                // The Task was open when the action ran, so a later step completed now was completed after it,
                // and taking this one back would leave that step done before its predecessor.
                if (task.SequenceId is { } sequence && task.SequenceOrder is { } order &&
                    await context.Tasks.AsNoTracking().AnyAsync(x => x.UserId == owner && x.SequenceId == sequence &&
                        x.SequenceOrder > order && x.Status == TaskStatuses.Completed, ct))
                    throw new CommandConflictException("QUICK_ACTION_STALE", "A later step was completed after the action.");
                task.Status = TaskStatuses.Active;
                task.CompletedForLocalDate = null;
                task.TerminalAt = null;
                eventType = TaskEventTypes.TaskCompletionUndone;
            }
            else
            {
                task.PlannedDate = tracked.PreviousPlannedDate;
                eventType = TaskEventTypes.TaskCarryUndone;
            }
            task.UpdatedAt = now;
            task.Version++;
            var eventId = Guid.NewGuid();
            tracked.Status = ReconcileQuickActionStatuses.Undone;
            tracked.UndoneAt = now;
            tracked.UndoEventId = eventId;
            var settled = await ParentLifecycle.SettleProjectsAsync(context, owner, [task.ProjectId], dates.Today, now, ct);
            return new CommandMutation("Task", task.Id, task.Version, eventType, 1, "{}", now,
                ReconcileSessionId: session.Id, EventId: eventId, CausationId: tracked.AppliedEventId) { CascadeEvents = settled };
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetSessionAsync(action.SessionId, cancellationToken);
    }

    /// <summary>
    /// Asks for an AI explanation of the session's rule-matched evidence. The deterministic
    /// evaluation runs first and is the only thing the explanation is given; if it fails, nothing
    /// is requested.
    /// </summary>
    public async Task<ReconcileSessionDto> RequestExplanationAsync(Guid id, CancellationToken cancellationToken)
    {
        var session = await OwnedSessionAsync(id, cancellationToken);
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        await explanations.RequestAsync(session, evaluation, today, cancellationToken);
        return await ToDtoAsync(session, evaluation, today, cancellationToken);
    }

    public async Task<ReconcileSessionDto> CancelExplanationAsync(Guid id, CancellationToken cancellationToken)
    {
        var session = await OwnedSessionAsync(id, cancellationToken);
        await explanations.CancelAsync(id, cancellationToken);
        var (evaluation, today) = await EvaluateAsync(cancellationToken);
        return await ToDtoAsync(session, evaluation, today, cancellationToken);
    }

    public Task<ReconcileRecommendationDispositionDto> DismissRecommendationAsync(Guid id,
        CancellationToken cancellationToken) => explanations.DismissAsync(id, cancellationToken);

    public async Task<ActionConfirmationDto> CreatePreviewAsync(Guid sessionId,
        CreateReconcilePreviewRequest request, CancellationToken cancellationToken)
    {
        var session = await OwnedSessionAsync(sessionId, cancellationToken);
        if (session.Status != ReconcileSessionStatuses.Open)
            throw new DomainRuleException("RECONCILE_SESSION_NOT_OPEN", "The Reconcile session is not open.");
        var action = Normalize(request);
        var now = dates.UtcNow;
        if (request.RecommendationId is { } recommendationId)
        {
            // A recommendation only prefills the request; the preview below is built exactly as for any other.
            var (evaluation, today) = await EvaluateAsync(cancellationToken);
            await explanations.RequirePreviewableAsync(session, recommendationId, action.ActionType, action.TaskIds,
                action.SequenceId, evaluation, today, cancellationToken);
        }
        var built = await BuildPlanAsync(db, currentUser.UserId, action, dates.Today, false, cancellationToken);
        var confirmation = new ActionConfirmation
        {
            Id = Guid.NewGuid(), UserId = currentUser.UserId, ReconcileSessionId = sessionId,
            ReconcileRecommendationId = request.RecommendationId,
            ActionType = action.ActionType, RequestJson = JsonSerializer.Serialize(action),
            PreviewJson = JsonSerializer.Serialize(new StoredPreview(built.Plan.Items, built.Plan.Warnings,
                built.Plan.CanApply)),
            PreviewHash = built.Plan.Hash, CreatedAt = now, ExpiresAt = now.Add(ConfirmationLifetime)
        };
        db.ActionConfirmations.Add(confirmation);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(confirmation, now);
    }

    /// <summary>
    /// Applies a confirmation atomically. The preview is rebuilt from the stored action under
    /// row locks; if it no longer matches what the user saw, nothing changes.
    /// </summary>
    public async Task<ConfirmationResultDto> SubmitAsync(Guid confirmationId,
        SubmitConfirmationRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        var snapshot = await db.ActionConfirmations.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == confirmationId && x.UserId == currentUser.UserId && x.ReconcileSessionId != null,
            cancellationToken)
            ?? throw new ResourceNotFoundException("ActionConfirmation", confirmationId);
        var acknowledged = (request.AcknowledgedWarnings ?? [])
            .Select(x => (x.WarningId, Hash: x.WarningHash.ToUpperInvariant())).ToHashSet();
        var now = dates.UtcNow;
        var today = dates.Today;
        await explanations.AcceptAsync(snapshot, now, cancellationToken);
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "SUBMIT_RECONCILE_CONFIRMATION", new
            {
                confirmationId,
                acknowledged = acknowledged.OrderBy(x => x.WarningId, StringComparer.Ordinal)
                    .Select(x => new { x.WarningId, x.Hash })
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var confirmation = await context.ActionConfirmations.FromSqlInterpolated($"SELECT * FROM \"ActionConfirmations\" WHERE \"Id\" = {confirmationId} AND \"UserId\" = {owner} AND \"ReconcileSessionId\" IS NOT NULL FOR UPDATE")
                .SingleOrDefaultAsync(ct) ?? throw new ResourceNotFoundException("ActionConfirmation", confirmationId);
            if (confirmation.Status != ActionConfirmationStatuses.Created)
                throw new CommandRejectedException("CONFIRMATION_NOT_PENDING");
            if (confirmation.ExpiresAt <= now) throw new CommandRejectedException("CONFIRMATION_EXPIRED");
            var action = JsonSerializer.Deserialize<ReconcileActionRequest>(confirmation.RequestJson)!;
            var built = await BuildPlanAsync(context, owner, action, today, true, ct);
            if (built.Plan.Hash != confirmation.PreviewHash)
                throw new CommandConflictException("CONFIRMATION_STALE", "The preview changed.");
            if (!built.Plan.CanApply) throw new CommandRejectedException("CONFIRMATION_NOT_APPLICABLE");
            if (built.Plan.Warnings.Any(x => !acknowledged.Contains((x.WarningId, x.WarningHash))))
                throw new CommandRejectedException("WARNING_NOT_ACKNOWLEDGED");

            var cascades = Apply(action, built, today, now);
            var affectedCount = cascades.Count;
            // A drop that leaves a Project only done work completes it (owner decision 2026-10-19).
            cascades.AddRange(await ParentLifecycle.SettleProjectsAsync(context, owner,
                built.Tasks.Select(x => x.ProjectId), today, now, ct));
            confirmation.Status = ActionConfirmationStatuses.Resolved;
            confirmation.ResolvedAt = now;
            return new CommandMutation("ActionConfirmation", confirmationId, 1,
                ReconcileEventTypes.ActionConfirmed, 1,
                JsonSerializer.Serialize(new { actionType = action.ActionType, affectedCount }),
                now, cascades, confirmationId, confirmation.ReconcileSessionId);
        }, cancellationToken);
        // Succeeded, conflicted or refused: the recommendation points at whatever the command answered.
        await explanations.LinkResultAsync(snapshot.ReconcileRecommendationId, result.Id, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        var affected = await db.DomainEvents.AsNoTracking().CountAsync(
            x => x.CommandResultId == result.Id && x.AggregateType == "Task", cancellationToken);
        return new ConfirmationResultDto(confirmationId, ActionConfirmationStatuses.Resolved,
            snapshot.ActionType, affected);
    }

    /// <summary>Applies each changing item to its locked Task and returns one user event per Task.</summary>
    private static List<CascadeEvent> Apply(ReconcileActionRequest action, BuiltPlan built, DateOnly today,
        DateTimeOffset now)
    {
        var tasks = built.Tasks.ToDictionary(x => x.Id);
        var replanScope = action.TaskIds.Count == 1 ? TaskCarryScopes.Task : TaskCarryScopes.Bulk;
        var cascades = new List<CascadeEvent>();
        foreach (var item in built.Plan.Items.Where(x => PreviewClassifications.Changes(x.Classification)))
        {
            var task = tasks[item.TaskId];
            var (eventType, payload) = item.Classification switch
            {
                PreviewClassifications.WillReplan => (TaskEventTypes.TaskCarried,
                    TaskService.Carry(task, item.ResultingPlannedDate!.Value, today, now, replanScope)),
                PreviewClassifications.WillShiftNormally => (TaskEventTypes.TaskCarried,
                    TaskService.Carry(task, item.ResultingPlannedDate!.Value, today, now, TaskCarryScopes.Sequence)),
                PreviewClassifications.WillSchedule => (TaskEventTypes.TaskUpdated,
                    Schedule(task, item.ResultingPlannedDate!.Value, now)),
                PreviewClassifications.WillDrop => (TaskEventTypes.TaskDropped, DropPayload(task, now)),
                PreviewClassifications.WillDetach => (TaskEventTypes.TaskUpdated, Detach(task, now)),
                _ => (TaskEventTypes.TaskReviewKept, JsonSerializer.Serialize(new
                {
                    reasonCodes = ReconcilePreview.KeepReasons(task,
                        built.CarryCounts.GetValueOrDefault(task.Id), today)
                }))
            };
            cascades.Add(new CascadeEvent("Task", task.Id, task.Version, eventType, 1, payload,
                EventActors.User));
        }
        return cascades;
    }

    private static string Schedule(TaskItem task, DateOnly plannedDate, DateTimeOffset now)
    {
        task.PlannedDate = plannedDate;
        task.UpdatedAt = now;
        task.Version++;
        return JsonSerializer.Serialize(new { changedFields = new[] { "plannedDate" } });
    }

    private static string DropPayload(TaskItem task, DateTimeOffset now)
    {
        TaskService.Drop(task, now);
        return "{}";
    }

    /// <summary>Takes a dropped predecessor out of its sequence so the remaining members are no longer blocked by it.</summary>
    private static string Detach(TaskItem task, DateTimeOffset now)
    {
        task.SequenceId = null;
        task.SequenceOrder = null;
        task.UpdatedAt = now;
        task.Version++;
        return JsonSerializer.Serialize(new { changedFields = new[] { "sequenceId", "sequenceOrder" } });
    }

    private static ReconcileActionRequest Normalize(CreateReconcilePreviewRequest request)
    {
        if (!ReconcileActionTypes.All.Contains(request.ActionType))
            throw new ArgumentException("actionType is not supported.");
        var taskIds = (request.TaskIds ?? []).Distinct().Order().ToArray();
        var sequenceAction = request.ActionType is ReconcileActionTypes.SequenceCarryAll
            or ReconcileActionTypes.SequenceDropAll or ReconcileActionTypes.DetachDroppedPredecessor;
        if (sequenceAction ? request.SequenceId is null || taskIds.Length > 0
                : request.SequenceId is not null || taskIds.Length == 0)
            throw new ArgumentException(sequenceAction
                ? "A sequence action takes sequenceId and no taskIds."
                : "A Task action takes taskIds and no sequenceId.");
        var dated = request.ActionType is ReconcileActionTypes.ReplanTasks
            or ReconcileActionTypes.SequenceCarryAll;
        if (dated != request.PlannedDate is not null)
            throw new ArgumentException(dated ? "plannedDate is required." : "plannedDate is not accepted.");
        return new ReconcileActionRequest(request.ActionType, taskIds, request.SequenceId,
            request.PlannedDate, (request.IncludeTaskIds ?? []).Distinct().Order().ToArray());
    }

    /// <summary>
    /// Loads the Tasks an action touches and builds its preview. With <paramref name="forUpdate"/>
    /// the sequences and Task rows are locked first, in the order every Task command uses.
    /// </summary>
    private static async Task<BuiltPlan> BuildPlanAsync(AppDbContext context, Guid owner,
        ReconcileActionRequest action, DateOnly today, bool forUpdate, CancellationToken cancellationToken)
    {
        var query = context.Tasks.AsNoTracking().Where(x => x.UserId == owner);
        query = action.SequenceId is { } sequenceId
            ? query.Where(x => x.SequenceId == sequenceId)
            : query.Where(x => action.TaskIds.Contains(x.Id));
        var tasks = await query.OrderBy(x => x.Id).ToListAsync(cancellationToken);
        if (action.SequenceId is { } missingSequence && tasks.Count == 0)
            throw new ResourceNotFoundException("TaskSequence", missingSequence);
        if (action.SequenceId is null && tasks.Count != action.TaskIds.Count)
            throw new ResourceNotFoundException("Task", action.TaskIds.First(id => tasks.All(x => x.Id != id)));

        if (forUpdate)
        {
            // Parents first, in the order every Task command locks them.
            await ParentCommandSupport.LockParentsAsync(context, owner,
                tasks.Select(x => (x.GoalId, x.ProjectId)), null, null, cancellationToken);
            await TaskService.LockSequencesAsync(context,
                tasks.Select(x => x.SequenceId).OfType<Guid>(), cancellationToken);
            var ids = tasks.Select(x => x.Id).ToArray();
            tasks = await context.Tasks.FromSqlInterpolated($"SELECT * FROM \"Tasks\" WHERE \"UserId\" = {owner} AND \"Id\" = ANY({ids}) ORDER BY \"Id\" FOR UPDATE")
                .ToListAsync(cancellationToken);
            if (action.SequenceId is { } lockedSequence)
            {
                // A member that joined or left the sequence after the first read changes the preview.
                var current = await context.Tasks.AsNoTracking()
                    .Where(x => x.UserId == owner && x.SequenceId == lockedSequence)
                    .Select(x => x.Id).ToListAsync(cancellationToken);
                if (current.Count != tasks.Count || tasks.Any(x => x.SequenceId != lockedSequence))
                    throw new CommandConflictException("CONFIRMATION_STALE", "The sequence changed.");
            }
        }

        var signals = await TaskHistory.LoadAsync(context, owner, tasks.Select(x => x.Id).ToArray(),
            cancellationToken);
        var carryCounts = signals.ToDictionary(x => x.Key, x => x.Value.CarryCount);
        var parentIds = tasks.Select(x => x.ProjectId ?? x.GoalId).OfType<Guid>().Distinct().ToArray();
        var owners = parentIds.Length == 0
            ? []
            : await context.Tasks.AsNoTracking()
                .Where(x => x.UserId == owner && x.Status == TaskStatuses.Active &&
                    ((x.ProjectId != null && parentIds.Contains(x.ProjectId.Value)) ||
                     (x.ProjectId == null && x.GoalId != null && parentIds.Contains(x.GoalId.Value))))
                .Select(x => x.ProjectId ?? x.GoalId).ToListAsync(cancellationToken);
        var plan = ReconcilePreview.Build(action, today, tasks,
            signals.Where(x => x.Value.IndividuallyRescheduled).Select(x => x.Key).ToHashSet(),
            carryCounts, owners.GroupBy(x => x!.Value).ToDictionary(x => x.Key, x => x.Count()));
        return new BuiltPlan(plan, tasks, carryCounts);
    }

    /// <summary>Deterministic cleanup first, then facts for the current local date.</summary>
    private async Task<(ReconcileEvaluation Evaluation, DateOnly Today)> EvaluateAsync(
        CancellationToken cancellationToken)
    {
        var localNow = dates.LocalNow;
        var today = localNow.Date;
        var owner = currentUser.UserId;
        await routines.EvaluateAsync(localNow, cancellationToken);

        var tasks = await db.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && (x.Status == TaskStatuses.Active ||
                (x.Status == TaskStatuses.Dropped && x.SequenceId != null)))
            .ToListAsync(cancellationToken);
        var signals = await TaskHistory.LoadAsync(db, owner,
            tasks.Where(x => x.Status == TaskStatuses.Active).Select(x => x.Id).ToArray(), cancellationToken);
        var goals = await db.Goals.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == ParentStatuses.Active).ToListAsync(cancellationToken);
        var projects = await db.Projects.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == ParentStatuses.Active).ToListAsync(cancellationToken);
        var captureCount = await db.Captures.AsNoTracking().CountAsync(
            x => x.UserId == owner && x.Status == CaptureStatuses.Unresolved, cancellationToken);

        var taskInputs = tasks.Select(task =>
        {
            var signal = signals.GetValueOrDefault(task.Id, TaskSignals.None);
            return new ReconcileTaskInput(task.Id, task.Title, task.Version, task.Status, task.GoalId,
                task.ProjectId, task.PlannedDate, task.Deadline, task.SequenceId, task.SequenceOrder,
                task.IsProtected, signal.CarryCount,
                signal.LastKeptAt is { } keptAt && dates.LocalDateOf(keptAt) == today,
                signal.KeptSinceLastCarry);
        }).ToArray();
        var parents = goals.Select(x => new ReconcileParentInput("Goal", x.Id, x.Title, x.Version,
                x.ReviewDate, x.TargetDate,
                x.LastContinuationDecisionAt is { } decidedAt ? dates.LocalDateOf(decidedAt) : null))
            .Concat(projects.Select(x => new ReconcileParentInput("Project", x.Id, x.Title, x.Version,
                x.ReviewDate, x.TargetDate, null)))
            .ToArray();
        return (ReconcileRules.Evaluate(today, taskInputs, parents, captureCount), today);
    }

    private static List<ReconcileFact> Facts(Guid sessionId, ReconcileEvaluation evaluation)
    {
        var facts = new List<ReconcileFact>();
        foreach (var group in evaluation.ExecutionGroups)
        {
            foreach (var item in group.Tasks.Concat(group.Sequences.SelectMany(x => x.Items)))
                facts.Add(new ReconcileFact
                {
                    Id = Guid.NewGuid(), SessionId = sessionId, FactType = "TASK_EXECUTION",
                    EntityType = "Task", EntityId = item.TaskId, ReasonCodes = item.ReasonCodes.ToArray(),
                    ObservedMetrics = JsonSerializer.Serialize(new
                    {
                        ageDays = item.AgeDays, carryCount = item.CarryCount, blocked = item.IsBlocked,
                        actionable = item.Actionable, isProtected = item.IsProtected
                    })
                });
            foreach (var sequence in group.Sequences.Where(x => x.DroppedPredecessor is not null))
                facts.Add(new ReconcileFact
                {
                    Id = Guid.NewGuid(), SessionId = sessionId, FactType = "SEQUENCE_STRUCTURE",
                    EntityType = "Task", EntityId = sequence.DroppedPredecessor!.Id,
                    ReasonCodes = [ReconcileReasonCodes.DroppedPredecessor],
                    ObservedMetrics = JsonSerializer.Serialize(new { blockedMemberCount = sequence.Items.Count })
                });
        }
        foreach (var review in evaluation.Reviews)
            facts.Add(new ReconcileFact
            {
                Id = Guid.NewGuid(), SessionId = sessionId, FactType = "COMMITMENT_REVIEW",
                EntityType = review.EntityType == ReconcileOwnerTypes.Goal ? "Goal" : "Project",
                EntityId = review.Id, ReasonCodes = [ReconcileReasonCodes.ReviewDue],
                ObservedMetrics = JsonSerializer.Serialize(new { undatedTaskCount = review.UndatedTasks.Count })
            });
        return facts;
    }

    private async Task<ReconcileSessionDto> ToDtoAsync(ReconcileSession session,
        ReconcileEvaluation evaluation, DateOnly today, CancellationToken cancellationToken)
    {
        var captures = await db.Captures.AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId && x.Status == CaptureStatuses.Unresolved)
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Take(CaptureChunkSize).ToListAsync(cancellationToken);
        return new ReconcileSessionDto(session.Id, session.Status, session.Version, session.LocalDate,
            session.RulesCatalogVersion, session.OpenedAt, session.CompletedAt, session.Severity,
            session.ActionableBacklogCount, evaluation.Severity, evaluation.TriggerReasons,
            evaluation.Counts, evaluation.ExecutionGroups,
            // A burst of checkpoints is presented in a limited chunk; the count stays complete.
            evaluation.Reviews.Take(ReviewChunkSize).ToArray(),
            captures.Select(CaptureService.ToDto).ToArray(), evaluation.RuleMatches,
            await explanations.ViewAsync(session, evaluation, today, cancellationToken),
            await QuickActionsAsync(session, cancellationToken),
            session.ActionableBacklogCount + session.ReviewDueCount + session.UnresolvedCaptureCount);
    }

    /// <summary>The session's one-tap decisions, newest first, each with its owner and whether it can still be undone.</summary>
    private async Task<IReadOnlyList<ReconcileQuickActionDto>> QuickActionsAsync(ReconcileSession session,
        CancellationToken cancellationToken)
    {
        var rows = await (from action in db.ReconcileQuickActions.AsNoTracking()
                          join task in db.Tasks.AsNoTracking() on action.TaskId equals task.Id
                          where action.SessionId == session.Id
                          orderby action.CreatedAt descending
                          select new { action, task.Title, task.Version, task.GoalId, task.ProjectId })
            .ToListAsync(cancellationToken);
        if (rows.Count == 0) return [];
        var projectIds = rows.Where(x => x.ProjectId != null).Select(x => x.ProjectId!.Value).Distinct().ToArray();
        var goalIds = rows.Where(x => x.ProjectId == null && x.GoalId != null).Select(x => x.GoalId!.Value).Distinct().ToArray();
        var projects = await db.Projects.AsNoTracking().Where(x => projectIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Title, cancellationToken);
        var goals = await db.Goals.AsNoTracking().Where(x => goalIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Title, cancellationToken);
        var open = session.Status == ReconcileSessionStatuses.Open;
        return rows.Select(x =>
        {
            var (ownerType, ownerId, ownerTitle) = x.ProjectId is { } project
                ? (ReconcileOwnerTypes.Project, (Guid?)project, projects.GetValueOrDefault(project))
                : x.GoalId is { } goal ? (ReconcileOwnerTypes.Goal, (Guid?)goal, goals.GetValueOrDefault(goal))
                : (ReconcileOwnerTypes.Standalone, null, null);
            return new ReconcileQuickActionDto(x.action.Id, x.action.TaskId, x.Title, x.action.ActionType,
                x.action.Status, ownerType, ownerId, ownerTitle, x.action.PreviousPlannedDate,
                open && x.action.Status == ReconcileQuickActionStatuses.Applied && x.Version == x.action.ResultingVersion,
                x.action.CreatedAt);
        }).ToArray();
    }

    private static ActionConfirmationDto ToDto(ActionConfirmation value, DateTimeOffset now)
    {
        var preview = JsonSerializer.Deserialize<StoredPreview>(value.PreviewJson)!;
        var status = value.Status == ActionConfirmationStatuses.Created && value.ExpiresAt <= now
            ? ActionConfirmationStatuses.Expired : value.Status;
        return new ActionConfirmationDto(value.Id, value.ReconcileSessionId!.Value, value.ActionType, status,
            preview.CanApply, preview.Items, preview.Warnings, value.PreviewHash, value.ExpiresAt);
    }

    private async Task<ReconcileSession> OwnedSessionAsync(Guid id, CancellationToken cancellationToken) =>
        await db.ReconcileSessions.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("ReconcileSession", id);

    private static async Task<ReconcileSession> LockSessionAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.ReconcileSessions.FromSqlInterpolated($"SELECT * FROM \"ReconcileSessions\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("ReconcileSession", id);

    /// <summary>Serializes a user's session and prompt commands so "one per user" checks cannot race.</summary>
    private static Task LockUserAsync(AppDbContext context, Guid userId, CancellationToken cancellationToken) =>
        context.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM \"Users\" WHERE \"Id\" = {userId} FOR UPDATE", cancellationToken);

    private sealed record BuiltPlan(ReconcilePreviewPlan Plan, List<TaskItem> Tasks,
        IReadOnlyDictionary<Guid, int> CarryCounts);

    private sealed record StoredPreview(IReadOnlyList<ReconcilePreviewItemDto> Items,
        IReadOnlyList<ConfirmationWarningDto> Warnings, bool CanApply);
}
