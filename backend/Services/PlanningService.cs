using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Planning;
using TidySense.Models;
using TidySense.Services.Ai;

namespace TidySense.Services;

/// <summary>
/// The planning lifecycle: an idempotent attempt, a reviewable draft with immutable revisions, a
/// server-built confirmation, and one all-or-nothing command that creates the approved entities
/// and planning details. A draft is a proposal; only that command creates anything.
/// </summary>
public sealed partial class PlanningService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands,
    PlanningContextBuilder contexts,
    PlanningAttemptQueue queue,
    PlanningAttemptCancellation cancellations,
    IPlanningGenerator generator,
    IOptionsMonitor<AiOptions> ai,
    IHostEnvironment environment)
{
    private const string ApplyActionType = "APPLY_PLANNING_DRAFT";
    private static readonly TimeSpan ConfirmationLifetime = TimeSpan.FromMinutes(15);
    // Longer than a generation may take: an attempt still unfinished after this lost its worker.
    private static readonly TimeSpan StaleAttemptAfter = TimeSpan.FromMinutes(3);
    // Questions nobody answered stop being offered after the lifetime of a draft.
    private static readonly TimeSpan ClarificationLifetime = PlanningAttemptRunner.DraftLifetime;

    [GeneratedRegex("^[a-z-]{1,40}$")]
    private static partial Regex FixturePattern();

    // ---- Attempts ----

    public async Task<PlanningAttemptDto> StartAttemptAsync(StartPlanningAttemptRequest request,
        string? fixture, CancellationToken cancellationToken)
    {
        var intention = ParentCommandSupport.RequiredText(request.Intention, 2000, "intention");
        if (request.GoalId is not null && request.ProjectId is not null)
            throw new ArgumentException("Planning starts from a Goal or a Project, not both.");
        // Fixtures exist to exercise the flow; outside development and tests the header is ignored.
        if (!(environment.IsDevelopment() || environment.IsEnvironment("Testing")) ||
            fixture is null || !FixturePattern().IsMatch(fixture)) fixture = null;
        var owner = currentUser.UserId;
        var answers = (request.Answers ?? [])
            .Select(x => new PlanningAnswer(x.QuestionId ?? string.Empty, (x.Text ?? string.Empty).Trim()))
            .Where(x => x.Text.Length > 0).ToArray();
        if (answers.Any(x => x.Text.Length > PlanningClarificationRules.AnswerLength))
            throw new ArgumentException("An answer is too long.");
        var hash = CommandExecutionRequest.HashCanonicalRequest(JsonSerializer.SerializeToUtf8Bytes(new
        {
            intention, request.GoalId, request.ProjectId, request.ReplaceActive, fixture,
            request.PreviousAttemptId, answers, request.DraftNow
        }));

        var existing = await db.PlanningAttempts.AsNoTracking().SingleOrDefaultAsync(
            x => x.UserId == owner && x.ClientAttemptId == request.ClientAttemptId, cancellationToken);
        if (existing is not null) return Replay(existing, hash);

        // Answering continues the flow the questions belong to: same intention, same planning context.
        var goalId = request.GoalId;
        var projectId = request.ProjectId;
        PlanningAttempt? previous = null;
        IReadOnlyList<PlanningTurn> turns = [];
        if (request.PreviousAttemptId is { } previousId)
        {
            previous = await OwnedAttemptAsync(previousId, cancellationToken);
            if (previous.Outcome != PlanningOutcomes.Clarification)
                throw new DomainRuleException("CLARIFICATION_NOT_PENDING", "The attempt has no questions to answer.");
            var asked = PlanningJson.Deserialize<PlanningClarification>(previous.ClarificationJson!).Questions
                .Select(x => x.Id).ToHashSet(StringComparer.Ordinal);
            if (answers.Any(x => !asked.Contains(x.QuestionId)) ||
                answers.Select(x => x.QuestionId).Distinct(StringComparer.Ordinal).Count() != answers.Length)
                throw new ArgumentException("An answer does not belong to a question of the attempt.");
            if (answers.Length == 0 && !request.DraftNow)
                throw new ArgumentException("Answer at least one question or ask for a draft now.");
            intention = previous.Intention;
            goalId = previous.ContextGoalId;
            projectId = previous.ContextProjectId;
            turns = await TurnsAsync(previous, answers, cancellationToken);
        }
        else if (answers.Length > 0)
            throw new ArgumentException("Answers need the attempt whose questions they answer.");

        // A switched-off AI path is said plainly before anything is stored; manual creation is unaffected.
        var settings = ai.CurrentValue;
        if (settings.GlobalKillSwitch || settings.Planning.KillSwitch) throw new AiUnavailableException();
        var context = await contexts.BuildAsync(owner, goalId, projectId, cancellationToken);

        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM \"Users\" WHERE \"Id\" = {owner} FOR UPDATE", cancellationToken);
        existing = await db.PlanningAttempts.AsNoTracking().SingleOrDefaultAsync(
            x => x.UserId == owner && x.ClientAttemptId == request.ClientAttemptId, cancellationToken);
        if (existing is not null) return Replay(existing, hash);
        if (previous is not null && await db.PlanningAttempts.AsNoTracking().AnyAsync(
                x => x.PreviousAttemptId == previous.Id, cancellationToken))
            throw new CommandConflictException("CLARIFICATION_ALREADY_ANSWERED", "The questions were already answered.");
        await EnforceRateLimitAsync(owner, now, settings.Planning, cancellationToken);

        await CloseStaleAsync(owner, now, cancellationToken);
        var running = await db.PlanningAttempts.SingleOrDefaultAsync(x => x.UserId == owner &&
            (x.Status == PlanningAttemptStatuses.Queued || x.Status == PlanningAttemptStatuses.Running),
            cancellationToken);
        var draft = await db.PlanningDrafts.SingleOrDefaultAsync(x => x.UserId == owner &&
            x.Status == PlanningDraftStatuses.Reviewable, cancellationToken);
        if (running is not null || draft is not null)
        {
            // An unfinished flow is never replaced silently; the user chooses to discard it.
            if (!request.ReplaceActive)
                throw new CommandConflictException("PLANNING_DRAFT_ACTIVE", "An unapproved planning draft exists.");
            if (running is not null)
            {
                running.Status = PlanningAttemptStatuses.Cancelled;
                running.CompletedAt = now;
                running.UpdatedAt = now;
                cancellations.Cancel(running.Id);
            }
            if (draft is not null)
            {
                draft.Status = PlanningDraftStatuses.Superseded;
                draft.UpdatedAt = now;
                draft.Version++;
                await CancelConfirmationsAsync(db, draft.Id, cancellationToken);
                PlanningEvents.Add(db, owner, EventActors.User, "PlanningDraft", draft.Id, draft.Version,
                    PlanningEventTypes.DraftCancelled,
                    JsonSerializer.Serialize(new { reason = PlanningDraftEndReasons.Superseded }), now);
            }
            // The one-unfinished-flow indexes are checked per statement, so the old rows are closed first.
            await db.SaveChangesAsync(cancellationToken);
        }

        var attempt = new PlanningAttempt
        {
            Id = Guid.NewGuid(), UserId = owner, ClientAttemptId = request.ClientAttemptId,
            RequestHash = hash, Intention = intention, ContextGoalId = goalId,
            ContextProjectId = projectId, GeneratorKey = generator.Key,
            ContextBuilderVersion = context.BuilderVersion, ContextFingerprint = context.Fingerprint,
            ContextManifestJson = PlanningContextBuilder.Manifest(context), CreatedAt = now, UpdatedAt = now,
            PreviousAttemptId = previous?.Id, ClarificationTurn = previous is null ? 0 : previous.ClarificationTurn + 1,
            DraftNow = request.DraftNow,
            AnswersJson = previous is null ? null : PlanningJson.Serialize(answers)
        };
        db.PlanningAttempts.Add(attempt);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        // The turn budget and "draft now" both end the questions: the next result must be a draft or a blocked input.
        queue.Enqueue(new PlanningWorkItem(attempt.Id, owner, intention, context, fixture, turns,
            !request.DraftNow && attempt.ClarificationTurn < PlanningClarificationRules.MaxTurns));
        return ToDto(attempt);
    }

    /// <summary>The finished turns of a flow, oldest first, ending with the answers being given now.</summary>
    private async Task<IReadOnlyList<PlanningTurn>> TurnsAsync(PlanningAttempt asking,
        IReadOnlyList<PlanningAnswer> answers, CancellationToken cancellationToken)
    {
        var turns = new List<PlanningTurn>();
        while (true)
        {
            turns.Insert(0, new PlanningTurn(
                PlanningJson.Deserialize<PlanningClarification>(asking.ClarificationJson!).Questions, answers));
            if (asking.PreviousAttemptId is not { } earlier) return turns;
            answers = PlanningJson.Deserialize<PlanningAnswer[]>(asking.AnswersJson ?? "[]");
            asking = await OwnedAttemptAsync(earlier, cancellationToken);
        }
    }

    /// <summary>Limits distinct work per user. A replay of the same attempt never reaches this check.</summary>
    private async Task EnforceRateLimitAsync(Guid owner, DateTimeOffset now, AiPlanningOptions limits,
        CancellationToken cancellationToken)
    {
        foreach (var (window, limit) in new[]
                 {
                     (TimeSpan.FromHours(1), limits.AttemptsPerUserPerHour),
                     (TimeSpan.FromDays(1), limits.AttemptsPerUserPerDay)
                 })
        {
            var since = now - window;
            var recent = db.PlanningAttempts.AsNoTracking().Where(x => x.UserId == owner && x.CreatedAt > since);
            if (await recent.CountAsync(cancellationToken) < limit) continue;
            var oldest = await recent.MinAsync(x => x.CreatedAt, cancellationToken);
            throw new AiRateLimitException(Math.Max(1, (int)Math.Ceiling((oldest + window - now).TotalSeconds)));
        }
    }

    private static PlanningAttemptDto Replay(PlanningAttempt existing, string hash) =>
        existing.RequestHash == hash ? ToDto(existing) : throw new IdempotencyMismatchException();

    public async Task<PlanningAttemptDto> GetAttemptAsync(Guid id, CancellationToken cancellationToken)
    {
        await CloseStaleAsync(currentUser.UserId, dates.UtcNow, cancellationToken);
        return ToDto(await OwnedAttemptAsync(id, cancellationToken));
    }

    /// <summary>Cancelling is harmless to repeat. A finished attempt is returned unchanged.</summary>
    public async Task<PlanningAttemptDto> CancelAttemptAsync(Guid id, CancellationToken cancellationToken)
    {
        await OwnedAttemptAsync(id, cancellationToken);
        var now = dates.UtcNow;
        await db.PlanningAttempts
            .Where(x => x.Id == id && x.UserId == currentUser.UserId &&
                (x.Status == PlanningAttemptStatuses.Queued || x.Status == PlanningAttemptStatuses.Running))
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.Status, PlanningAttemptStatuses.Cancelled)
                .SetProperty(a => a.CompletedAt, now)
                .SetProperty(a => a.UpdatedAt, now), cancellationToken);
        cancellations.Cancel(id);
        return ToDto(await OwnedAttemptAsync(id, cancellationToken));
    }

    public async Task<PlanningActiveDto> ActiveAsync(CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var now = dates.UtcNow;
        await CloseStaleAsync(owner, now, cancellationToken);
        var attempt = await db.PlanningAttempts.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == owner &&
            (x.Status == PlanningAttemptStatuses.Queued || x.Status == PlanningAttemptStatuses.Running),
            cancellationToken);
        var draft = await db.PlanningDrafts.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == owner &&
            x.Status == PlanningDraftStatuses.Reviewable, cancellationToken);
        // Questions wait for an answer only while they are the latest thing the user did in planning.
        PlanningAttempt? asking = null;
        if (attempt is null && draft is null)
        {
            var latest = await db.PlanningAttempts.AsNoTracking().Where(x => x.UserId == owner)
                .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).FirstOrDefaultAsync(cancellationToken);
            if (latest is { Outcome: PlanningOutcomes.Clarification } &&
                latest.CompletedAt > now - ClarificationLifetime) asking = latest;
        }
        return new PlanningActiveDto(attempt is null ? null : ToDto(attempt),
            draft is null ? null : await ToDtoAsync(draft, cancellationToken),
            asking is null ? null : ToDto(asking), generator is not AiPlanningGenerator);
    }

    /// <summary>Ends what can no longer continue: drafts past their expiry and attempts that lost their worker.</summary>
    private Task CloseStaleAsync(Guid owner, DateTimeOffset now, CancellationToken cancellationToken) =>
        CloseStaleAsync(db, owner, now, cancellationToken);

    /// <summary>The same closing for one user, or for every user when none is named. Returns the attempts failed.</summary>
    public static async Task<int> CloseStaleAsync(AppDbContext context, Guid? owner, DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        await context.PlanningDrafts
            .Where(x => (owner == null || x.UserId == owner) && x.Status == PlanningDraftStatuses.Reviewable &&
                x.ExpiresAt <= now)
            .ExecuteUpdateAsync(x => x
                .SetProperty(d => d.Status, PlanningDraftStatuses.Expired)
                .SetProperty(d => d.UpdatedAt, now)
                .SetProperty(d => d.Version, d => d.Version + 1), cancellationToken);
        var lost = now - StaleAttemptAfter;
        return await context.PlanningAttempts
            .Where(x => (owner == null || x.UserId == owner) && x.UpdatedAt < lost &&
                (x.Status == PlanningAttemptStatuses.Queued || x.Status == PlanningAttemptStatuses.Running))
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.Status, PlanningAttemptStatuses.Failed)
                .SetProperty(a => a.FailureCode, "GENERATION_INTERRUPTED")
                .SetProperty(a => a.CompletedAt, now)
                .SetProperty(a => a.UpdatedAt, now), cancellationToken);
    }

    // ---- Drafts ----

    public async Task<PlanningDraftDto> GetDraftAsync(Guid id, CancellationToken cancellationToken) =>
        await ToDtoAsync(await OwnedDraftAsync(id, cancellationToken), cancellationToken);

    /// <summary>
    /// An edit never changes a revision: it stores a new complete one, and any confirmation made
    /// for the previous revision stops being submittable.
    /// </summary>
    public async Task<PlanningDraftDto> ReviseAsync(Guid id, RevisePlanningDraftRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        await OwnedDraftAsync(id, cancellationToken);
        var now = dates.UtcNow;
        var today = dates.Today;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "REVISE_PLANNING_DRAFT", new { id, request }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var draft = await LockDraftAsync(context, id, owner, ct);
            if (ReviewableError(draft, now) is { } error) throw new CommandRejectedException(error);
            VersionGuard.RequireMatch(id, request.ExpectedRevision, draft.CurrentRevision);
            var current = await ContentAsync(context, id, draft.CurrentRevision, ct);
            var scope = await PlanningContextBuilder.ScopeAsync(context, owner, draft.ContextGoalId,
                draft.ContextProjectId, false, ct);
            var edited = Merge(current, request, today);
            if (PlanningDraftRules.StructuralErrors(edited, scope?.Type).Count > 0)
                throw new CommandRejectedException("DRAFT_EDIT_INVALID");
            if (PlanningJson.Serialize(edited) == PlanningJson.Serialize(current))
                throw new CommandRejectedException("NO_CHANGES");

            draft.CurrentRevision++;
            draft.LinkedConfirmationId = null;
            draft.UpdatedAt = now;
            draft.ExpiresAt = now.Add(PlanningAttemptRunner.DraftLifetime);
            draft.Version++;
            context.PlanningDraftRevisions.Add(new PlanningDraftRevision
            {
                Id = Guid.NewGuid(), DraftId = id, Revision = draft.CurrentRevision,
                Origin = PlanningRevisionOrigins.UserEdit, ContentJson = PlanningJson.Serialize(edited),
                CreatedAt = now
            });
            await CancelConfirmationsAsync(context, id, ct);
            var included = edited.Proposals.Count(x => x.Included) + edited.Facts.Count(x => x.Included);
            return new CommandMutation("PlanningDraft", id, draft.Version, PlanningEventTypes.DraftRevised, 1,
                JsonSerializer.Serialize(new
                {
                    revision = draft.CurrentRevision, includedCount = included,
                    excludedCount = edited.Proposals.Count + edited.Facts.Count - included
                }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetDraftAsync(id, cancellationToken);
    }

    public async Task<PlanningDraftDto> CancelDraftAsync(Guid id, PlanningDraftRevisionRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        await OwnedDraftAsync(id, cancellationToken);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "CANCEL_PLANNING_DRAFT", new { id, request.ExpectedRevision }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var draft = await LockDraftAsync(context, id, owner, ct);
            if (ReviewableError(draft, now) is { } error) throw new CommandRejectedException(error);
            VersionGuard.RequireMatch(id, request.ExpectedRevision, draft.CurrentRevision);
            draft.Status = PlanningDraftStatuses.Cancelled;
            draft.UpdatedAt = now;
            draft.Version++;
            await CancelConfirmationsAsync(context, id, ct);
            return new CommandMutation("PlanningDraft", id, draft.Version, PlanningEventTypes.DraftCancelled, 1,
                JsonSerializer.Serialize(new { reason = PlanningDraftEndReasons.User }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetDraftAsync(id, cancellationToken);
    }

    /// <summary>
    /// Applies the user's edit to the stored revision. Identity, entity type, provenance, fact type
    /// and fact scope are never taken from the request. A review date the user did not touch stays
    /// a system default and follows a changed target date.
    /// </summary>
    private static PlanningDraftContent Merge(PlanningDraftContent current, RevisePlanningDraftRequest request,
        DateOnly today)
    {
        var edits = ById(request.Proposals, x => x?.DraftId, current.Proposals.Select(x => x.DraftId));
        var factEdits = ById(request.Facts, x => x?.DraftId, current.Facts.Select(x => x.DraftId));
        var proposals = current.Proposals.Select(old =>
        {
            var edit = edits[old.DraftId];
            var reviewEdited = edit.ReviewDate != old.ReviewDate;
            var redefault = !reviewEdited && old.ReviewDateSource == ReviewDateSources.SystemDefault &&
                edit.TargetDate != old.TargetDate;
            return old with
            {
                Title = edit.Title, Description = edit.Description, ParentDraftId = edit.ParentDraftId,
                UnderContext = edit.UnderContext, Included = edit.Included,
                DesiredOutcome = edit.DesiredOutcome, CompletionMeaning = edit.CompletionMeaning,
                TargetDate = edit.TargetDate,
                ReviewDate = redefault ? null : edit.ReviewDate,
                ReviewDateSource = redefault || (reviewEdited && edit.ReviewDate is null) ? null
                    : reviewEdited ? ReviewDateSources.User : old.ReviewDateSource,
                PlannedDate = edit.PlannedDate, Deadline = edit.Deadline, Recurrence = edit.Recurrence,
                TimesOfDay = edit.TimesOfDay, EffectiveFromLocalDate = edit.EffectiveFromLocalDate
            };
        }).ToArray();
        var facts = current.Facts.Select(old =>
        {
            var edit = factEdits[old.DraftId];
            return old with { Strength = edit.Strength, Value = edit.Value, Included = edit.Included };
        }).ToArray();
        var merged = PlanningDraftRules.Repair(current with { Proposals = proposals, Facts = facts }, today);

        // A generator's blocking concern about an item is answered by the user changing that item.
        var before = current.Proposals.ToDictionary(x => x.DraftId, StringComparer.Ordinal);
        var corrected = merged.Proposals
            .Where(x => PlanningJson.Serialize(x with { Included = true }) !=
                PlanningJson.Serialize(before[x.DraftId] with { Included = true }))
            .Select(x => x.DraftId).ToHashSet(StringComparer.Ordinal);
        return merged with
        {
            Warnings = merged.Warnings.Where(x => x.Severity != PlanningSeverities.Blocking ||
                x.DraftId is null || !corrected.Contains(x.DraftId)).ToArray()
        };
    }

    private static Dictionary<string, T> ById<T>(IReadOnlyList<T>? edits, Func<T?, string?> id,
        IEnumerable<string> expected) where T : class
    {
        var known = expected.ToHashSet(StringComparer.Ordinal);
        var map = new Dictionary<string, T>(StringComparer.Ordinal);
        foreach (var edit in edits ?? [])
            if (id(edit) is not { } key || !known.Contains(key) || !map.TryAdd(key, edit))
                throw new CommandRejectedException("DRAFT_EDIT_INVALID");
        // An edit cannot add or remove items; leaving one out of the plan is done by excluding it.
        if (map.Count != known.Count) throw new CommandRejectedException("DRAFT_EDIT_INVALID");
        return map;
    }

    // ---- Preview, confirmation and apply ----

    public async Task<PlanningConfirmationDto> CreatePreviewAsync(Guid id, PlanningDraftRevisionRequest request,
        CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var draft = await LockDraftAsync(db, id, owner, cancellationToken);
        if (ReviewableError(draft, now) is { } error)
            throw new DomainRuleException(error, "The planning draft can no longer be reviewed.");
        if (request.ExpectedRevision != draft.CurrentRevision)
            throw new VersionConflictException(id, request.ExpectedRevision, draft.CurrentRevision);
        var built = await BuildAsync(db, owner, draft, dates.Today, true, cancellationToken);
        if (!built.Preview.CanApply)
            throw new DomainRuleException("DRAFT_NOT_APPLICABLE", "The draft has items that must be corrected or excluded.");

        await CancelConfirmationsAsync(db, id, cancellationToken);
        var expiresAt = now.Add(ConfirmationLifetime);
        var confirmation = new ActionConfirmation
        {
            Id = Guid.NewGuid(), UserId = owner, PlanningDraftId = id,
            PlanningDraftRevision = draft.CurrentRevision, ActionType = ApplyActionType,
            PreviewJson = JsonSerializer.Serialize(new StoredPreview(
                built.Preview.Items.Select(x => new PlanningPreviewItemDto(x.DraftId, x.EntityType, x.Title,
                    x.ParentDraftId, x.UnderContext)).ToArray(),
                built.Preview.Facts.Select(x => new PlanningPreviewFactDto(x.DraftId, x.FactType, x.Strength)).ToArray(),
                built.Preview.Warnings.Select(x => new PlanningWarningDto(x.WarningId, x.Code,
                    x.AffectedDraftIds, x.WarningHash)).ToArray(),
                built.Preview.NoFactsRemembered)),
            PreviewHash = built.Preview.Hash, CreatedAt = now,
            ExpiresAt = expiresAt < draft.ExpiresAt ? expiresAt : draft.ExpiresAt
        };
        db.ActionConfirmations.Add(confirmation);
        draft.LinkedConfirmationId = confirmation.Id;
        draft.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(confirmation, now, null);
    }

    /// <summary>
    /// The recovery read: a client that lost its submission asks here whether the command already
    /// ran instead of submitting again.
    /// </summary>
    public async Task<PlanningConfirmationDto> GetConfirmationAsync(Guid id, CancellationToken cancellationToken)
    {
        var confirmation = await OwnedConfirmationAsync(id, cancellationToken);
        return ToDto(confirmation, dates.UtcNow,
            confirmation.Status == ActionConfirmationStatuses.Resolved
                ? await ResultAsync(id, cancellationToken) : null);
    }

    /// <summary>
    /// Creates everything the confirmation showed, or nothing. The preview is rebuilt under locks
    /// from the exact revision it was made for; any difference rejects the submission.
    /// </summary>
    public async Task<PlanningApplyResultDto> SubmitAsync(Guid confirmationId,
        SubmitPlanningConfirmationRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        var snapshot = await OwnedConfirmationAsync(confirmationId, cancellationToken);
        var parents = await db.PlanningDrafts.AsNoTracking()
            .Where(x => x.Id == snapshot.PlanningDraftId && x.UserId == currentUser.UserId)
            .Select(x => new { x.ContextGoalId, x.ContextProjectId }).SingleAsync(cancellationToken);
        var acknowledged = (request.AcknowledgedWarnings ?? [])
            .Select(x => (x.WarningId, Hash: x.WarningHash.ToUpperInvariant())).ToHashSet();
        var now = dates.UtcNow;
        var today = dates.Today;
        var timezone = dates.TimeZoneId;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, ApplyActionType, new
        {
            confirmationId,
            acknowledged = acknowledged.OrderBy(x => x.WarningId, StringComparer.Ordinal)
                .Select(x => new { x.WarningId, x.Hash })
        }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            // Parents first, in the order every child command locks them.
            await ParentCommandSupport.LockParentsAsync(context, owner,
                [(parents.ContextGoalId, parents.ContextProjectId)], parents.ContextGoalId,
                parents.ContextProjectId, ct);
            var confirmation = await context.ActionConfirmations.FromSqlInterpolated($"SELECT * FROM \"ActionConfirmations\" WHERE \"Id\" = {confirmationId} AND \"UserId\" = {owner} AND \"PlanningDraftId\" IS NOT NULL FOR UPDATE")
                .SingleOrDefaultAsync(ct) ?? throw new ResourceNotFoundException("ActionConfirmation", confirmationId);
            if (confirmation.Status != ActionConfirmationStatuses.Created)
                throw new CommandRejectedException("CONFIRMATION_NOT_PENDING");
            if (confirmation.ExpiresAt <= now) throw new CommandRejectedException("CONFIRMATION_EXPIRED");
            var draft = await LockDraftAsync(context, confirmation.PlanningDraftId!.Value, owner, ct);
            if (ReviewableError(draft, now) is { } error) throw new CommandRejectedException(error);
            if (draft.CurrentRevision != confirmation.PlanningDraftRevision)
                throw new CommandConflictException("CONFIRMATION_STALE", "The draft was revised.");
            var built = await BuildAsync(context, owner, draft, today, false, ct);
            if (built.Preview.Hash != confirmation.PreviewHash)
                throw new CommandConflictException("CONFIRMATION_STALE", "The preview changed.");
            if (!built.Preview.CanApply) throw new CommandRejectedException("CONFIRMATION_NOT_APPLICABLE");
            if (built.Preview.Warnings.Any(x => !acknowledged.Contains((x.WarningId, x.WarningHash))))
                throw new CommandRejectedException("WARNING_NOT_ACKNOWLEDGED");

            var cascades = Apply(context, owner, draft.AttemptId, built, today, timezone, now);
            confirmation.Status = ActionConfirmationStatuses.Resolved;
            confirmation.ResolvedAt = now;
            // The draft's job is done. Its lifecycle ends; the command result says what was created.
            draft.Status = PlanningDraftStatuses.Expired;
            draft.UpdatedAt = now;
            draft.Version++;
            var items = built.Preview.Items;
            return new CommandMutation("PlanningDraft", draft.Id, draft.Version,
                PlanningEventTypes.DraftApplied, 1, JsonSerializer.Serialize(new
                {
                    goalCount = items.Count(x => x.EntityType == PlanningEntityTypes.Goal),
                    projectCount = items.Count(x => x.EntityType == PlanningEntityTypes.Project),
                    taskCount = items.Count(x => x.EntityType == PlanningEntityTypes.Task),
                    routineCount = items.Count(x => x.EntityType == PlanningEntityTypes.Routine),
                    factCount = built.Preview.Facts.Count
                }), now, cascades, confirmationId);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await ResultAsync(confirmationId, cancellationToken);
    }

    /// <summary>Adds every approved entity and planning detail and returns one user event for each.</summary>
    private static List<CascadeEvent> Apply(AppDbContext context, Guid owner, Guid attemptId, Built built,
        DateOnly today, string timezone, DateTimeOffset now)
    {
        var items = built.Preview.Items;
        var ids = items.ToDictionary(x => x.DraftId, _ => Guid.NewGuid(), StringComparer.Ordinal);
        var types = items.ToDictionary(x => x.DraftId, x => x.EntityType, StringComparer.Ordinal);
        var scope = built.Scope;
        var cascades = new List<CascadeEvent>();

        // An approved item always has an approved parent, so the parent's new id is known.
        (Guid? GoalId, Guid? ProjectId) Owner(PlanningProposal item)
        {
            if (item.ParentDraftId is { } parent)
                return types[parent] == PlanningEntityTypes.Goal ? (ids[parent], null) : (null, ids[parent]);
            if (!item.UnderContext || scope is null) return (null, null);
            return scope.Type == PlanningContextTypes.Goal ? (scope.Id, null) : (null, scope.Id);
        }

        foreach (var item in items)
        {
            var id = ids[item.DraftId];
            var (goalId, projectId) = Owner(item);
            switch (item.EntityType)
            {
                case PlanningEntityTypes.Goal:
                    context.Goals.Add(new Goal
                    {
                        Id = id, UserId = owner, Title = item.Title, DesiredOutcome = item.DesiredOutcome!,
                        TargetDate = item.TargetDate, ReviewDate = item.ReviewDate!.Value,
                        ReviewDateSource = item.ReviewDateSource!, Source = CreationSources.AiAssisted,
                        CreatedAt = now, UpdatedAt = now
                    });
                    cascades.Add(Created("Goal", id, ParentEventTypes.GoalCreated, new
                    {
                        source = CreationSources.AiAssisted, reviewDateSource = item.ReviewDateSource
                    }));
                    break;
                case PlanningEntityTypes.Project:
                    context.Projects.Add(new Project
                    {
                        Id = id, UserId = owner, GoalId = goalId, Title = item.Title,
                        CompletionMeaning = item.CompletionMeaning, TargetDate = item.TargetDate,
                        ReviewDate = item.ReviewDate!.Value, ReviewDateSource = item.ReviewDateSource!,
                        Source = CreationSources.AiAssisted, CreatedAt = now, UpdatedAt = now
                    });
                    cascades.Add(Created("Project", id, ParentEventTypes.ProjectCreated, new
                    {
                        source = CreationSources.AiAssisted, reviewDateSource = item.ReviewDateSource,
                        parentScope = goalId is null ? "STANDALONE" : "GOAL"
                    }));
                    break;
                case PlanningEntityTypes.Task:
                    context.Tasks.Add(new TaskItem
                    {
                        Id = id, UserId = owner, GoalId = goalId, ProjectId = projectId, Title = item.Title,
                        Description = item.Description, PlannedDate = item.PlannedDate,
                        Deadline = item.Deadline, Source = CreationSources.AiAssisted,
                        CreatedAt = now, UpdatedAt = now
                    });
                    cascades.Add(new CascadeEvent("Task", id, 1, TaskEventTypes.TaskCreated, 1,
                        TaskService.CreatedPayload(goalId, projectId, item.PlannedDate, null,
                            CreationSources.AiAssisted), EventActors.User));
                    break;
                default:
                    var recurrence = PlanningDraftRules.ValidRecurrence(item)!;
                    var times = RoutineSchedule.NormalizeTimes(item.TimesOfDay);
                    context.Routines.Add(new Routine
                    {
                        Id = id, UserId = owner, GoalId = goalId, ProjectId = projectId, Title = item.Title,
                        Description = item.Description,
                        RecurrenceDefinition = RoutineSchedule.Serialize(recurrence),
                        RecurrenceTimezone = timezone, TimesOfDay = times,
                        EffectiveFromLocalDate = item.EffectiveFromLocalDate ?? today,
                        Source = CreationSources.AiAssisted, CreatedAt = now, UpdatedAt = now
                    });
                    cascades.Add(Created("Routine", id, RoutineEventTypes.RoutineCreated, new
                    {
                        source = CreationSources.AiAssisted,
                        parentScope = ParentCommandSupport.ParentScope(goalId, projectId),
                        recurrenceType = recurrence.Type, slotCount = times.Length
                    }));
                    break;
            }
        }

        foreach (var fact in built.Preview.Facts)
        {
            // A detail belongs to the Goal or standalone Project proposed here, or to the planning scope.
            var onGoal = fact.ScopeDraftId is { } scopeId
                ? types[scopeId] == PlanningEntityTypes.Goal
                : scope!.FactScopeType == PlanningContextTypes.Goal;
            var scopeEntityId = fact.ScopeDraftId is { } draftScope ? ids[draftScope] : scope!.FactScopeId;
            var id = Guid.NewGuid();
            context.PlanningFacts.Add(new PlanningFact
            {
                Id = id, UserId = owner, GoalId = onGoal ? scopeEntityId : null,
                ProjectId = onGoal ? null : scopeEntityId, FactType = fact.FactType,
                Strength = fact.Strength, ValueJson = PlanningJson.Serialize(fact.Value),
                SourcePlanningAttemptId = attemptId, CapturedAt = now, LastConfirmedAt = now, UpdatedAt = now
            });
            cascades.Add(Created("PlanningFact", id, PlanningEventTypes.FactCreated, new
            {
                factType = fact.FactType, strength = fact.Strength,
                source = PlanningFactSources.UserConfirmedAiExtraction, scope = onGoal ? "GOAL" : "PROJECT"
            }));
        }
        return cascades;

        static CascadeEvent Created(string aggregateType, Guid id, string eventType, object payload) =>
            new(aggregateType, id, 1, eventType, 1, JsonSerializer.Serialize(payload), EventActors.User);
    }

    private async Task<PlanningApplyResultDto> ResultAsync(Guid confirmationId, CancellationToken cancellationToken)
    {
        var created = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId && x.ConfirmationId == confirmationId &&
                x.AggregateType != "PlanningDraft")
            .OrderBy(x => x.RecordedAt).ThenBy(x => x.EventId)
            .Select(x => new { x.AggregateType, x.AggregateId }).ToListAsync(cancellationToken);
        Guid[] Of(string type) => created.Where(x => x.AggregateType == type).Select(x => x.AggregateId).ToArray();
        var goals = Of("Goal");
        return new PlanningApplyResultDto(confirmationId, ActionConfirmationStatuses.Resolved,
            goals.Length == 0 ? null : goals[0], Of("Project"), Of("Task"), Of("Routine"),
            Of("PlanningFact").Length);
    }

    // ---- Planning details ----

    public async Task<IReadOnlyList<PlanningFactDto>> ListFactsAsync(Guid? goalId, Guid? projectId,
        CancellationToken cancellationToken)
    {
        if ((goalId is null) == (projectId is null))
            throw new ArgumentException("Exactly one of goalId or projectId is required.");
        var owner = currentUser.UserId;
        var owned = goalId is { } goal
            ? await db.Goals.AsNoTracking().AnyAsync(x => x.Id == goal && x.UserId == owner, cancellationToken)
            : await db.Projects.AsNoTracking().AnyAsync(x => x.Id == projectId && x.UserId == owner,
                cancellationToken);
        if (!owned) throw new ResourceNotFoundException(goalId is null ? "Project" : "Goal", (goalId ?? projectId)!.Value);
        var rows = await db.PlanningFacts.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status != PlanningFactStatuses.Removed &&
                x.GoalId == goalId && x.ProjectId == projectId)
            .OrderBy(x => x.CapturedAt).ThenBy(x => x.Id).ToListAsync(cancellationToken);
        var today = dates.Today;
        return rows.Select(x => ToDto(x, today)).ToArray();
    }

    /// <summary>Takes a detail out of future planning. Its record stays for audit.</summary>
    public async Task<PlanningFactDto> RemoveFactAsync(Guid id, RemovePlanningFactRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "REMOVE_PLANNING_FACT", new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var fact = await context.PlanningFacts.FromSqlInterpolated($"SELECT * FROM \"PlanningFacts\" WHERE \"Id\" = {id} AND \"UserId\" = {owner} FOR UPDATE")
                .SingleOrDefaultAsync(ct) ?? throw new ResourceNotFoundException("PlanningFact", id);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, fact.Version);
            if (fact.Status == PlanningFactStatuses.Removed) throw new CommandRejectedException("FACT_NOT_ACTIVE");
            fact.Status = PlanningFactStatuses.Removed;
            fact.RemovedAt = now;
            fact.UpdatedAt = now;
            fact.Version++;
            return new CommandMutation("PlanningFact", id, fact.Version, PlanningEventTypes.FactRemoved, 1,
                JsonSerializer.Serialize(new { factType = fact.FactType }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        var removed = await db.PlanningFacts.AsNoTracking().SingleAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken);
        return ToDto(removed, dates.Today);
    }

    // ---- Shared ----

    /// <summary>The current revision evaluated against today's date and the scope's confirmed details.</summary>
    private static async Task<Built> BuildAsync(AppDbContext context, Guid owner, PlanningDraft draft,
        DateOnly today, bool requireActiveScope, CancellationToken cancellationToken)
    {
        var content = await ContentAsync(context, draft.Id, draft.CurrentRevision, cancellationToken);
        var scope = await PlanningContextBuilder.ScopeAsync(context, owner, draft.ContextGoalId,
            draft.ContextProjectId, requireActiveScope, cancellationToken);
        var facts = scope is null
            ? []
            : await PlanningContextBuilder.ActiveFactsAsync(context, owner, scope, today, cancellationToken);
        var evaluation = PlanningDraftRules.Evaluate(content, new PlanningRuleContext(today, scope?.Type, facts));
        var stamp = scope is null
            ? "NONE"
            : $"{scope.Type}:{scope.Id}:{scope.Version}:{scope.FactScopeType}:{scope.FactScopeId}";
        return new Built(content, scope, evaluation,
            PlanningDraftRules.BuildPreview(draft.Id, draft.CurrentRevision, content, evaluation, stamp));
    }

    private static async Task<PlanningDraftContent> ContentAsync(AppDbContext context, Guid draftId,
        int revision, CancellationToken cancellationToken) =>
        PlanningJson.Deserialize<PlanningDraftContent>(await context.PlanningDraftRevisions.AsNoTracking()
            .Where(x => x.DraftId == draftId && x.Revision == revision)
            .Select(x => x.ContentJson).SingleAsync(cancellationToken));

    private static string? ReviewableError(PlanningDraft draft, DateTimeOffset now) =>
        draft.Status != PlanningDraftStatuses.Reviewable ? "DRAFT_NOT_REVIEWABLE"
        : draft.ExpiresAt <= now ? "DRAFT_EXPIRED" : null;

    /// <summary>A confirmation belongs to one revision; once that revision is replaced or the draft ends, it cannot be submitted.</summary>
    private static Task CancelConfirmationsAsync(AppDbContext context, Guid draftId,
        CancellationToken cancellationToken) =>
        context.ActionConfirmations
            .Where(x => x.PlanningDraftId == draftId && x.Status == ActionConfirmationStatuses.Created)
            .ExecuteUpdateAsync(x => x.SetProperty(c => c.Status, ActionConfirmationStatuses.Cancelled),
                cancellationToken);

    private async Task<PlanningAttempt> OwnedAttemptAsync(Guid id, CancellationToken cancellationToken) =>
        await db.PlanningAttempts.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("PlanningAttempt", id);

    private async Task<PlanningDraft> OwnedDraftAsync(Guid id, CancellationToken cancellationToken) =>
        await db.PlanningDrafts.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("PlanningDraft", id);

    private async Task<ActionConfirmation> OwnedConfirmationAsync(Guid id, CancellationToken cancellationToken) =>
        await db.ActionConfirmations.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId && x.PlanningDraftId != null, cancellationToken)
        ?? throw new ResourceNotFoundException("ActionConfirmation", id);

    private static async Task<PlanningDraft> LockDraftAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.PlanningDrafts.FromSqlInterpolated($"SELECT * FROM \"PlanningDrafts\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("PlanningDraft", id);

    private async Task<PlanningDraftDto> ToDtoAsync(PlanningDraft draft, CancellationToken cancellationToken)
    {
        var built = await BuildAsync(db, currentUser.UserId, draft, dates.Today, false, cancellationToken);
        var status = draft.Status == PlanningDraftStatuses.Reviewable && draft.ExpiresAt <= dates.UtcNow
            ? PlanningDraftStatuses.Expired : draft.Status;
        var content = built.Content;
        var evaluation = built.Evaluation;
        return new PlanningDraftDto(draft.Id, draft.AttemptId, status, draft.CurrentRevision, draft.ExpiresAt,
            built.Scope is { } scope ? new PlanningContextRefDto(scope.Type, scope.Id, scope.Title) : null,
            content.Summary, content.WindowStart, content.WindowEnd,
            content.Proposals.Select(x =>
            {
                var state = evaluation.Proposals[x.DraftId];
                return new PlanningProposalViewDto(x, state.State, state.ExcludedByAncestor, Issues(state.Issues));
            }).ToArray(),
            content.Facts.Select(x =>
            {
                var state = evaluation.Facts[x.DraftId];
                return new PlanningFactViewDto(x, PlanningFactCatalog.Category(x.FactType), state.State,
                    state.ExcludedByAncestor, Issues(state.Issues));
            }).ToArray(),
            content.Assumptions, content.UnresolvedQuestions, Issues(evaluation.DraftIssues),
            evaluation.FirstWeek.Select(x => new PlanningFirstWeekEntryDto(x.DraftId, x.Date)).ToArray(),
            status == PlanningDraftStatuses.Reviewable && evaluation.CanApply, draft.LinkedConfirmationId);

        static PlanningIssueDto[] Issues(IReadOnlyList<PlanningIssue> issues) =>
            issues.Select(x => new PlanningIssueDto(x.Code, x.Severity, x.Origin)).ToArray();
    }

    private static PlanningConfirmationDto ToDto(ActionConfirmation value, DateTimeOffset now,
        PlanningApplyResultDto? result)
    {
        var preview = JsonSerializer.Deserialize<StoredPreview>(value.PreviewJson)!;
        var status = value.Status == ActionConfirmationStatuses.Created && value.ExpiresAt <= now
            ? ActionConfirmationStatuses.Expired : value.Status;
        return new PlanningConfirmationDto(value.Id, value.PlanningDraftId!.Value,
            value.PlanningDraftRevision!.Value, status, preview.Items, preview.Facts, preview.Warnings,
            preview.NoFactsRemembered, value.PreviewHash, value.ExpiresAt, result);
    }

    private static PlanningAttemptDto ToDto(PlanningAttempt value)
    {
        PlanningClarificationDto? clarification = null;
        if (value.ClarificationJson is { } json)
        {
            var stored = PlanningJson.Deserialize<PlanningClarification>(json);
            clarification = new PlanningClarificationDto(stored.Questions, stored.BlockReason, stored.Message,
                value.ClarificationTurn + 1);
        }
        return new PlanningAttemptDto(value.Id, value.ClientAttemptId, value.Status, value.Intention,
            value.ContextGoalId, value.ContextProjectId, value.FailureCode, value.DraftId, value.CreatedAt,
            value.CompletedAt, value.Outcome, clarification);
    }

    private static PlanningFactDto ToDto(PlanningFact value, DateOnly today)
    {
        var fact = PlanningJson.Deserialize<PlanningFactValue>(value.ValueJson);
        // A date-bounded detail that has run out is shown as expired without waiting for a write.
        var status = value.Status == PlanningFactStatuses.Active &&
            PlanningFactCatalog.HasPassed(value.FactType, fact, today)
            ? PlanningFactStatuses.Expired : value.Status;
        return new PlanningFactDto(value.Id, value.GoalId, value.ProjectId, value.FactType,
            PlanningFactCatalog.Category(value.FactType), value.Strength, fact, value.Source, status,
            value.Version, value.CapturedAt, value.LastConfirmedAt);
    }

    private sealed record Built(PlanningDraftContent Content, PlanningScope? Scope,
        PlanningEvaluation Evaluation, PlanningPreview Preview);

    private sealed record StoredPreview(IReadOnlyList<PlanningPreviewItemDto> Items,
        IReadOnlyList<PlanningPreviewFactDto> Facts, IReadOnlyList<PlanningWarningDto> Warnings,
        bool NoFactsRemembered);
}
