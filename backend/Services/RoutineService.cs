using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Routines;
using TidySense.Models;

namespace TidySense.Services;

public sealed class RoutineService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands)
{
    // Catch-up after an absence is complete but bounded per evaluation; later evaluations continue it.
    private const int BackfillDatesPerRoutine = 31;
    private const int BackfillDatesPerEvaluation = 124;

    public async Task<CursorPageDto<RoutineDto>> ListAsync(string? status, string? cursor, int limit,
        CancellationToken cancellationToken)
    {
        if (status is not null && !RoutineStatuses.IsKnown(status))
            throw new ArgumentException("status is invalid.");
        var after = ParentCommandSupport.DecodeCursor(cursor);
        var query = db.Routines.AsNoTracking().Where(x => x.UserId == currentUser.UserId);
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
        return new CursorPageDto<RoutineDto>(await ToDtosAsync(rows, cancellationToken),
            new PageInfoDto(next, hasMore));
    }

    public async Task<RoutineDto> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        (await ToDtosAsync([await OwnedAsync(id, cancellationToken)], cancellationToken))[0];

    public Task<RoutineDto> CreateAsync(CreateRoutineRequest request, string idempotencyKey,
        CancellationToken cancellationToken) =>
        CreateCoreAsync(request, null, idempotencyKey, cancellationToken);

    /// <summary>"Resume" in the UI: the stopped Routine stays stopped and a new Routine continues it.</summary>
    public Task<RoutineDto> ContinueAsync(Guid sourceId, CreateRoutineRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        if (request.EffectiveFromLocalDate is null)
            throw new ArgumentException("effectiveFromLocalDate is required for a continuation.");
        return CreateCoreAsync(request, sourceId, idempotencyKey, cancellationToken);
    }

