using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Tasks;
using TidySense.Models;

namespace TidySense.Services;

public sealed class TaskService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands)
{
    public async Task<CursorPageDto<TaskDto>> ListAsync(string? status, string? cursor, int limit,
        CancellationToken cancellationToken)
    {
        if (status is not null && !TaskStatuses.IsKnown(status))
            throw new ArgumentException("status is invalid.");
        var after = ParentCommandSupport.DecodeCursor(cursor);
        var query = db.Tasks.AsNoTracking().Where(x => x.UserId == currentUser.UserId);
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
        var items = await ToDtosAsync(rows, cancellationToken);
        return new CursorPageDto<TaskDto>(items, new PageInfoDto(next, hasMore));
    }

    public async Task<TaskDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await OwnedAsync(id, cancellationToken);
        return (await ToDtosAsync([item], cancellationToken))[0];
    }

    public async Task<IReadOnlyList<TaskDto>> TodayTasksAsync(DateOnly today,
        CancellationToken cancellationToken)
    {
        var rows = await db.Tasks.AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId && x.Status == TaskStatuses.Active &&
                x.PlannedDate == today)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        var items = await ToDtosAsync(rows, cancellationToken);
        return items.OrderBy(x => x.IsBlocked)
            .ThenBy(x => x.SequenceId.HasValue ? 0 : 1)
            .ThenBy(x => x.SequenceOrder ?? int.MaxValue)
            .ThenBy(x => x.CreatedAt).ThenBy(x => x.Id).ToArray();
    }

    public async Task<TaskDto> CreateAsync(CreateTaskRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        ValidateShape(request.GoalId, request.ProjectId, request.PlannedDate, request.Deadline,
            request.SequenceId, request.SequenceOrder, true);
        var now = dates.UtcNow;
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CREATE_TASK",
            new
            {
                title, description, request.GoalId, request.ProjectId, request.PlannedDate,
                request.Deadline, request.SequenceId, request.SequenceOrder, request.IsProtected
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await LockParentsAsync(context, owner, [(request.GoalId, request.ProjectId)],
                request.GoalId, request.ProjectId, ct);
            if (request.SequenceId is { } sequenceId)
            {
                await LockSequencesAsync(context, [sequenceId], ct);
                await RequireSequencePlacementAsync(context, owner, sequenceId,
                    request.SequenceOrder!.Value, request.GoalId, request.ProjectId, null, ct);
            }
            context.Tasks.Add(new TaskItem
            {
                Id = id,
                UserId = owner,
                GoalId = request.GoalId,
                ProjectId = request.ProjectId,
                Title = title,
                Description = description,
                PlannedDate = request.PlannedDate,
                Deadline = request.Deadline,
                SequenceId = request.SequenceId,
                SequenceOrder = request.SequenceOrder,
                IsProtected = request.IsProtected,
                ProtectionReasonCode = request.IsProtected ? ProtectionReasonCodes.User : null,
                CreatedAt = now,
                UpdatedAt = now
            });
            return new CommandMutation("Task", id, 1, TaskEventTypes.TaskCreated, 1,
                CreatedPayload(request.GoalId, request.ProjectId, request.PlannedDate, request.SequenceId), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(result.AggregateId!.Value, cancellationToken);
    }

    public async Task<TaskDto> UpdateAsync(Guid id, UpdateTaskRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        ValidateShape(request.GoalId, request.ProjectId, request.PlannedDate, request.Deadline,
            request.SequenceId, request.SequenceOrder, true);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "UPDATE_TASK",
            new
            {
                id, title, description, request.GoalId, request.ProjectId, request.PlannedDate,
                request.Deadline, request.SequenceId, request.SequenceOrder, request.ExpectedVersion,
                request.IsProtected
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Tasks.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Task", id);
            await LockParentsAsync(context, owner,
                [(snapshot.GoalId, snapshot.ProjectId), (request.GoalId, request.ProjectId)],
                request.GoalId, request.ProjectId, ct);
            await LockSequencesAsync(context,
                new[] { snapshot.SequenceId, request.SequenceId }.OfType<Guid>(), ct);
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != TaskStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            if (request.SequenceId is { } sequenceId)
                await RequireSequencePlacementAsync(context, owner, sequenceId,
                    request.SequenceOrder!.Value, request.GoalId, request.ProjectId, id, ct);

            var changed = new List<string>();
            if (item.Title != title) { item.Title = title; changed.Add("title"); }
            if (item.Description != description) { item.Description = description; changed.Add("description"); }
            if (item.GoalId != request.GoalId) { item.GoalId = request.GoalId; changed.Add("goalId"); }
            if (item.ProjectId != request.ProjectId) { item.ProjectId = request.ProjectId; changed.Add("projectId"); }
            if (item.PlannedDate != request.PlannedDate) { item.PlannedDate = request.PlannedDate; changed.Add("plannedDate"); }
            if (item.Deadline != request.Deadline) { item.Deadline = request.Deadline; changed.Add("deadline"); }
            if (item.SequenceId != request.SequenceId) { item.SequenceId = request.SequenceId; changed.Add("sequenceId"); }
            if (item.SequenceOrder != request.SequenceOrder) { item.SequenceOrder = request.SequenceOrder; changed.Add("sequenceOrder"); }
            if (request.IsProtected is { } isProtected && item.IsProtected != isProtected)
            {
                item.IsProtected = isProtected;
                item.ProtectionReasonCode = isProtected ? ProtectionReasonCodes.User : null;
                changed.Add("isProtected");
            }
            if (changed.Count == 0) throw new CommandRejectedException("NO_CHANGES");
            item.Version++;
            item.UpdatedAt = now;
            return new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskUpdated, 1,
                JsonSerializer.Serialize(new { changedFields = changed }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<TaskDto> CompleteAsync(Guid id, CompleteTaskRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        if (request.CompletedForLocalDate > dates.Today)
            throw new ArgumentException("completedForLocalDate cannot be in the future.");
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "COMPLETE_TASK",
            new { id, request.ExpectedVersion, request.CompletedForLocalDate }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Tasks.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Task", id);
            if (snapshot.SequenceId is { } sequenceId)
                await LockSequencesAsync(context, [sequenceId], ct);
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != TaskStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            if (await HasUnresolvedPredecessorAsync(context, item, ct))
                throw new CommandRejectedException("TASK_BLOCKED");
            item.Status = TaskStatuses.Completed;
            item.CompletedForLocalDate = request.CompletedForLocalDate;
            item.TerminalAt = now;
            item.UpdatedAt = now;
            item.Version++;
            return new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskCompleted, 1,
                "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<TaskDto> DropAsync(Guid id, DropTaskRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "DROP_TASK",
            new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != TaskStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            Drop(item, now);
            return new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskDropped, 1,
                "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    /// <summary>
    /// Carry: an explicit move of a dated Task to another planned date. It never moves other
    /// Tasks, including later members of the same sequence.
    /// </summary>
    public async Task<TaskDto> CarryAsync(Guid id, CarryTaskRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var today = dates.Today;
        if (request.PlannedDate < today)
            throw new ArgumentException("plannedDate cannot be in the past.");
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CARRY_TASK",
            new { id, request.ExpectedVersion, request.PlannedDate }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != TaskStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            if (item.PlannedDate is null) throw new CommandRejectedException("TASK_NOT_SCHEDULED");
            if (item.PlannedDate == request.PlannedDate) throw new CommandRejectedException("NO_CHANGES");
            if (item.Deadline is { } deadline && request.PlannedDate > deadline)
                throw new CommandRejectedException("DEADLINE_EXCEEDED");
            var payload = Carry(item, request.PlannedDate, today, now, TaskCarryScopes.Task);
            return new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskCarried, 1,
                payload, now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    /// <summary>Moves a locked dated Task and returns its TASK_CARRIED payload.</summary>
    internal static string Carry(TaskItem item, DateOnly plannedDate, DateOnly today,
        DateTimeOffset now, string scope)
    {
        var wasDue = item.PlannedDate <= today;
        item.PlannedDate = plannedDate;
        item.UpdatedAt = now;
        item.Version++;
        return JsonSerializer.Serialize(new { scope, wasDue });
    }

    internal static void Drop(TaskItem item, DateTimeOffset now)
    {
        item.Status = TaskStatuses.Dropped;
        item.CompletedForLocalDate = null;
        item.TerminalAt = now;
        item.UpdatedAt = now;
        item.Version++;
    }

    internal static string CreatedPayload(Guid? goalId, Guid? projectId, DateOnly? plannedDate,
        Guid? sequenceId) => JsonSerializer.Serialize(new
    {
        source = CreationSources.Manual,
        parentScope = Scope(goalId, projectId),
        hasPlannedDate = plannedDate is not null,
        inSequence = sequenceId is not null
    });

    public async Task<TaskDto> RestoreAsync(Guid id, RestoreTaskRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "RESTORE_TASK",
            new { id, request.ExpectedVersion, request.PlannedDate }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Tasks.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Task", id);
            ValidateShape(snapshot.GoalId, snapshot.ProjectId, request.PlannedDate, snapshot.Deadline,
                snapshot.SequenceId, snapshot.SequenceOrder, true);
            await LockParentsAsync(context, owner, [(snapshot.GoalId, snapshot.ProjectId)],
                snapshot.GoalId, snapshot.ProjectId, ct);
            if (snapshot.SequenceId is { } sequenceId)
                await LockSequencesAsync(context, [sequenceId], ct);
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status == TaskStatuses.Active)
                throw new CommandRejectedException("RESOURCE_ALREADY_ACTIVE");
            item.Status = TaskStatuses.Active;
            item.PlannedDate = request.PlannedDate;
            item.CompletedForLocalDate = null;
            item.TerminalAt = null;
            item.UpdatedAt = now;
            item.Version++;
            var payload = JsonSerializer.Serialize(new
            {
                parentScope = Scope(item.GoalId, item.ProjectId),
                hasPlannedDate = item.PlannedDate is not null
            });
            return new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskRestored, 1,
                payload, now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<TaskItem> OwnedAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Tasks.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("Task", id);

    internal static async Task<TaskItem> LockOwnedAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.Tasks.FromSqlInterpolated($"SELECT * FROM \"Tasks\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Task", id);

    private async Task<IReadOnlyList<TaskDto>> ToDtosAsync(IReadOnlyList<TaskItem> items,
        CancellationToken cancellationToken)
    {
        var sequenceIds = items.Where(x => x.Status == TaskStatuses.Active && x.SequenceId is not null)
            .Select(x => x.SequenceId!.Value).Distinct().ToArray();
        var unresolved = sequenceIds.Length == 0
            ? []
            : await db.Tasks.AsNoTracking()
                .Where(x => x.UserId == currentUser.UserId && x.SequenceId != null &&
                    sequenceIds.Contains(x.SequenceId.Value) && x.Status != TaskStatuses.Completed)
                .OrderBy(x => x.SequenceOrder).ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);
        var bySequence = unresolved.GroupBy(x => x.SequenceId!.Value)
            .ToDictionary(x => x.Key, x => x.ToArray());
        var signals = await TaskHistory.LoadAsync(db, currentUser.UserId,
            items.Select(x => x.Id).ToArray(), cancellationToken);
        return items.Select(item =>
        {
            var blockers = item.Status == TaskStatuses.Active && item.SequenceId is { } sequenceId &&
                item.SequenceOrder is { } order && bySequence.TryGetValue(sequenceId, out var members)
                ? members.Where(x => x.SequenceOrder < order).Select(x =>
                    new TaskDependencyDto(x.Id, x.Title, x.Status, x.Version)).ToArray()
                : [];
            return ToDto(item, blockers, signals.GetValueOrDefault(item.Id, TaskSignals.None).CarryCount);
        }).ToArray();
    }

    private static TaskDto ToDto(TaskItem value, IReadOnlyList<TaskDependencyDto> blockers,
        int carryCount) =>
        new(value.Id, value.GoalId, value.ProjectId, value.Title, value.Description, value.Status,
            value.PlannedDate, value.Deadline, value.SequenceId, value.SequenceOrder,
            blockers.Count > 0, blockers, value.IsProtected, carryCount, value.CompletedForLocalDate,
            value.Source, value.Version, value.CreatedAt, value.UpdatedAt, value.TerminalAt);

    internal static void ValidateShape(Guid? goalId, Guid? projectId, DateOnly? plannedDate,
        DateOnly? deadline, Guid? sequenceId, int? sequenceOrder, bool active)
    {
        if (goalId is not null && projectId is not null)
            throw new ArgumentException("A Task may belong to a Goal or a Project, not both.");
        if (active && goalId is null && projectId is null && plannedDate is null)
            throw new ArgumentException("A standalone active Task requires plannedDate.");
        if ((sequenceId is null) != (sequenceOrder is null) || sequenceOrder is <= 0)
            throw new ArgumentException("sequenceId and positive sequenceOrder must be provided together.");
        if (plannedDate is not null && deadline is not null && plannedDate > deadline)
            throw new ArgumentException("plannedDate cannot be after deadline.");
    }

    private static Task LockParentsAsync(AppDbContext context, Guid owner,
        IEnumerable<(Guid? GoalId, Guid? ProjectId)> scopes, Guid? requestedGoalId,
        Guid? requestedProjectId, CancellationToken cancellationToken) =>
        ParentCommandSupport.LockParentsAsync(context, owner, scopes, requestedGoalId,
            requestedProjectId, cancellationToken);

    internal static async Task LockSequencesAsync(AppDbContext context, IEnumerable<Guid> sequenceIds,
        CancellationToken cancellationToken)
    {
        foreach (var key in sequenceIds.Distinct().Order().Select(SequenceLockKey))
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock({key})", cancellationToken);
    }

    private static long SequenceLockKey(Guid sequenceId) =>
        BitConverter.ToInt64(sequenceId.ToByteArray(), 0);

    private static async Task RequireSequencePlacementAsync(AppDbContext context, Guid owner,
        Guid sequenceId, int sequenceOrder, Guid? goalId, Guid? projectId, Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var members = await context.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && x.SequenceId == sequenceId && x.Id != excludeId)
            .Select(x => new { x.GoalId, x.ProjectId, x.SequenceOrder })
            .ToListAsync(cancellationToken);
        if (members.Any(x => x.GoalId != goalId || x.ProjectId != projectId))
            throw new CommandRejectedException("SEQUENCE_SCOPE_MISMATCH");
        if (members.Any(x => x.SequenceOrder == sequenceOrder))
            throw new CommandRejectedException("SEQUENCE_ORDER_CONFLICT");
    }

    private static Task<bool> HasUnresolvedPredecessorAsync(AppDbContext context, TaskItem item,
        CancellationToken cancellationToken) => item.SequenceId is not { } sequenceId ||
            item.SequenceOrder is not { } order
        ? Task.FromResult(false)
        : context.Tasks.AsNoTracking().AnyAsync(x => x.UserId == item.UserId &&
            x.SequenceId == sequenceId && x.SequenceOrder < order &&
            x.Status != TaskStatuses.Completed, cancellationToken);

    private static string Scope(Guid? goalId, Guid? projectId) =>
        ParentCommandSupport.ParentScope(goalId, projectId);
}
