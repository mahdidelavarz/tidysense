using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Captures;
using TidySense.DTOs.Common;
using TidySense.Models;

namespace TidySense.Services;

public sealed class CaptureService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands)
{
    public async Task<CursorPageDto<CaptureDto>> ListAsync(string? status, string? cursor, int limit,
        CancellationToken cancellationToken)
    {
        if (status is not null && !CaptureStatuses.IsKnown(status))
            throw new ArgumentException("status is invalid.");
        var after = ParentCommandSupport.DecodeCursor(cursor);
        var query = db.Captures.AsNoTracking().Where(x => x.UserId == currentUser.UserId);
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
        return new CursorPageDto<CaptureDto>(rows.Select(ToDto).ToArray(), new PageInfoDto(next, hasMore));
    }

    public async Task<CaptureDto> CreateAsync(CreateCaptureRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var now = dates.UtcNow;
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CREATE_CAPTURE",
            new { title }, now);
        var result = await commands.ExecuteAsync(identity, (context, owner, _) =>
        {
            context.Captures.Add(new CaptureItem
            {
                Id = id, UserId = owner, Title = title, CreatedAt = now, UpdatedAt = now
            });
            return Task.FromResult(new CommandMutation("Capture", id, 1, CaptureEventTypes.CaptureCreated,
                1, JsonSerializer.Serialize(new { source = CaptureSources.Manual }), now));
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return ToDto(await OwnedAsync(result.AggregateId!.Value, cancellationToken));
    }

    /// <summary>
    /// Resolution creates a new Task with its own identity. The capture row is never turned into
    /// the Task; the two are linked only by the shared transaction and correlation id.
    /// </summary>
    public async Task<CaptureResolutionDto> ResolveToTaskAsync(Guid id, ResolveCaptureToTaskRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var titleOverride = request.Title is null
            ? null : ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        TaskService.ValidateShape(request.GoalId, request.ProjectId, request.PlannedDate,
            request.Deadline, null, null, true);
        var now = dates.UtcNow;
        var taskId = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "RESOLVE_CAPTURE_TO_TASK", new
            {
                id, request.ExpectedVersion, title = titleOverride, description, request.GoalId,
                request.ProjectId, request.PlannedDate, request.Deadline
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await ParentCommandSupport.LockParentsAsync(context, owner,
                [(request.GoalId, request.ProjectId)], request.GoalId, request.ProjectId, ct);
            var capture = await LockUnresolvedAsync(context, id, owner, request.ExpectedVersion, ct);
            context.Tasks.Add(new TaskItem
            {
                Id = taskId, UserId = owner, GoalId = request.GoalId, ProjectId = request.ProjectId,
                Title = titleOverride ?? capture.Title, Description = description,
                PlannedDate = request.PlannedDate, Deadline = request.Deadline,
                CreatedAt = now, UpdatedAt = now
            });
            Resolve(capture, CaptureStatuses.Resolved, now);
            return new CommandMutation("Capture", id, capture.Version, CaptureEventTypes.CaptureResolved,
                1, JsonSerializer.Serialize(new { resolvedAs = "TASK" }), now,
                [new CascadeEvent("Task", taskId, 1, TaskEventTypes.TaskCreated, 1,
                    TaskService.CreatedPayload(request.GoalId, request.ProjectId, request.PlannedDate, null),
                    EventActors.User)]);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return new CaptureResolutionDto(ToDto(await OwnedAsync(id, cancellationToken)),
            await CreatedIdAsync(result.Id, "Task", cancellationToken), null);
    }

    public async Task<CaptureResolutionDto> ResolveToRoutineAsync(Guid id,
        ResolveCaptureToRoutineRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        var titleOverride = request.Title is null
            ? null : ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        if (request.GoalId is not null && request.ProjectId is not null)
            throw new ArgumentException("A Routine may belong to a Goal or a Project, not both.");
        var recurrence = RoutineSchedule.Validate(request.Recurrence?.Type,
            request.Recurrence?.DaysOfWeek, request.Recurrence?.DayOfMonth);
        var definition = RoutineSchedule.Serialize(recurrence);
        var times = RoutineSchedule.NormalizeTimes(request.TimesOfDay);
        var now = dates.UtcNow;
        var today = dates.Today;
        var effectiveFrom = request.EffectiveFromLocalDate ?? today;
        if (effectiveFrom < today)
            throw new ArgumentException("effectiveFromLocalDate cannot be in the past.");
        var routineId = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "RESOLVE_CAPTURE_TO_ROUTINE", new
            {
                id, request.ExpectedVersion, title = titleOverride, description, request.GoalId,
                request.ProjectId, recurrence = definition, times, request.EffectiveFromLocalDate
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await ParentCommandSupport.LockParentsAsync(context, owner,
                [(request.GoalId, request.ProjectId)], request.GoalId, request.ProjectId, ct);
            var capture = await LockUnresolvedAsync(context, id, owner, request.ExpectedVersion, ct);
            context.Routines.Add(new Routine
            {
                Id = routineId, UserId = owner, GoalId = request.GoalId, ProjectId = request.ProjectId,
                Title = titleOverride ?? capture.Title, Description = description,
                RecurrenceDefinition = definition, RecurrenceTimezone = dates.TimeZoneId,
                TimesOfDay = times, EffectiveFromLocalDate = effectiveFrom,
                CreatedAt = now, UpdatedAt = now
            });
            Resolve(capture, CaptureStatuses.Resolved, now);
            var routinePayload = JsonSerializer.Serialize(new
            {
                source = CreationSources.Manual,
                parentScope = ParentCommandSupport.ParentScope(request.GoalId, request.ProjectId),
                recurrenceType = recurrence.Type,
                slotCount = times.Length
            });
            return new CommandMutation("Capture", id, capture.Version, CaptureEventTypes.CaptureResolved,
                1, JsonSerializer.Serialize(new { resolvedAs = "ROUTINE" }), now,
                [new CascadeEvent("Routine", routineId, 1, RoutineEventTypes.RoutineCreated, 1,
                    routinePayload, EventActors.User)]);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return new CaptureResolutionDto(ToDto(await OwnedAsync(id, cancellationToken)), null,
            await CreatedIdAsync(result.Id, "Routine", cancellationToken));
    }

    /// <summary>The id recorded by the committed command, so a replay returns the original record.</summary>
    private Task<Guid> CreatedIdAsync(Guid commandResultId, string aggregateType,
        CancellationToken cancellationToken) => db.DomainEvents.AsNoTracking()
        .Where(x => x.CommandResultId == commandResultId && x.AggregateType == aggregateType)
        .Select(x => x.AggregateId).SingleAsync(cancellationToken);

    public async Task<CaptureDto> DiscardAsync(Guid id, DiscardCaptureRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "DISCARD_CAPTURE",
            new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var capture = await LockUnresolvedAsync(context, id, owner, request.ExpectedVersion, ct);
            Resolve(capture, CaptureStatuses.Discarded, now);
            return new CommandMutation("Capture", id, capture.Version, CaptureEventTypes.CaptureDiscarded,
                1, "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return ToDto(await OwnedAsync(id, cancellationToken));
    }

    private async Task<CaptureItem> OwnedAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Captures.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("Capture", id);

    private static async Task<CaptureItem> LockUnresolvedAsync(AppDbContext context, Guid id, Guid userId,
        long expectedVersion, CancellationToken cancellationToken)
    {
        var capture = await context.Captures.FromSqlInterpolated($"SELECT * FROM \"Captures\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Capture", id);
        VersionGuard.RequireMatch(id, expectedVersion, capture.Version);
        if (capture.Status != CaptureStatuses.Unresolved)
            throw new CommandRejectedException("CAPTURE_NOT_UNRESOLVED");
        return capture;
    }

    private static void Resolve(CaptureItem capture, string status, DateTimeOffset now)
    {
        capture.Status = status;
        capture.ResolvedAt = now;
        capture.UpdatedAt = now;
        capture.Version++;
    }

    internal static CaptureDto ToDto(CaptureItem value) => new(value.Id, value.Title, value.Status,
        value.Source, value.Version, value.CreatedAt, value.UpdatedAt, value.ResolvedAt);
}
