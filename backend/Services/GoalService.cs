using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.Models;

namespace TidySense.Services;

public sealed class GoalService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands)
{
    public async Task<CursorPageDto<GoalDto>> ListAsync(string? status, string? cursor, int limit,
        CancellationToken cancellationToken)
    {
        if (status is not null && status is not (ParentStatuses.Active or ParentStatuses.Achieved or ParentStatuses.Abandoned))
            throw new ArgumentException("status is invalid.");
        var after = ParentCommandSupport.DecodeCursor(cursor);
        var query = db.Goals.AsNoTracking().Where(x => x.UserId == currentUser.UserId);
        if (status is not null) query = query.Where(x => x.Status == status);
        if (after is { } point)
            query = query.Where(x => x.CreatedAt < point.CreatedAt ||
                (x.CreatedAt == point.CreatedAt && x.Id.CompareTo(point.Id) < 0));
        var rows = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Take(limit + 1).ToListAsync(cancellationToken);
        var hasMore = rows.Count > limit;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        var next = hasMore && rows.Count > 0
            ? ParentCommandSupport.EncodeCursor(rows[^1].CreatedAt, rows[^1].Id) : null;
        return new CursorPageDto<GoalDto>(rows.Select(ToDto).ToArray(), new PageInfoDto(next, hasMore));
    }

    public async Task<GoalDto> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToDto(await OwnedAsync(id, cancellationToken));