    private async Task<RoutineDto> CreateCoreAsync(CreateRoutineRequest request, Guid? sourceId,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        RequireExclusiveParent(request.GoalId, request.ProjectId);
        var recurrence = RoutineSchedule.Validate(request.Recurrence?.Type,
            request.Recurrence?.DaysOfWeek, request.Recurrence?.DayOfMonth);
        var times = RoutineSchedule.NormalizeTimes(request.TimesOfDay);
        var now = dates.UtcNow;
        var today = dates.Today;
        var effectiveFrom = request.EffectiveFromLocalDate ?? today;
        if (effectiveFrom < today)
            throw new ArgumentException("effectiveFromLocalDate cannot be in the past.");
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            sourceId is null ? "CREATE_ROUTINE" : "CREATE_ROUTINE_CONTINUATION",
            new
            {
                sourceId, title, description, request.GoalId, request.ProjectId,
                recurrence = RoutineSchedule.Serialize(recurrence), times,
                request.EffectiveFromLocalDate
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            await ParentCommandSupport.LockParentsAsync(context, owner,
                [(request.GoalId, request.ProjectId)], request.GoalId, request.ProjectId, ct);
            if (sourceId is { } source)
            {
                var stopped = await LockOwnedAsync(context, source, owner, ct);
                if (stopped.Status != RoutineStatuses.Stopped)
                    throw new CommandRejectedException("CONTINUATION_SOURCE_NOT_STOPPED");
                if (await context.Routines.AsNoTracking().AnyAsync(
                        x => x.ContinuationOfRoutineId == source, ct))
                    throw new CommandRejectedException("CONTINUATION_EXISTS");
            }
            context.Routines.Add(new Routine
            {
                Id = id,
                UserId = owner,
                GoalId = request.GoalId,
                ProjectId = request.ProjectId,
                ContinuationOfRoutineId = sourceId,
                Title = title,
                Description = description,
                RecurrenceDefinition = RoutineSchedule.Serialize(recurrence),
                RecurrenceTimezone = dates.TimeZoneId,
                TimesOfDay = times,
                EffectiveFromLocalDate = effectiveFrom,
                CreatedAt = now,
                UpdatedAt = now
            });
            var payload = JsonSerializer.Serialize(new
            {
                source = CreationSources.Manual,
                parentScope = ParentCommandSupport.ParentScope(request.GoalId, request.ProjectId),
                recurrenceType = recurrence.Type,
                slotCount = times.Length
            });
            return new CommandMutation("Routine", id, 1,
                sourceId is null ? RoutineEventTypes.RoutineCreated : RoutineEventTypes.RoutineContinuationCreated,
                1, payload, now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(result.AggregateId!.Value, cancellationToken);
    }

    public async Task<RoutineDto> UpdateAsync(Guid id, UpdateRoutineRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var description = ParentCommandSupport.OptionalText(request.Description, 2000, "description");
        RequireExclusiveParent(request.GoalId, request.ProjectId);
        var recurrence = RoutineSchedule.Validate(request.Recurrence?.Type,
            request.Recurrence?.DaysOfWeek, request.Recurrence?.DayOfMonth);
        var definition = RoutineSchedule.Serialize(recurrence);
        var times = RoutineSchedule.NormalizeTimes(request.TimesOfDay);
        var now = dates.UtcNow;
        var today = dates.Today;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "UPDATE_ROUTINE",
            new
            {
                id, title, description, request.GoalId, request.ProjectId, recurrence = definition,
                times, request.ExpectedVersion
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Routines.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Routine", id);
            await ParentCommandSupport.LockParentsAsync(context, owner,
                [(snapshot.GoalId, snapshot.ProjectId), (request.GoalId, request.ProjectId)],
                request.GoalId, request.ProjectId, ct);
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != RoutineStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");

            var changed = new List<string>();
            if (item.Title != title) { item.Title = title; changed.Add("title"); }
            if (item.Description != description) { item.Description = description; changed.Add("description"); }
            if (item.GoalId != request.GoalId) { item.GoalId = request.GoalId; changed.Add("goalId"); }
            if (item.ProjectId != request.ProjectId) { item.ProjectId = request.ProjectId; changed.Add("projectId"); }
            var recurrenceChanged =
                RoutineSchedule.Serialize(RoutineSchedule.Parse(item.RecurrenceDefinition)) != definition;
            var timesChanged = !item.TimesOfDay.SequenceEqual(times);
            if (recurrenceChanged || timesChanged)
            {
                // Schedule edits are prospective: every slot up to and including today is fixed
                // under the old definition first, so the new one starts on the next local date.
                Materialize(context, item, await ExistingSlotsAsync(context, item, today, ct),
                    today, null, now);
                if (recurrenceChanged) { item.RecurrenceDefinition = definition; changed.Add("recurrence"); }
                if (timesChanged) { item.TimesOfDay = times; changed.Add("timesOfDay"); }
            }
            if (changed.Count == 0) throw new CommandRejectedException("NO_CHANGES");
            item.Version++;
            item.UpdatedAt = now;
            return recurrenceChanged || timesChanged
                ? new CommandMutation("Routine", id, item.Version, RoutineEventTypes.RoutineRecurrenceChanged, 1,
                    JsonSerializer.Serialize(new
                    {
                        changedFields = changed, recurrenceType = recurrence.Type, slotCount = times.Length
                    }), now)
                : new CommandMutation("Routine", id, item.Version, RoutineEventTypes.RoutineUpdated, 1,
                    JsonSerializer.Serialize(new { changedFields = changed }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<RoutineDto> StopAsync(Guid id, StopRoutineRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        // Stopping an already stopped Routine is a no-op success: no event, no version change.
        if ((await OwnedAsync(id, cancellationToken)).Status == RoutineStatuses.Stopped)
            return await GetByIdAsync(id, cancellationToken);
        var now = dates.UtcNow;
        var today = dates.Today;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "STOP_ROUTINE",
            new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var item = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != RoutineStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            Stop(item, today, now);
            return new CommandMutation("Routine", id, item.Version, RoutineEventTypes.RoutineStopped, 1,
                StoppedPayload(RoutineStopCauses.User), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    /// <summary>
    /// Stops a locked Routine. Its final eligible local date is today, so an occurrence that
    /// already belongs to today stays resolvable and nothing later is ever generated.
    /// </summary>
    internal static void Stop(Routine routine, DateOnly today, DateTimeOffset now)
    {
        routine.Status = RoutineStatuses.Stopped;
        routine.StoppedAt = now;
        routine.EffectiveUntilLocalDate = today >= routine.EffectiveFromLocalDate
            ? today : routine.EffectiveFromLocalDate.AddDays(-1);
        routine.UpdatedAt = now;
        routine.Version++;
    }

    internal static string StoppedPayload(string cause) => JsonSerializer.Serialize(new { cause });

    public async Task<CursorPageDto<RoutineOccurrenceDto>> ListOccurrencesAsync(Guid routineId,
        string? cursor, int limit, CancellationToken cancellationToken)
    {
        var routine = await OwnedAsync(routineId, cancellationToken);
        var after = DecodeOccurrenceCursor(cursor);
        await EvaluateAsync(dates.LocalNow, cancellationToken);
        var query = db.RoutineOccurrences.AsNoTracking().Where(x => x.RoutineId == routineId);
        if (after is { } point)
        {
            var date = point.Date;
            if (point.Time is { } time)
                query = query.Where(x => x.ScheduledLocalDate < date ||
                    (x.ScheduledLocalDate == date && x.ScheduledLocalTime < time));
            else
                query = query.Where(x => x.ScheduledLocalDate < date);
        }
        // A local date holds either one untimed occurrence or timed ones, so (date, time) is a stable order.
        var rows = await query.OrderByDescending(x => x.ScheduledLocalDate)
            .ThenByDescending(x => x.ScheduledLocalTime).ThenByDescending(x => x.Id)
            .Take(limit + 1).ToListAsync(cancellationToken);
        var hasMore = rows.Count > limit;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        var next = hasMore && rows.Count > 0
            ? EncodeOccurrenceCursor(rows[^1].ScheduledLocalDate, rows[^1].ScheduledLocalTime) : null;
        return new CursorPageDto<RoutineOccurrenceDto>(
            rows.Select(x => ToDto(x, routine.Title)).ToArray(), new PageInfoDto(next, hasMore));
    }

    /// <summary>Every occurrence scheduled for the local date, resolved or not, grouped by Routine.</summary>
    public async Task<IReadOnlyList<RoutineOccurrenceDto>> TodayOccurrencesAsync(DateOnly today,
        CancellationToken cancellationToken)
    {
        var rows = await db.RoutineOccurrences.AsNoTracking()
            .Where(x => x.Routine.UserId == currentUser.UserId && x.ScheduledLocalDate == today)
            .OrderBy(x => x.Routine.CreatedAt).ThenBy(x => x.RoutineId)
            .ThenBy(x => x.ScheduledLocalTime).ThenBy(x => x.Id)
            .Select(x => new { Occurrence = x, x.Routine.Title })
            .ToListAsync(cancellationToken);
        return rows.Select(x => ToDto(x.Occurrence, x.Title)).ToArray();
    }

    public async Task<RoutineOccurrenceDto> CompleteOccurrenceAsync(Guid id,
        CompleteOccurrenceRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var localNow = dates.LocalNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "COMPLETE_ROUTINE_OCCURRENCE", new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var item = await LockOwnedOccurrenceAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status != OccurrenceStatuses.Pending)
                throw new CommandRejectedException("OCCURRENCE_NOT_PENDING");
            // The boundary may have passed without an evaluation; a missed slot is corrected, not completed.
            var sameDaySlots = await context.RoutineOccurrences.AsNoTracking()
                .Where(x => x.RoutineId == item.RoutineId &&
                    x.ScheduledLocalDate == item.ScheduledLocalDate && x.ScheduledLocalTime != null)
                .Select(x => x.ScheduledLocalTime!.Value).ToListAsync(ct);
            if (RoutineSchedule.IsMissed(item.ScheduledLocalDate, item.ScheduledLocalTime, sameDaySlots,
                    localNow.Date, localNow.Time))
                throw new CommandRejectedException("OCCURRENCE_MISSED");
            item.Status = OccurrenceStatuses.Done;
            item.ResolvedAt = now;
            item.UpdatedAt = now;
            item.Version++;
            return new CommandMutation("RoutineOccurrence", id, item.Version,
                RoutineEventTypes.OccurrenceDone, 1, "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await OccurrenceByIdAsync(id, cancellationToken);
    }

    /// <summary>Historical correction between DONE and MISSED. The scheduled date and slot never change.</summary>
    public async Task<RoutineOccurrenceDto> CorrectOccurrenceAsync(Guid id,
        CorrectOccurrenceRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey,
            "CORRECT_ROUTINE_OCCURRENCE", new { id, request.TargetStatus, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var item = await LockOwnedOccurrenceAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, item.Version);
            if (item.Status == OccurrenceStatuses.Pending)
                throw new CommandRejectedException("OCCURRENCE_NOT_RESOLVED");
            if (item.Status == request.TargetStatus) throw new CommandRejectedException("NO_CHANGES");
            var previous = item.Status;
            item.Status = request.TargetStatus;
            item.ResolvedAt = now;
            item.UpdatedAt = now;
            item.Version++;
            return new CommandMutation("RoutineOccurrence", id, item.Version,
                RoutineEventTypes.OccurrenceCorrected, 1,
                JsonSerializer.Serialize(new { previousStatus = previous, newStatus = item.Status }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await OccurrenceByIdAsync(id, cancellationToken);
    }

    /// <summary>
    /// Lazy temporal processing for the current user, run when an execution view is assembled.
    /// It creates each due occurrence exactly once and resolves pending ones whose boundary has
    /// passed. Routines are locked while their slots are generated, so concurrent evaluations
    /// serialize; the filtered unique indexes remain the database backstop.
    /// </summary>
    public async Task EvaluateAsync((DateOnly Date, TimeOnly Time) localNow,
        CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var today = localNow.Date;
        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var routines = await db.Routines.FromSqlInterpolated($"""
            SELECT * FROM "Routines"
            WHERE "UserId" = {owner} AND "EffectiveFromLocalDate" <= {today}
              AND ("MaterializedThroughLocalDate" IS NULL
                   OR "MaterializedThroughLocalDate" < LEAST({today}, COALESCE("EffectiveUntilLocalDate", {today})))
            ORDER BY "Id" FOR UPDATE
            """).ToListAsync(cancellationToken);
        var budget = BackfillDatesPerEvaluation;
        foreach (var routine in routines)
            budget -= Materialize(db, routine,
                await ExistingSlotsAsync(db, routine, today, cancellationToken), today,
                Math.Min(budget, BackfillDatesPerRoutine), now);
        await db.SaveChangesAsync(cancellationToken);

        var pending = await db.RoutineOccurrences.FromSqlInterpolated($"""
            SELECT o.* FROM "RoutineOccurrences" o
            JOIN "Routines" r ON r."Id" = o."RoutineId"
            WHERE r."UserId" = {owner} AND o."Status" = 'PENDING' AND o."ScheduledLocalDate" <= {today}
            ORDER BY o."Id" FOR UPDATE OF o
            """).ToListAsync(cancellationToken);
        var timedToday = pending.Where(x => x.ScheduledLocalDate == today && x.ScheduledLocalTime is not null)
            .Select(x => x.RoutineId).Distinct().ToArray();
        var slotsToday = timedToday.Length == 0
            ? []
            : await db.RoutineOccurrences.AsNoTracking()
                .Where(x => timedToday.Contains(x.RoutineId) && x.ScheduledLocalDate == today &&
                    x.ScheduledLocalTime != null)
                .Select(x => new { x.RoutineId, Time = x.ScheduledLocalTime!.Value })
                .ToListAsync(cancellationToken);
        var slotsByRoutine = slotsToday.ToLookup(x => x.RoutineId, x => x.Time);
        foreach (var occurrence in pending)
        {
            if (!RoutineSchedule.IsMissed(occurrence.ScheduledLocalDate, occurrence.ScheduledLocalTime,
                    slotsByRoutine[occurrence.RoutineId], today, localNow.Time)) continue;
            occurrence.Status = OccurrenceStatuses.Missed;
            occurrence.ResolvedAt = now;
            occurrence.UpdatedAt = now;
            occurrence.Version++;
            AddSystemEvent(db, owner, RoutineEventTypes.OccurrenceMissed, occurrence.Id,
                occurrence.Version, "{}", now);
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    /// <summary>Slots that already exist after the watermark (today's may exist ahead of the backfill).</summary>
    private static async Task<HashSet<(DateOnly Date, TimeOnly? Time)>> ExistingSlotsAsync(
        AppDbContext context, Routine routine, DateOnly today, CancellationToken cancellationToken)
    {
        var start = routine.MaterializedThroughLocalDate?.AddDays(1) ?? routine.EffectiveFromLocalDate;
        var rows = await context.RoutineOccurrences.AsNoTracking()
            .Where(x => x.RoutineId == routine.Id && x.ScheduledLocalDate >= start &&
                x.ScheduledLocalDate <= today)
            .Select(x => new { x.ScheduledLocalDate, x.ScheduledLocalTime })
            .ToListAsync(cancellationToken);
        return rows.Select(x => (x.ScheduledLocalDate, x.ScheduledLocalTime)).ToHashSet();
    }

    /// <summary>
    /// Generates the missing slots of a locked Routine: today's first, then the oldest
    /// unmaterialized dates up to <paramref name="backfillLimit"/> (null = all of them).
    /// Never generates outside the inclusive effective range or after today.
    /// Returns the number of backfill dates consumed.
    /// </summary>
    private static int Materialize(AppDbContext context, Routine routine,
        HashSet<(DateOnly Date, TimeOnly? Time)> existing, DateOnly today, int? backfillLimit,
        DateTimeOffset now)
    {
        var end = routine.EffectiveUntilLocalDate is { } until && until < today ? until : today;
        var start = routine.MaterializedThroughLocalDate?.AddDays(1) ?? routine.EffectiveFromLocalDate;
        if (start > end)
        {
            // Nothing is left inside a closed range; record that so the Routine is not revisited.
            if (routine.EffectiveUntilLocalDate is not null) routine.MaterializedThroughLocalDate = end;
            return 0;
        }
        var last = backfillLimit is { } limit
            ? (limit <= 0 ? start.AddDays(-1) : Earlier(end, start.AddDays(limit - 1)))
            : end;
        var recurrence = RoutineSchedule.Parse(routine.RecurrenceDefinition);
        var slots = RoutineSchedule.SlotsFor(routine.TimesOfDay);
        var targets = new List<DateOnly>();
        if (end == today && last < today) targets.Add(today);
        for (var date = start; date <= last; date = date.AddDays(1)) targets.Add(date);
        foreach (var date in targets)
        {
            if (!RoutineSchedule.IsEligible(routine.EffectiveFromLocalDate, routine.EffectiveUntilLocalDate, date) ||
                !RoutineSchedule.OccursOn(recurrence, date)) continue;
            foreach (var slot in slots)
            {
                if (!existing.Add((date, slot))) continue;
                var occurrence = new RoutineOccurrence
                {
                    Id = Guid.NewGuid(), RoutineId = routine.Id, ScheduledLocalDate = date,
                    ScheduledLocalTime = slot, CreatedAt = now, UpdatedAt = now
                };
                context.RoutineOccurrences.Add(occurrence);
                AddSystemEvent(context, routine.UserId, RoutineEventTypes.OccurrenceCreated, occurrence.Id,
                    1, JsonSerializer.Serialize(new { timed = slot is not null }), now);
            }
        }
        if (last < start) return 0;
        routine.MaterializedThroughLocalDate = last;
        return last.DayNumber - start.DayNumber + 1;
    }

    private static DateOnly Earlier(DateOnly first, DateOnly second) => first < second ? first : second;

    /// <summary>A durable event for a deterministic system consequence, with its outbox intent.</summary>
    private static void AddSystemEvent(AppDbContext context, Guid userId, string eventType,
        Guid occurrenceId, long version, string payloadJson, DateTimeOffset now)
    {
        var domainEvent = new DomainEvent
        {
            EventId = Guid.NewGuid(), EventType = eventType, EventVersion = 1, OccurredAt = now,
            RecordedAt = now, UserId = userId, Actor = "SYSTEM_DETERMINISTIC",
            AggregateType = "RoutineOccurrence", AggregateId = occurrenceId, AggregateVersion = version,
            TransactionId = Guid.NewGuid(), CorrelationId = Guid.NewGuid().ToString("N"),
            PayloadJson = payloadJson
        };
        context.DomainEvents.Add(domainEvent);
        context.OutboxMessages.Add(new OutboxMessage
        {
            Id = Guid.NewGuid(), EventId = domainEvent.EventId, CreatedAt = now
        });
    }

    private async Task<Routine> OwnedAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Routines.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("Routine", id);

    private async Task<RoutineOccurrenceDto> OccurrenceByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.RoutineOccurrences.AsNoTracking()
            .Where(x => x.Id == id && x.Routine.UserId == currentUser.UserId)
            .Select(x => new { Occurrence = x, x.Routine.Title })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new ResourceNotFoundException("RoutineOccurrence", id);
        return ToDto(row.Occurrence, row.Title);
    }

    internal static async Task<Routine> LockOwnedAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.Routines.FromSqlInterpolated($"SELECT * FROM \"Routines\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Routine", id);

    private static async Task<RoutineOccurrence> LockOwnedOccurrenceAsync(AppDbContext context, Guid id,
        Guid userId, CancellationToken cancellationToken) =>
        await context.RoutineOccurrences.FromSqlInterpolated($"""
            SELECT o.* FROM "RoutineOccurrences" o
            JOIN "Routines" r ON r."Id" = o."RoutineId"
            WHERE o."Id" = {id} AND r."UserId" = {userId} FOR UPDATE OF o
            """).SingleOrDefaultAsync(cancellationToken)
        ?? throw new ResourceNotFoundException("RoutineOccurrence", id);

    private async Task<IReadOnlyList<RoutineDto>> ToDtosAsync(IReadOnlyList<Routine> items,
        CancellationToken cancellationToken)
    {
        var stoppedIds = items.Where(x => x.Status == RoutineStatuses.Stopped).Select(x => x.Id).ToArray();
        var continuedBy = stoppedIds.Length == 0
            ? []
            : await db.Routines.AsNoTracking()
                .Where(x => x.UserId == currentUser.UserId && x.ContinuationOfRoutineId != null &&
                    stoppedIds.Contains(x.ContinuationOfRoutineId.Value))
                .ToDictionaryAsync(x => x.ContinuationOfRoutineId!.Value, x => x.Id, cancellationToken);
        return items.Select(value =>
        {
            var recurrence = RoutineSchedule.Parse(value.RecurrenceDefinition);
            return new RoutineDto(value.Id, value.GoalId, value.ProjectId, value.ContinuationOfRoutineId,
                continuedBy.TryGetValue(value.Id, out var next) ? next : null, value.Title,
                value.Description, value.Status,
                new RecurrenceDto(recurrence.Type,
                    recurrence.DaysOfWeek.Count > 0 ? recurrence.DaysOfWeek : null, recurrence.DayOfMonth),
                value.TimesOfDay, value.RecurrenceTimezone, value.EffectiveFromLocalDate,
                value.EffectiveUntilLocalDate, value.Source, value.Version, value.CreatedAt,
                value.UpdatedAt, value.StoppedAt);
        }).ToArray();
    }

    private static RoutineOccurrenceDto ToDto(RoutineOccurrence value, string routineTitle) =>
        new(value.Id, value.RoutineId, routineTitle, value.ScheduledLocalDate, value.ScheduledLocalTime,
            value.Status, value.ResolvedAt, value.Version);

    private static void RequireExclusiveParent(Guid? goalId, Guid? projectId)
    {
        if (goalId is not null && projectId is not null)
            throw new ArgumentException("A Routine may belong to a Goal or a Project, not both.");
    }

    private static string EncodeOccurrenceCursor(DateOnly date, TimeOnly? time) =>
        WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(
            $"{date:yyyy-MM-dd}|{time?.ToString("HH:mm", CultureInfo.InvariantCulture)}"));

    private static (DateOnly Date, TimeOnly? Time)? DecodeOccurrenceCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return null;
        try
        {
            var parts = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(cursor)).Split('|');
            if (parts.Length != 2 || !DateOnly.TryParseExact(parts[0], "yyyy-MM-dd",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                throw new FormatException();
            if (parts[1].Length == 0) return (date, null);
            if (!TimeOnly.TryParseExact(parts[1], "HH:mm", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var time)) throw new FormatException();
            return (date, time);
        }
        catch (Exception exception) when (exception is FormatException or ArgumentException)
        {
            throw new ArgumentException("cursor is invalid.");
        }
    }
}
