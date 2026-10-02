using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.DTOs.Projects;
using TidySense.DTOs.Routines;
using TidySense.DTOs.Today;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class RoutineModuleTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    // Every test pins the clock to a local day safely after the real time (see TestClock.Pin).
    private static readonly DateOnly Day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3);
    private static readonly object DailyRecurrence = new { type = "DAILY" };

    [Fact]
    public async Task Routine_creation_validates_shape_and_stays_owner_scoped()
    {
        PinLocal(Day, 10, 0);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var ownerClient = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var goal = await CreateGoalAsync(ownerClient, "routine-rules-goal");
        var project = await CreateProjectAsync(ownerClient, goal.Id, "routine-rules-project");

        var bothParents = await CreateRoutineResponseAsync(ownerClient, "both-parents",
            goalId: goal.Id, projectId: project.Id);
        Assert.Equal(HttpStatusCode.BadRequest, bothParents.StatusCode);
        Assert.Equal("VALIDATION_FAILED", await ProblemCodeAsync(bothParents));

        var unsupported = await CreateRoutineResponseAsync(ownerClient, "unsupported",
            recurrence: new { type = "N_TIMES_PER_WEEK" });
        Assert.Equal(HttpStatusCode.BadRequest, unsupported.StatusCode);

        var duplicateSlots = await CreateRoutineResponseAsync(ownerClient, "duplicate-slots",
            times: [new TimeOnly(8, 0), new TimeOnly(8, 0), new TimeOnly(20, 0)]);
        Assert.Equal(HttpStatusCode.BadRequest, duplicateSlots.StatusCode);

        var pastStart = await CreateRoutineResponseAsync(ownerClient, "past-start",
            effectiveFrom: Day.AddDays(-1));
        Assert.Equal(HttpStatusCode.BadRequest, pastStart.StatusCode);

        var created = await CreateRoutineAsync(ownerClient, "valid-routine", goalId: goal.Id,
            recurrence: new { type = "SPECIFIC_WEEKDAYS", daysOfWeek = new[] { 6, 1 } },
            times: [new TimeOnly(20, 0), new TimeOnly(8, 0)]);
        Assert.Equal("ACTIVE", created.Status);
        Assert.Equal(1, created.Version);
        Assert.Equal(Day, created.EffectiveFromLocalDate);
        Assert.Equal("Asia/Tehran", created.RecurrenceTimezone);
        Assert.Equal([1, 6], created.Recurrence.DaysOfWeek);
        Assert.Equal([new TimeOnly(8, 0), new TimeOnly(20, 0)], created.TimesOfDay);

        var crossUserParent = await CreateRoutineResponseAsync(otherClient, "cross-user-parent",
            goalId: goal.Id);
        Assert.Equal(HttpStatusCode.NotFound, crossUserParent.StatusCode);
        Assert.DoesNotContain(owner.UserId.ToString(), await crossUserParent.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.NotFound,
            (await otherClient.GetAsync($"/api/v1/routines/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await otherClient.GetAsync($"/api/v1/routines/{created.Id}/occurrences")).StatusCode);
        var otherList = await otherClient.GetFromJsonAsync<CursorPageDto<RoutineDto>>("/api/v1/routines");
        Assert.Empty(otherList!.Items);
    }

    [Fact]
    public async Task Concurrent_today_requests_create_each_timed_and_untimed_occurrence_exactly_once()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var untimed = await CreateRoutineAsync(client, "once-untimed");
        var timed = await CreateRoutineAsync(client, "once-timed",
            times: [new TimeOnly(8, 0), new TimeOnly(16, 0)]);

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ =>
            client.GetFromJsonAsync<TodayDto>("/api/v1/today")));
        Assert.All(responses, today =>
        {
            Assert.Equal(Day, today!.LocalDate);
            Assert.Equal(3, today.RoutineOccurrences.Count);
        });
        var view = responses[0]!;
        var untimedOccurrence = Assert.Single(view.RoutineOccurrences, x => x.RoutineId == untimed.Id);
        Assert.Null(untimedOccurrence.ScheduledLocalTime);
        Assert.Equal([new TimeOnly(8, 0), new TimeOnly(16, 0)],
            view.RoutineOccurrences.Where(x => x.RoutineId == timed.Id).Select(x => x.ScheduledLocalTime!.Value));
        Assert.All(view.RoutineOccurrences, x => Assert.Equal("PENDING", x.Status));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(3, await db.RoutineOccurrences.CountAsync(x => x.Routine.UserId == session.UserId));
        Assert.Equal(3, await db.DomainEvents.CountAsync(x =>
            x.UserId == session.UserId && x.EventType == "ROUTINE_OCCURRENCE_CREATED" &&
            x.Actor == "SYSTEM_DETERMINISTIC"));

        var now = DateTimeOffset.UtcNow;
        db.RoutineOccurrences.Add(new RoutineOccurrence
        {
            Id = Guid.NewGuid(), RoutineId = untimed.Id, ScheduledLocalDate = Day,
            CreatedAt = now, UpdatedAt = now
        });
        var untimedError = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("IX_RoutineOccurrences_UntimedIdentity",
            ((PostgresException)untimedError.InnerException!).ConstraintName);
        db.ChangeTracker.Clear();
        db.RoutineOccurrences.Add(new RoutineOccurrence
        {
            Id = Guid.NewGuid(), RoutineId = timed.Id, ScheduledLocalDate = Day,
            ScheduledLocalTime = new TimeOnly(8, 0), CreatedAt = now, UpdatedAt = now
        });
        var timedError = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("IX_RoutineOccurrences_TimedIdentity",
            ((PostgresException)timedError.InnerException!).ConstraintName);
    }

    [Fact]
    public async Task Occurrences_resolve_once_at_slot_and_day_boundaries_and_corrections_keep_identity()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var routine = await CreateRoutineAsync(client, "boundaries",
            times: [new TimeOnly(9, 0), new TimeOnly(15, 0), new TimeOnly(22, 0)]);

        var morning = await TodayAsync(client);
        Assert.All(morning.RoutineOccurrences, x => Assert.Equal("PENDING", x.Status));
        var nine = morning.RoutineOccurrences.Single(x => x.ScheduledLocalTime == new TimeOnly(9, 0));
        var fifteen = morning.RoutineOccurrences.Single(x => x.ScheduledLocalTime == new TimeOnly(15, 0));
        var twentyTwo = morning.RoutineOccurrences.Single(x => x.ScheduledLocalTime == new TimeOnly(22, 0));

        var doneBody = new { expectedVersion = fifteen.Version };
        var doneResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{fifteen.Id}/done", doneBody, "done-replay");
        var replayResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{fifteen.Id}/done", doneBody, "done-replay");
        doneResponse.EnsureSuccessStatusCode();
        replayResponse.EnsureSuccessStatusCode();
        var done = await doneResponse.Content.ReadFromJsonAsync<RoutineOccurrenceDto>();
        Assert.Equal("DONE", done!.Status);
        Assert.Equal(2, done.Version);
        Assert.NotNull(done.ResolvedAt);
        Assert.Equivalent(done, await replayResponse.Content.ReadFromJsonAsync<RoutineOccurrenceDto>(), strict: true);

        PinLocal(Day, 15, 0);
        var afternoon = await TodayAsync(client);
        Assert.Equal("MISSED", afternoon.RoutineOccurrences.Single(x => x.Id == nine.Id).Status);
        Assert.Equal("DONE", afternoon.RoutineOccurrences.Single(x => x.Id == fifteen.Id).Status);
        Assert.Equal("PENDING", afternoon.RoutineOccurrences.Single(x => x.Id == twentyTwo.Id).Status);

        var completeMissed = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{nine.Id}/done", new { expectedVersion = 2 }, "done-on-missed");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, completeMissed.StatusCode);
        Assert.Equal("OCCURRENCE_NOT_PENDING", await ProblemCodeAsync(completeMissed));

        // The last slot of the day stays pending until the local date ends.
        PinLocal(Day, 23, 59);
        Assert.Equal("PENDING", (await TodayAsync(client)).RoutineOccurrences.Single(x => x.Id == twentyTwo.Id).Status);
        PinLocal(Day.AddDays(1), 0, 0);
        var nextDay = await TodayAsync(client);
        Assert.Equal(Day.AddDays(1), nextDay.LocalDate);
        Assert.Equal(3, nextDay.RoutineOccurrences.Count);
        Assert.All(nextDay.RoutineOccurrences, x =>
        {
            Assert.Equal(Day.AddDays(1), x.ScheduledLocalDate);
            Assert.Equal("PENDING", x.Status);
        });
        await TodayAsync(client);

        var staleCorrection = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{nine.Id}/correct",
            new { targetStatus = "DONE", expectedVersion = 1 }, "stale-correction");
        Assert.Equal(HttpStatusCode.Conflict, staleCorrection.StatusCode);
        Assert.Equal("CONFLICT_STALE_VERSION", await ProblemCodeAsync(staleCorrection));

        var correctedResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{nine.Id}/correct",
            new { targetStatus = "DONE", expectedVersion = 2 }, "correct-missed");
        correctedResponse.EnsureSuccessStatusCode();
        var corrected = await correctedResponse.Content.ReadFromJsonAsync<RoutineOccurrenceDto>();
        Assert.Equal("DONE", corrected!.Status);
        Assert.Equal(3, corrected.Version);
        Assert.Equal(Day, corrected.ScheduledLocalDate);
        Assert.Equal(new TimeOnly(9, 0), corrected.ScheduledLocalTime);

        var unchanged = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/routine-occurrences/{nine.Id}/correct",
            new { targetStatus = "DONE", expectedVersion = 3 }, "correct-no-change");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, unchanged.StatusCode);
        Assert.Equal("NO_CHANGES", await ProblemCodeAsync(unchanged));

        var history = await client.GetFromJsonAsync<CursorPageDto<RoutineOccurrenceDto>>(
            $"/api/v1/routines/{routine.Id}/occurrences");
        Assert.Equal(6, history!.Items.Count);
        Assert.Equal("MISSED", history.Items.Single(x => x.Id == twentyTwo.Id).Status);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == session.UserId && x.AggregateType == "RoutineOccurrence")
            .ToListAsync();
        Assert.Equal(1, events.Count(x => x.AggregateId == nine.Id && x.EventType == "ROUTINE_OCCURRENCE_MISSED"));
        Assert.Equal(1, events.Count(x => x.AggregateId == twentyTwo.Id && x.EventType == "ROUTINE_OCCURRENCE_MISSED"));
        Assert.Equal(1, events.Count(x => x.AggregateId == fifteen.Id && x.EventType == "ROUTINE_OCCURRENCE_DONE"));
        Assert.Equal(0, events.Count(x => x.AggregateId == fifteen.Id && x.EventType == "ROUTINE_OCCURRENCE_MISSED"));
        Assert.Equal(1, events.Count(x => x.AggregateId == nine.Id && x.EventType == "ROUTINE_OCCURRENCE_CORRECTED"));
        Assert.Equal(6, events.Count(x => x.EventType == "ROUTINE_OCCURRENCE_CREATED"));
    }

    [Fact]
    public async Task Catch_up_after_absence_keeps_today_first_and_converges_without_duplicates()
    {
        PinLocal(Day, 12, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var routine = await CreateRoutineAsync(client, "catch-up");
        Assert.Single((await TodayAsync(client)).RoutineOccurrences);

        var returnDay = Day.AddDays(100);
        PinLocal(returnDay, 12, 0);
        var first = await TodayAsync(client);
        var todays = Assert.Single(first.RoutineOccurrences);
        Assert.Equal(returnDay, todays.ScheduledLocalDate);
        Assert.Equal("PENDING", todays.Status);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var afterFirst = await db.RoutineOccurrences.CountAsync(x => x.RoutineId == routine.Id);
        // One evaluation is bounded: it must not materialize the whole absence at once.
        Assert.InRange(afterFirst, 3, 100);

        for (var attempt = 0; attempt < 10; attempt++) await TodayAsync(client);
        var rows = await db.RoutineOccurrences.AsNoTracking().Where(x => x.RoutineId == routine.Id).ToListAsync();
        Assert.Equal(101, rows.Count);
        Assert.Equal(101, rows.Select(x => x.ScheduledLocalDate).Distinct().Count());
        Assert.All(rows.Where(x => x.ScheduledLocalDate < returnDay), x => Assert.Equal("MISSED", x.Status));
        Assert.Equal(todays.Id, rows.Single(x => x.ScheduledLocalDate == returnDay).Id);

        var eventCount = await db.DomainEvents.CountAsync(x => x.UserId == session.UserId);
        await TodayAsync(client);
        Assert.Equal(eventCount, await db.DomainEvents.CountAsync(x => x.UserId == session.UserId));

        var seen = new List<RoutineOccurrenceDto>();
        string? cursor = null;
        do
        {
            var page = await client.GetFromJsonAsync<CursorPageDto<RoutineOccurrenceDto>>(
                $"/api/v1/routines/{routine.Id}/occurrences?limit=40{(cursor is null ? "" : $"&cursor={cursor}")}");
            seen.AddRange(page!.Items);
            cursor = page.Page.NextCursor;
        } while (cursor is not null);
        Assert.Equal(101, seen.Select(x => x.Id).Distinct().Count());
        Assert.Equal(seen.OrderByDescending(x => x.ScheduledLocalDate).Select(x => x.Id), seen.Select(x => x.Id));
    }

    [Fact]
    public async Task Stop_keeps_todays_occurrence_ends_generation_and_resume_creates_one_continuation()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var routine = await CreateRoutineAsync(client, "stop-resume");
        var occurrence = Assert.Single((await TodayAsync(client)).RoutineOccurrences);

        var staleStop = await SendAsync(client, HttpMethod.Post, $"/api/v1/routines/{routine.Id}/stop",
            new { expectedVersion = 7 }, "stale-stop");
        Assert.Equal(HttpStatusCode.Conflict, staleStop.StatusCode);

        var activeContinuation = await ContinuationResponseAsync(client, routine.Id, "continue-active", Day);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, activeContinuation.StatusCode);
        Assert.Equal("CONTINUATION_SOURCE_NOT_STOPPED", await ProblemCodeAsync(activeContinuation));

        var stopResponse = await SendAsync(client, HttpMethod.Post, $"/api/v1/routines/{routine.Id}/stop",
            new { expectedVersion = routine.Version }, "stop-routine");
        stopResponse.EnsureSuccessStatusCode();
        var stopped = await stopResponse.Content.ReadFromJsonAsync<RoutineDto>();
        Assert.Equal("STOPPED", stopped!.Status);
        Assert.Equal(Day, stopped.EffectiveUntilLocalDate);
        Assert.NotNull(stopped.StoppedAt);
        Assert.Equal(2, stopped.Version);

        // Stopping a stopped Routine is a no-op success, even with a stale version and a new key.
        var again = await SendAsync(client, HttpMethod.Post, $"/api/v1/routines/{routine.Id}/stop",
            new { expectedVersion = routine.Version }, "stop-routine-again");
        again.EnsureSuccessStatusCode();
        Assert.Equal(2, (await again.Content.ReadFromJsonAsync<RoutineDto>())!.Version);

        var edit = await UpdateRoutineResponseAsync(client, routine.Id, "edit-stopped", stopped.Version, "عنوان تازه");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, edit.StatusCode);
        Assert.Equal("RESOURCE_NOT_ACTIVE", await ProblemCodeAsync(edit));

        // An occurrence that already belonged to today remains resolvable after the stop.
        var done = await SendAsync(client, HttpMethod.Post, $"/api/v1/routine-occurrences/{occurrence.Id}/done",
            new { expectedVersion = occurrence.Version }, "done-after-stop");
        done.EnsureSuccessStatusCode();

        PinLocal(Day.AddDays(3), 10, 0);
        Assert.Empty((await TodayAsync(client)).RoutineOccurrences);

        var missingDate = await ContinuationResponseAsync(client, routine.Id, "continue-no-date", null);
        Assert.Equal(HttpStatusCode.BadRequest, missingDate.StatusCode);

        var continuationResponse = await ContinuationResponseAsync(client, routine.Id, "continue-once", Day.AddDays(3));
        Assert.Equal(HttpStatusCode.Created, continuationResponse.StatusCode);
        var continuation = await continuationResponse.Content.ReadFromJsonAsync<RoutineDto>();
        Assert.NotEqual(routine.Id, continuation!.Id);
        Assert.Equal(routine.Id, continuation.ContinuationOfRoutineId);
        Assert.Equal("ACTIVE", continuation.Status);

        var branch = await ContinuationResponseAsync(client, routine.Id, "continue-twice", Day.AddDays(3));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, branch.StatusCode);
        Assert.Equal("CONTINUATION_EXISTS", await ProblemCodeAsync(branch));

        var source = await client.GetFromJsonAsync<RoutineDto>($"/api/v1/routines/{routine.Id}");
        Assert.Equal("STOPPED", source!.Status);
        Assert.Equal(continuation.Id, source.ContinuedByRoutineId);
        var resumed = Assert.Single((await TodayAsync(client)).RoutineOccurrences);
        Assert.Equal(continuation.Id, resumed.RoutineId);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.RoutineOccurrences.CountAsync(x => x.RoutineId == routine.Id));
        Assert.Equal(1, await db.DomainEvents.CountAsync(x =>
            x.AggregateId == routine.Id && x.EventType == "ROUTINE_STOPPED"));
        Assert.Equal(1, await db.DomainEvents.CountAsync(x =>
            x.AggregateId == continuation.Id && x.EventType == "ROUTINE_CONTINUATION_CREATED"));
    }

    [Fact]
    public async Task Schedule_edits_start_on_the_next_local_date_and_events_exclude_free_text()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var tomorrowIso = RoutineSchedule.IsoDayOfWeek(Day.AddDays(1));
        var routine = await CreateRoutineAsync(client, "prospective-edit", times: [new TimeOnly(8, 0)]);

        // Edited before Today was ever opened: today's slot is still fixed under the old schedule.
        var scheduleResponse = await UpdateRoutineResponseAsync(client, routine.Id, "edit-schedule",
            routine.Version, "روتین prospective-edit",
            recurrence: new { type = "SPECIFIC_WEEKDAYS", daysOfWeek = new[] { tomorrowIso } },
            times: [new TimeOnly(9, 0), new TimeOnly(21, 0)]);
        scheduleResponse.EnsureSuccessStatusCode();
        var rescheduled = await scheduleResponse.Content.ReadFromJsonAsync<RoutineDto>();
        Assert.Equal(2, rescheduled!.Version);
        Assert.Equal("SPECIFIC_WEEKDAYS", rescheduled.Recurrence.Type);

        var today = Assert.Single((await TodayAsync(client)).RoutineOccurrences);
        Assert.Equal(new TimeOnly(8, 0), today.ScheduledLocalTime);

        var titleResponse = await UpdateRoutineResponseAsync(client, routine.Id, "edit-title",
            rescheduled.Version, "عنوان خصوصی روتین", description: "توضیح خصوصی",
            recurrence: new { type = "SPECIFIC_WEEKDAYS", daysOfWeek = new[] { tomorrowIso } },
            times: [new TimeOnly(9, 0), new TimeOnly(21, 0)]);
        titleResponse.EnsureSuccessStatusCode();
        Assert.Equal(3, (await titleResponse.Content.ReadFromJsonAsync<RoutineDto>())!.Version);

        var staleEdit = await UpdateRoutineResponseAsync(client, routine.Id, "edit-stale",
            routine.Version, "دیرهنگام");
        Assert.Equal(HttpStatusCode.Conflict, staleEdit.StatusCode);

        PinLocal(Day.AddDays(1), 10, 0);
        Assert.Equal([new TimeOnly(9, 0), new TimeOnly(21, 0)],
            (await TodayAsync(client)).RoutineOccurrences.Select(x => x.ScheduledLocalTime!.Value));
        PinLocal(Day.AddDays(2), 10, 0);
        Assert.Empty((await TodayAsync(client)).RoutineOccurrences);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == session.UserId && x.AggregateId == routine.Id)
            .OrderBy(x => x.AggregateVersion).ToListAsync();
        Assert.Equal(["ROUTINE_CREATED", "ROUTINE_RECURRENCE_CHANGED", "ROUTINE_UPDATED"],
            events.Select(x => x.EventType));
        Assert.All(events, x =>
        {
            Assert.DoesNotContain("عنوان خصوصی", x.PayloadJson);
            Assert.DoesNotContain("توضیح خصوصی", x.PayloadJson);
        });
    }

    [Fact]
    public async Task Project_terminal_stops_its_routines_atomically_and_goal_terminal_is_blocked_by_a_routine()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "routine-parent-goal");
        var project = await CreateProjectAsync(client, goal.Id, "routine-parent-project");
        var first = await CreateRoutineAsync(client, "project-routine-1", projectId: project.Id);
        var standalone = await CreateRoutineAsync(client, "standalone-routine");
        Assert.Equal(2, (await TodayAsync(client)).RoutineOccurrences.Count);

        var preview = await PreviewAsync(client, "projects", project.Id, "COMPLETED", project.Version);
        Assert.True(preview.CanApply);
        Assert.Empty(preview.Blockers);
        var cascade = Assert.Single(preview.Cascades);
        Assert.Equal("Routine", cascade.ResourceType);
        Assert.Equal(first.Id, cascade.ResourceId);
        Assert.Equal("STOPPED", cascade.ResultingStatus);

        var second = await CreateRoutineAsync(client, "project-routine-2", projectId: project.Id);
        var stale = await SendAsync(client, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version, previewHash = preview.PreviewHash },
            "terminal-stale-cascade");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("CONFIRMATION_STALE", await ProblemCodeAsync(stale));
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<RoutineDto>($"/api/v1/routines/{first.Id}"))!.Status);

        var current = await PreviewAsync(client, "projects", project.Id, "COMPLETED", project.Version);
        Assert.Equal(2, current.Cascades.Count);
        var terminal = await SendAsync(client, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version, previewHash = current.PreviewHash },
            "terminal-with-cascade");
        terminal.EnsureSuccessStatusCode();

        foreach (var id in new[] { first.Id, second.Id })
        {
            var stopped = await client.GetFromJsonAsync<RoutineDto>($"/api/v1/routines/{id}");
            Assert.Equal("STOPPED", stopped!.Status);
            Assert.Equal(Day, stopped.EffectiveUntilLocalDate);
            Assert.Equal(2, stopped.Version);
        }
        Assert.Equal("ACTIVE",
            (await client.GetFromJsonAsync<RoutineDto>($"/api/v1/routines/{standalone.Id}"))!.Status);
        // The occurrence that already belonged to today is still listed and resolvable.
        Assert.Contains((await TodayAsync(client)).RoutineOccurrences, x => x.RoutineId == first.Id);

        var underTerminal = await CreateRoutineResponseAsync(client, "under-terminal-project", projectId: project.Id);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, underTerminal.StatusCode);
        Assert.Equal("PARENT_NOT_ACTIVE", await ProblemCodeAsync(underTerminal));

        var direct = await CreateRoutineAsync(client, "goal-routine", goalId: goal.Id);
        var goalPreview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.False(goalPreview.CanApply);
        Assert.Contains(goalPreview.Blockers, x => x.ResourceType == "Routine" && x.ResourceId == direct.Id);
        var blocked = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = goalPreview.PreviewHash },
            "goal-blocked-by-routine");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, blocked.StatusCode);
        Assert.Equal("PARENT_HAS_ACTIVE_CHILDREN", await ProblemCodeAsync(blocked));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var parentEvent = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == project.Id && x.EventType == "PROJECT_COMPLETED");
        var childEvents = await db.DomainEvents.AsNoTracking()
            .Where(x => x.EventType == "ROUTINE_STOPPED" && x.TransactionId == parentEvent.TransactionId)
            .ToListAsync();
        Assert.Equal(new[] { first.Id, second.Id }.Order(), childEvents.Select(x => x.AggregateId).Order());
        Assert.All(childEvents, x =>
        {
            Assert.Equal("SYSTEM_DETERMINISTIC", x.Actor);
            Assert.Equal(parentEvent.EventId, x.CausationId);
            Assert.Contains("PROJECT_TERMINAL", x.PayloadJson);
        });
        Assert.Equal(3, await db.OutboxMessages.CountAsync(x =>
            x.EventId == parentEvent.EventId || childEvents.Select(e => e.EventId).Contains(x.EventId)));
    }

    [Fact]
    public async Task Routine_creation_and_project_terminal_cannot_leave_an_active_routine_under_a_terminal_project()
    {
        PinLocal(Day, 10, 0);
        var session = await CreateSessionAsync();
        using var firstClient = Client(session.Token);
        using var secondClient = Client(session.Token);
        var project = await CreateProjectAsync(firstClient, null, "routine-race-project");
        var preview = await PreviewAsync(firstClient, "projects", project.Id, "STOPPED", project.Version);

        var terminalCall = SendAsync(firstClient, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "STOPPED", expectedVersion = project.Version, previewHash = preview.PreviewHash },
            "routine-race-terminal");
        var createCall = CreateRoutineResponseAsync(secondClient, "routine-race-create", projectId: project.Id);
        await Task.WhenAll(terminalCall, createCall);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storedProject = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == project.Id);
        var activeRoutines = await db.Routines.AsNoTracking().CountAsync(x =>
            x.ProjectId == project.Id && x.Status == RoutineStatuses.Active);
        Assert.False(storedProject.Status != ParentStatuses.Active && activeRoutines > 0);
    }

    private void PinLocal(DateOnly date, int hour, int minute) =>
        factory.Clock.Pin(new DateTimeOffset(date.Year, date.Month, date.Day, hour, minute, 0,
            TimeSpan.FromMinutes(210)));

    private HttpClient Client(string token)
    {
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private async Task<Session> CreateSessionAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Session(user.Id, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private static async Task<TodayDto> TodayAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<TodayDto>("/api/v1/today"))!;

    private static async Task<GoalDto> CreateGoalAsync(HttpClient client, string key)
    {
        var response = await SendAsync(client, HttpMethod.Post, "/api/v1/goals",
            new { title = "هدف نمونه", desiredOutcome = "نتیجه روشن", targetDate = (string?)null, reviewDate = (string?)null }, key);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<GoalDto>())!;
    }

    private static async Task<ProjectDto> CreateProjectAsync(HttpClient client, Guid? goalId, string key)
    {
        var response = await SendAsync(client, HttpMethod.Post, "/api/v1/projects",
            new { title = "پروژه نمونه", completionMeaning = "خروجی محدود", goalId,
                targetDate = (string?)null, reviewDate = (string?)null }, key);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ProjectDto>())!;
    }

    private static async Task<RoutineDto> CreateRoutineAsync(HttpClient client, string key,
        Guid? goalId = null, Guid? projectId = null, object? recurrence = null,
        TimeOnly[]? times = null, DateOnly? effectiveFrom = null)
    {
        var response = await CreateRoutineResponseAsync(client, key, goalId, projectId, recurrence,
            times, effectiveFrom);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RoutineDto>())!;
    }

    private static Task<HttpResponseMessage> CreateRoutineResponseAsync(HttpClient client, string key,
        Guid? goalId = null, Guid? projectId = null, object? recurrence = null,
        TimeOnly[]? times = null, DateOnly? effectiveFrom = null) => SendAsync(client, HttpMethod.Post,
        "/api/v1/routines", new
        {
            title = $"روتین {key}", description = (string?)null, goalId, projectId,
            recurrence = recurrence ?? DailyRecurrence, timesOfDay = times ?? [],
            effectiveFromLocalDate = effectiveFrom
        }, key);

    private static Task<HttpResponseMessage> ContinuationResponseAsync(HttpClient client, Guid sourceId,
        string key, DateOnly? effectiveFrom) => SendAsync(client, HttpMethod.Post,
        $"/api/v1/routines/{sourceId}/continuation", new
        {
            title = $"ادامه {key}", description = (string?)null, goalId = (Guid?)null,
            projectId = (Guid?)null, recurrence = DailyRecurrence, timesOfDay = Array.Empty<TimeOnly>(),
            effectiveFromLocalDate = effectiveFrom
        }, key);

    private static Task<HttpResponseMessage> UpdateRoutineResponseAsync(HttpClient client, Guid id,
        string key, long expectedVersion, string title, string? description = null,
        object? recurrence = null, TimeOnly[]? times = null) => SendAsync(client, HttpMethod.Put,
        $"/api/v1/routines/{id}", new
        {
            title, description, goalId = (Guid?)null, projectId = (Guid?)null,
            recurrence = recurrence ?? DailyRecurrence, timesOfDay = times ?? [], expectedVersion
        }, key);

    private static async Task<TerminalPreviewDto> PreviewAsync(HttpClient client, string resource,
        Guid id, string targetStatus, long version)
    {
        var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/{resource}/{id}/terminal-preview",
            new { targetStatus, expectedVersion = version });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TerminalPreviewDto>())!;
    }

    private static async Task<string?> ProblemCodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString();

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method,
        string path, object body, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Session(Guid UserId, string Token);
}