    public async Task<GoalDto> CreateAsync(CreateGoalRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var outcome = ParentCommandSupport.RequiredText(request.DesiredOutcome, 2000, "desiredOutcome");
        var now = dates.UtcNow;
        var review = dates.InitialReview(request.TargetDate, request.ReviewDate, 90);
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CREATE_GOAL",
            new { title, desiredOutcome = outcome, request.TargetDate, request.ReviewDate }, now);
        var result = await commands.ExecuteAsync(identity, (context, owner, _) =>
        {
            context.Goals.Add(new Goal
            {
                Id = id, UserId = owner, Title = title, DesiredOutcome = outcome,
                TargetDate = request.TargetDate, ReviewDate = review.Date,
                ReviewDateSource = review.Source, CreatedAt = now, UpdatedAt = now
            });
            var payload = JsonSerializer.Serialize(new
                { source = CreationSources.Manual, reviewDateSource = review.Source });
            return Task.FromResult(new CommandMutation("Goal", id, 1, ParentEventTypes.GoalCreated, 1,
                payload, now));
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(result.AggregateId!.Value, cancellationToken);
    }

    public async Task<GoalDto> UpdateAsync(Guid id, UpdateGoalRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var outcome = ParentCommandSupport.RequiredText(request.DesiredOutcome, 2000, "desiredOutcome");
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "UPDATE_GOAL",
            new { id, title, desiredOutcome = outcome, request.TargetDate, request.ReviewDate, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var goal = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, goal.Version);
            if (goal.Status != ParentStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            var changed = new List<string>();
            if (goal.Title != title) { goal.Title = title; changed.Add("title"); }
            if (goal.DesiredOutcome != outcome) { goal.DesiredOutcome = outcome; changed.Add("desiredOutcome"); }
            if (goal.TargetDate != request.TargetDate) { goal.TargetDate = request.TargetDate; changed.Add("targetDate"); }
            if (request.ReviewDate is { } reviewDate && goal.ReviewDate != reviewDate)
            {
                goal.ReviewDate = reviewDate;
                goal.ReviewDateSource = ReviewDateSources.User;
                changed.Add("reviewDate");
            }
            if (changed.Count == 0) throw new CommandRejectedException("NO_CHANGES");
            goal.Version++;
            goal.UpdatedAt = now;
            return new CommandMutation("Goal", id, goal.Version, ParentEventTypes.GoalUpdated, 1,
                JsonSerializer.Serialize(new { changedFields = changed }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    /// <summary>
    /// Goal Continuation Check. Both decisions keep the Goal active and store the next review
    /// snapshot; neither is inferred from execution.
    /// </summary>
    public async Task<GoalDto> ReviewAsync(Guid id, ReviewGoalRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "REVIEW_GOAL",
            new { id, request.Decision, request.ReviewDate, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var goal = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, goal.Version);
            if (goal.Status != ParentStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            var review = dates.NextReview(goal.TargetDate, request.ReviewDate, 90);
            goal.ReviewDate = review.Date;
            goal.ReviewDateSource = review.Source;
            goal.LastContinuationDecisionAt = now;
            goal.Version++;
            goal.UpdatedAt = now;
            return new CommandMutation("Goal", id, goal.Version, ParentEventTypes.GoalContinuationResolved,
                1, JsonSerializer.Serialize(new { decision = request.Decision, reviewDateSource = review.Source }),
                now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<TerminalPreviewDto> PreviewTerminalAsync(Guid id, TerminalPreviewRequest request,
        CancellationToken cancellationToken)
    {
        RequireGoalTerminal(request.TargetStatus);
        var goal = await OwnedAsync(id, cancellationToken);
        VersionGuard.RequireMatch(id, request.ExpectedVersion, goal.Version);
        if (goal.Status != ParentStatuses.Active) throw new DomainRuleException("RESOURCE_NOT_ACTIVE", "Goal is not active.");
        var blockers = await GoalBlockersAsync(id, currentUser.UserId, cancellationToken);
        return Preview(goal, request.TargetStatus, blockers);
    }

    public async Task<GoalDto> TerminalAsync(Guid id, TerminalCommandRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        RequireGoalTerminal(request.TargetStatus);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "TERMINATE_GOAL",
            new { id, request.TargetStatus, request.ExpectedVersion, request.PreviewHash }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var goal = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, goal.Version);
            if (goal.Status != ParentStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            var blockers = await GoalBlockersAsync(context, id, owner, ct);
            var currentPreview = Preview(goal, request.TargetStatus, blockers);
            if (!CryptographicOperations.FixedTimeEquals(
                    Convert.FromHexString(currentPreview.PreviewHash), Convert.FromHexString(request.PreviewHash)))
                throw new CommandConflictException("CONFIRMATION_STALE", "The terminal preview changed.");
            if (blockers.Count > 0)
                throw new CommandRejectedException("PARENT_HAS_ACTIVE_CHILDREN");
            goal.Status = request.TargetStatus;
            goal.TerminalAt = now;
            goal.UpdatedAt = now;
            goal.Version++;
            var eventType = request.TargetStatus == ParentStatuses.Achieved
                ? ParentEventTypes.GoalAchieved : ParentEventTypes.GoalAbandoned;
            return new CommandMutation("Goal", id, goal.Version, eventType, 1, "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<Goal> OwnedAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Goals.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("Goal", id);

    internal static async Task<Goal> LockOwnedAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.Goals.FromSqlInterpolated($"SELECT * FROM \"Goals\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Goal", id);

    private Task<List<TerminalBlockerDto>> GoalBlockersAsync(Guid id, Guid userId, CancellationToken ct) =>
        GoalBlockersAsync(db, id, userId, ct);

    private static async Task<List<TerminalBlockerDto>> GoalBlockersAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken ct)
    {
        var projects = await context.Projects.AsNoTracking()
            .Where(x => x.GoalId == id && x.UserId == userId && x.Status == ParentStatuses.Active)
            .OrderBy(x => x.Id)
            .Select(x => new TerminalBlockerDto("Project", x.Id, x.Status, x.Version))
            .ToListAsync(ct);
        var tasks = await context.Tasks.AsNoTracking()
            .Where(x => x.GoalId == id && x.UserId == userId && x.Status == TaskStatuses.Active)
            .OrderBy(x => x.Id)
            .Select(x => new TerminalBlockerDto("Task", x.Id, x.Status, x.Version))
            .ToListAsync(ct);
        var routines = await context.Routines.AsNoTracking()
            .Where(x => x.GoalId == id && x.UserId == userId && x.Status == RoutineStatuses.Active)
            .OrderBy(x => x.Id)
            .Select(x => new TerminalBlockerDto("Routine", x.Id, x.Status, x.Version))
            .ToListAsync(ct);
        return projects.Concat(tasks).Concat(routines).ToList();
    }

    private static TerminalPreviewDto Preview(Goal goal, string target, IReadOnlyList<TerminalBlockerDto> blockers) =>
        new(goal.Id, "Goal", goal.Status, target, goal.Version, blockers.Count == 0, blockers, [],
            ParentCommandSupport.PreviewHash(goal.Id, "Goal", goal.Status, target, goal.Version, blockers, []));

    private static void RequireGoalTerminal(string status)
    {
        if (!ParentStatuses.IsGoalTerminal(status)) throw new ArgumentException("targetStatus is invalid.");
    }

    private static GoalDto ToDto(Goal value) => new(value.Id, value.Title, value.DesiredOutcome,
        value.Status, value.TargetDate, value.ReviewDate, value.ReviewDateSource,
        value.LastContinuationDecisionAt, value.Source, value.Version, value.CreatedAt,
        value.UpdatedAt, value.TerminalAt);
}
