using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.DTOs.Captures;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.DTOs.Projects;
using TidySense.DTOs.Reconcile;
using TidySense.DTOs.Tasks;
using TidySense.DTOs.Today;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class CaptureReconcileModuleTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    // Every test pins the clock to a local day safely after the real time (see TestClock.Pin).
    private static readonly DateOnly Day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3);

    [Fact]
    public async Task Capture_is_owner_scoped_and_resolution_creates_a_separate_correlated_task()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);

        var capture = await CreateCaptureAsync(client, "یادداشت خصوصی دندان‌پزشک", "capture-create");
        Assert.Equal("UNRESOLVED", capture.Status);
        Assert.Equal("MANUAL", capture.Source);
        Assert.Equal(1, capture.Version);
        Assert.Null(capture.ResolvedAt);

        Assert.Empty((await otherClient.GetFromJsonAsync<CursorPageDto<CaptureDto>>("/api/v1/captures"))!.Items);
        var crossUser = await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/captures/{capture.Id}/discard", new { expectedVersion = 1 }, "cross-discard");
        Assert.Equal(HttpStatusCode.NotFound, crossUser.StatusCode);

        // A capture is not a commitment: it is absent from Today and cannot make Reconcile eligible.
        Assert.Empty((await client.GetFromJsonAsync<TodayDto>("/api/v1/today"))!.Tasks);
        var overview = await OverviewAsync(client);
        Assert.False(overview.Eligible);
        Assert.Equal("NONE", overview.Severity);
        Assert.Equal(1, overview.Counts.UnresolvedCaptureCount);
        Assert.Equal(1, overview.AttentionCount);

        var incomplete = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/captures/{capture.Id}/resolve-task",
            new { expectedVersion = 1, plannedDate = (string?)null }, "resolve-incomplete");
        Assert.Equal(HttpStatusCode.BadRequest, incomplete.StatusCode);

        var body = new { expectedVersion = 1, plannedDate = Day.AddDays(1) };
        var resolvedResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/captures/{capture.Id}/resolve-task", body, "resolve-replay");
        var replayResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/captures/{capture.Id}/resolve-task", body, "resolve-replay");
        resolvedResponse.EnsureSuccessStatusCode();
        replayResponse.EnsureSuccessStatusCode();
        var resolved = (await resolvedResponse.Content.ReadFromJsonAsync<CaptureResolutionDto>())!;
        var replayed = (await replayResponse.Content.ReadFromJsonAsync<CaptureResolutionDto>())!;
        Assert.Equal("RESOLVED", resolved.Capture.Status);
        Assert.Equal(2, resolved.Capture.Version);
        Assert.NotNull(resolved.TaskId);
        Assert.NotEqual(capture.Id, resolved.TaskId);
        Assert.Equal(resolved.TaskId, replayed.TaskId);

        var task = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{resolved.TaskId}"))!;
        Assert.Equal(capture.Title, task.Title);
        Assert.Equal(Day.AddDays(1), task.PlannedDate);
        Assert.Equal("MANUAL", task.Source);

        var again = await SendAsync(client, HttpMethod.Post, $"/api/v1/captures/{capture.Id}/discard",
            new { expectedVersion = 2 }, "discard-resolved");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, again.StatusCode);
        Assert.Equal("CAPTURE_NOT_UNRESOLVED", await ProblemCodeAsync(again));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Tasks.CountAsync(x => x.UserId == owner.UserId));
        var resolvedEvent = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == capture.Id && x.EventType == "CAPTURE_RESOLVED");
        var createdEvent = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == resolved.TaskId && x.EventType == "TASK_CREATED");
        Assert.Equal(resolvedEvent.TransactionId, createdEvent.TransactionId);
        Assert.Equal(resolvedEvent.CorrelationId, createdEvent.CorrelationId);
        Assert.Equal(resolvedEvent.EventId, createdEvent.CausationId);
        Assert.Equal("USER", createdEvent.Actor);
    }

    [Fact]
    public async Task Capture_resolves_to_a_routine_or_is_discarded_exactly_once()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var toRoutine = await CreateCaptureAsync(client, "نرمش صبحگاهی", "capture-routine");
        var toDiscard = await CreateCaptureAsync(client, "ایده گذرا", "capture-discard");

        var routineResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/captures/{toRoutine.Id}/resolve-routine", new
            {
                expectedVersion = 1, recurrence = new { type = "DAILY" },
                timesOfDay = new[] { new TimeOnly(7, 30) }
            }, "resolve-routine");
        routineResponse.EnsureSuccessStatusCode();
        var routine = (await routineResponse.Content.ReadFromJsonAsync<CaptureResolutionDto>())!;
        Assert.NotNull(routine.RoutineId);
        Assert.Null(routine.TaskId);

        var stale = await SendAsync(client, HttpMethod.Post, $"/api/v1/captures/{toDiscard.Id}/discard",
            new { expectedVersion = 4 }, "discard-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var discarded = await SendAsync(client, HttpMethod.Post, $"/api/v1/captures/{toDiscard.Id}/discard",
            new { expectedVersion = 1 }, "discard");
        discarded.EnsureSuccessStatusCode();
        Assert.Equal("DISCARDED", (await discarded.Content.ReadFromJsonAsync<CaptureDto>())!.Status);

        var unresolved = await client.GetFromJsonAsync<CursorPageDto<CaptureDto>>(
            "/api/v1/captures?status=UNRESOLVED");
        Assert.Empty(unresolved!.Items);
        Assert.Equal(2, (await client.GetFromJsonAsync<CursorPageDto<CaptureDto>>("/api/v1/captures"))!.Items.Count);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.Routines.AsNoTracking().SingleAsync(x => x.Id == routine.RoutineId);
        Assert.Equal(toRoutine.Title, stored.Title);
        Assert.Equal(Day, stored.EffectiveFromLocalDate);
    }

    [Fact]
    public async Task Carry_is_explicit_bounded_and_its_count_is_derived_from_events()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "carry-goal");
        var task = await CreateTaskAsync(client, "carry-task", plannedDate: Day, deadline: Day.AddDays(10));
        var undated = await CreateTaskAsync(client, "carry-undated", goalId: goal.Id);
        Assert.Equal(0, task.CarryCount);
        Assert.False(task.IsProtected);

        Assert.Equal(HttpStatusCode.BadRequest, (await CarryAsync(client, task.Id, 1, Day.AddDays(-1), "carry-past")).StatusCode);
        var notScheduled = await CarryAsync(client, undated.Id, 1, Day.AddDays(1), "carry-not-scheduled");
        Assert.Equal("TASK_NOT_SCHEDULED", await ProblemCodeAsync(notScheduled));
        var beyondDeadline = await CarryAsync(client, task.Id, 1, Day.AddDays(11), "carry-deadline");
        Assert.Equal("DEADLINE_EXCEEDED", await ProblemCodeAsync(beyondDeadline));
        Assert.Equal("NO_CHANGES", await ProblemCodeAsync(await CarryAsync(client, task.Id, 1, Day, "carry-same")));

        // Moving a Task that is not yet due is rescheduling, not evidence of slippage.
        PinLocal(Day.AddDays(-1));
        var early = await ReadAsync<TaskDto>(await CarryAsync(client, task.Id, 1, Day.AddDays(1), "carry-early"));
        Assert.Equal(0, early.CarryCount);
        Assert.Equal(2, early.Version);

        PinLocal(Day.AddDays(2));
        var first = await ReadAsync<TaskDto>(await CarryAsync(client, task.Id, 2, Day.AddDays(3), "carry-first"));
        var replay = await ReadAsync<TaskDto>(await CarryAsync(client, task.Id, 2, Day.AddDays(3), "carry-first"));
        Assert.Equal(1, first.CarryCount);
        Assert.Equal(Day.AddDays(3), first.PlannedDate);
        Assert.Equal(3, replay.Version);
        Assert.Equal(HttpStatusCode.Conflict, (await CarryAsync(client, task.Id, 2, Day.AddDays(4), "carry-stale")).StatusCode);
        Assert.False((await OverviewAsync(client)).Eligible);

        PinLocal(Day.AddDays(3));
        var second = await ReadAsync<TaskDto>(await CarryAsync(client, task.Id, 3, Day.AddDays(5), "carry-second"));
        Assert.Equal(2, second.CarryCount);
        var overview = await OverviewAsync(client);
        Assert.True(overview.Eligible);
        Assert.Equal("MEDIUM", overview.Severity);
        Assert.Equal(1, overview.Counts.RepeatedCarryTaskCount);
        Assert.Contains("REPEATED_CARRY", overview.TriggerReasons);

        var protectedResponse = await SendAsync(client, HttpMethod.Put, $"/api/v1/tasks/{undated.Id}", new
        {
            title = undated.Title, description = (string?)null, goalId = goal.Id, projectId = (Guid?)null,
            plannedDate = (string?)null, deadline = (string?)null, sequenceId = (Guid?)null,
            sequenceOrder = (int?)null, expectedVersion = 1, isProtected = true
        }, "protect-task");
        Assert.True((await ReadAsync<TaskDto>(protectedResponse)).IsProtected);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(3, await db.DomainEvents.CountAsync(x =>
            x.AggregateId == task.Id && x.EventType == "TASK_CARRIED"));
        Assert.Equal("USER", (await db.Tasks.AsNoTracking().SingleAsync(x => x.Id == undated.Id)).ProtectionReasonCode);
    }

    [Fact]
    public async Task Session_records_facts_and_a_confirmed_bulk_replan_applies_atomically_once()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var first = await CreateTaskAsync(client, "bulk-first", plannedDate: Day);
        var second = await CreateTaskAsync(client, "bulk-second", plannedDate: Day.AddDays(1));
        var foreign = await CreateTaskAsync(otherClient, "bulk-foreign", plannedDate: Day);

        PinLocal(Day.AddDays(9));
        var session = await OpenSessionAsync(client, "open-bulk");
        Assert.Equal("OPEN", session.Status);
        Assert.Equal("MEDIUM", session.OpenedSeverity);
        Assert.Equal(2, session.Counts.ActionableBacklogCount);
        Assert.Equal(9, session.Counts.OldestUnresolvedAgeDays);
        Assert.Equal(ReconcileRules.CatalogVersion, session.RulesCatalogVersion);
        Assert.Equal("R2", Assert.Single(session.RuleMatches).RuleId);
        Assert.Equal(2, Assert.Single(session.ExecutionGroups).Tasks.Count);

        // Opening again on the same local date returns the same session.
        Assert.Equal(session.Id, (await OpenSessionAsync(client, "open-bulk-again")).Id);
        Assert.Equal(HttpStatusCode.NotFound,
            (await otherClient.GetAsync($"/api/v1/reconcile/sessions/{session.Id}")).StatusCode);

        var foreignPreview = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/sessions/{session.Id}/previews",
            new { actionType = "REPLAN_TASKS", taskIds = new[] { first.Id, foreign.Id }, plannedDate = Day.AddDays(10) });
        Assert.Equal(HttpStatusCode.NotFound, foreignPreview.StatusCode);

        var preview = await PreviewAsync(client, session.Id,
            new { actionType = "REPLAN_TASKS", taskIds = new[] { first.Id, second.Id }, plannedDate = Day.AddDays(10) });
        Assert.True(preview.CanApply);
        Assert.Equal("CREATED", preview.Status);
        Assert.All(preview.Items, x => Assert.Equal("WILL_REPLAN", x.Classification));
        Assert.Empty(preview.Warnings);

        var crossSubmit = await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "cross-submit");
        Assert.Equal(HttpStatusCode.NotFound, crossSubmit.StatusCode);

        var submit = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "submit-bulk");
        var submitReplay = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "submit-bulk");
        var result = await ReadAsync<ConfirmationResultDto>(submit);
        Assert.Equal("RESOLVED", result.Status);
        Assert.Equal(2, result.AffectedCount);
        Assert.Equivalent(result, await ReadAsync<ConfirmationResultDto>(submitReplay), strict: true);

        var resubmit = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "submit-bulk-again");
        Assert.Equal("CONFIRMATION_NOT_PENDING", await ProblemCodeAsync(resubmit));

        var moved = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{first.Id}"))!;
        Assert.Equal(Day.AddDays(10), moved.PlannedDate);
        Assert.Equal(2, moved.Version);
        Assert.Equal(1, moved.CarryCount);
        var view = (await client.GetFromJsonAsync<ReconcileSessionDto>($"/api/v1/reconcile/sessions/{session.Id}"))!;
        Assert.Equal(0, view.Counts.ActionableBacklogCount);
        Assert.Equal("NONE", view.Severity);
        Assert.Equal("MEDIUM", view.OpenedSeverity);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.ReconcileSessions.AsNoTracking().Include(x => x.Facts)
            .Include(x => x.RuleMatches).SingleAsync(x => x.Id == session.Id);
        Assert.Equal("Asia/Tehran", stored.Timezone);
        Assert.Equal(Day.AddDays(9), stored.LocalDate);
        Assert.Equal(2, stored.Facts.Count);
        Assert.All(stored.Facts, x => Assert.Equal(["EXECUTION_OVERDUE"], x.ReasonCodes));
        Assert.Equal(new[] { first.Id, second.Id }.Order(),
            Assert.Single(stored.RuleMatches).AffectedEntityIds.Order());
        Assert.Equal(1, await db.ReconcileSessions.CountAsync(x => x.UserId == owner.UserId));

        var events = await db.DomainEvents.AsNoTracking()
            .Where(x => x.ConfirmationId == preview.Id).ToListAsync();
        Assert.Equal(3, events.Count);
        var confirmed = Assert.Single(events, x => x.EventType == "RECONCILE_ACTION_CONFIRMED");
        var carried = events.Where(x => x.EventType == "TASK_CARRIED").ToArray();
        Assert.Equal(2, carried.Length);
        Assert.All(carried, x =>
        {
            Assert.Equal("USER", x.Actor);
            Assert.Equal(confirmed.TransactionId, x.TransactionId);
            Assert.Equal(confirmed.CommandResultId, x.CommandResultId);
            Assert.Equal(session.Id, x.ReconcileSessionId);
            Assert.Contains("\"BULK\"", x.PayloadJson);
        });
        Assert.Equal(events.Count, await db.OutboxMessages.CountAsync(x => events.Select(e => e.EventId).Contains(x.EventId)));
    }

    [Fact]
    public async Task A_changed_task_makes_the_confirmation_stale_and_no_member_of_the_bulk_is_applied()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        using var client = Client(owner.Token);
        var first = await CreateTaskAsync(client, "stale-first", plannedDate: Day);
        var second = await CreateTaskAsync(client, "stale-second", plannedDate: Day);

        PinLocal(Day.AddDays(1));
        var session = await OpenSessionAsync(client, "open-stale");
        var preview = await PreviewAsync(client, session.Id,
            new { actionType = "DROP_TASKS", taskIds = new[] { first.Id, second.Id } });
        Assert.True(preview.CanApply);

        (await CarryAsync(client, second.Id, 1, Day.AddDays(2), "stale-concurrent-carry")).EnsureSuccessStatusCode();

        var submit = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "submit-stale");
        Assert.Equal(HttpStatusCode.Conflict, submit.StatusCode);
        Assert.Equal("CONFIRMATION_STALE", await ProblemCodeAsync(submit));
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{first.Id}"))!.Status);
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{second.Id}"))!.Status);

        // A fresh preview and a concurrent edit race; whichever commits, the pair is never half-dropped.
        var fresh = await PreviewAsync(client, session.Id,
            new { actionType = "DROP_TASKS", taskIds = new[] { first.Id, second.Id } });
        var raceSubmit = SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{fresh.Id}/submit", new { }, "submit-race");
        var raceCarry = CarryAsync(client, first.Id, 1, Day.AddDays(3), "race-carry");
        await Task.WhenAll(raceSubmit, raceCarry);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var statuses = await db.Tasks.AsNoTracking().Where(x => x.UserId == owner.UserId)
            .Select(x => x.Status).ToListAsync();
        Assert.Single(statuses.Distinct());
        var confirmation = await db.ActionConfirmations.AsNoTracking().SingleAsync(x => x.Id == preview.Id);
        Assert.Equal("CREATED", confirmation.Status);
        Assert.Equal(0, await db.DomainEvents.CountAsync(x => x.ConfirmationId == preview.Id));
    }

    [Fact]
    public async Task Protected_and_parent_emptying_drops_require_explicit_consequences()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var project = await CreateProjectAsync(client, null, "drop-project");
        var only = await CreateTaskAsync(client, "drop-only", projectId: project.Id, plannedDate: Day);
        var guarded = await CreateTaskAsync(client, "drop-guarded", plannedDate: Day, isProtected: true);

        PinLocal(Day.AddDays(1));
        var reconcile = await OpenSessionAsync(client, "open-drop");
        var guardedItem = reconcile.ExecutionGroups.SelectMany(x => x.Tasks).Single(x => x.TaskId == guarded.Id);
        Assert.DoesNotContain("DROP_TASKS", guardedItem.AllowedActions);

        var refused = await PreviewAsync(client, reconcile.Id,
            new { actionType = "DROP_TASKS", taskIds = new[] { only.Id, guarded.Id } });
        Assert.False(refused.CanApply);
        Assert.Equal("PROTECTED", refused.Items.Single(x => x.TaskId == guarded.Id).Classification);
        var refusedSubmit = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{refused.Id}/submit", new { }, "submit-refused");
        Assert.Equal("CONFIRMATION_NOT_APPLICABLE", await ProblemCodeAsync(refusedSubmit));

        var preview = await PreviewAsync(client, reconcile.Id,
            new { actionType = "DROP_TASKS", taskIds = new[] { only.Id } });
        var warning = Assert.Single(preview.Warnings);
        Assert.Equal("PARENT_LEFT_WITHOUT_ACTIVE_TASKS", warning.Code);
        Assert.Equal([project.Id], warning.AffectedEntityIds);

        var unacknowledged = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { }, "submit-unacknowledged");
        Assert.Equal("WARNING_NOT_ACKNOWLEDGED", await ProblemCodeAsync(unacknowledged));
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{only.Id}"))!.Status);

        var acknowledged = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new
            {
                acknowledgedWarnings = new[] { new { warningId = warning.WarningId, warningHash = warning.WarningHash } }
            }, "submit-acknowledged");
        acknowledged.EnsureSuccessStatusCode();
        Assert.Equal("DROPPED", (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{only.Id}"))!.Status);
        // The parent stays active until the user makes a separate lifecycle decision.
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{project.Id}"))!.Status);
    }

    [Fact]
    public async Task Sequence_actions_reanchor_with_offsets_and_a_dropped_predecessor_needs_explicit_resolution()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var project = await CreateProjectAsync(client, null, "sequence-project");
        var sequence = Guid.NewGuid();
        var one = await CreateTaskAsync(client, "seq-one", projectId: project.Id, plannedDate: Day,
            sequenceId: sequence, sequenceOrder: 10);
        var two = await CreateTaskAsync(client, "seq-two", projectId: project.Id, plannedDate: Day.AddDays(1),
            sequenceId: sequence, sequenceOrder: 20);
        var three = await CreateTaskAsync(client, "seq-three", projectId: project.Id, plannedDate: Day.AddDays(3),
            sequenceId: sequence, sequenceOrder: 30);
        var undated = await CreateTaskAsync(client, "seq-undated", projectId: project.Id,
            sequenceId: sequence, sequenceOrder: 40);

        PinLocal(Day.AddDays(6));
        var reconcile = await OpenSessionAsync(client, "open-sequence");
        // Three overdue members are one actionable predecessor plus blocked context, not three decisions.
        Assert.Equal(1, reconcile.Counts.ActionableBacklogCount);
        Assert.Equal(6, reconcile.Counts.OldestUnresolvedAgeDays);
        var unit = Assert.Single(Assert.Single(reconcile.ExecutionGroups).Sequences);
        Assert.Equal(sequence, unit.SequenceId);
        Assert.Equal(3, unit.Items.Count);
        Assert.Contains("SEQUENCE_CARRY_ALL", unit.AllowedActions);

        var carryAll = await PreviewAsync(client, reconcile.Id,
            new { actionType = "SEQUENCE_CARRY_ALL", sequenceId = sequence, plannedDate = Day.AddDays(7) });
        Assert.True(carryAll.CanApply);
        Assert.Equal("UNSCHEDULED_PARENT_OWNED", carryAll.Items.Single(x => x.TaskId == undated.Id).Classification);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{carryAll.Id}/submit",
            new { }, "submit-carry-all")).EnsureSuccessStatusCode();
        Assert.Equal(Day.AddDays(7), (await TaskAsync(client, one.Id)).PlannedDate);
        Assert.Equal(Day.AddDays(8), (await TaskAsync(client, two.Id)).PlannedDate);
        Assert.Equal(Day.AddDays(10), (await TaskAsync(client, three.Id)).PlannedDate);
        Assert.Null((await TaskAsync(client, undated.Id)).PlannedDate);
        Assert.Equal(sequence, (await TaskAsync(client, two.Id)).SequenceId);
        Assert.False((await OverviewAsync(client)).Eligible);

        // Dropping the head leaves every later member blocked; time passing does not resolve that.
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{one.Id}/drop",
            new { expectedVersion = 2 }, "drop-head")).EnsureSuccessStatusCode();
        PinLocal(Day.AddDays(9));
        var blocked = await OpenSessionAsync(client, "open-dropped");
        Assert.NotEqual(reconcile.Id, blocked.Id);
        Assert.Equal(1, blocked.Counts.ActionableBacklogCount);
        var structural = Assert.Single(Assert.Single(blocked.ExecutionGroups).Sequences);
        Assert.Equal(one.Id, structural.DroppedPredecessor!.Id);
        Assert.Contains(blocked.RuleMatches, x => x.RuleId == "R6");

        var detach = await PreviewAsync(client, blocked.Id,
            new { actionType = "DETACH_DROPPED_PREDECESSOR", sequenceId = sequence });
        Assert.Equal("WILL_DETACH", Assert.Single(detach.Items).Classification);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{detach.Id}/submit",
            new { }, "submit-detach")).EnsureSuccessStatusCode();
        Assert.Null((await TaskAsync(client, one.Id)).SequenceId);
        Assert.False((await TaskAsync(client, two.Id)).IsBlocked);

        var dropAll = await PreviewAsync(client, blocked.Id,
            new { actionType = "SEQUENCE_DROP_ALL", sequenceId = sequence });
        Assert.Equal(3, dropAll.Items.Count);
        var emptied = Assert.Single(dropAll.Warnings);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{dropAll.Id}/submit", new
        {
            acknowledgedWarnings = new[] { new { warningId = emptied.WarningId, warningHash = emptied.WarningHash } }
        }, "submit-drop-all")).EnsureSuccessStatusCode();
        foreach (var id in new[] { two.Id, three.Id, undated.Id })
            Assert.Equal("DROPPED", (await TaskAsync(client, id)).Status);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("EXPIRED", (await db.ReconcileSessions.AsNoTracking().SingleAsync(x => x.Id == reconcile.Id)).Status);
        Assert.Equal(3, await db.DomainEvents.CountAsync(x =>
            x.ConfirmationId == carryAll.Id && x.EventType == "TASK_CARRIED" && x.Actor == "USER"));
    }

    [Fact]
    public async Task Keep_and_prompt_dismissal_change_presentation_for_one_local_day_only()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var task = await CreateTaskAsync(client, "keep-task", plannedDate: Day);

        PinLocal(Day.AddDays(1));
        var overview = await OverviewAsync(client);
        Assert.True(overview.Eligible);
        Assert.Equal("LIGHT", overview.Severity);
        Assert.Equal("NOT_PRESENTED", overview.PromptState);
        Assert.True(overview.ShowPrompt);

        var prompt = await SendAsync(client, HttpMethod.Post, "/api/v1/reconcile/prompt",
            new { state = "DISMISSED" }, "dismiss-prompt");
        prompt.EnsureSuccessStatusCode();
        var dismissed = await OverviewAsync(client);
        Assert.False(dismissed.ShowPrompt);
        Assert.Equal("DISMISSED", dismissed.PromptState);
        // Skipping is not resolution: the fact is still there and Today still works.
        Assert.True(dismissed.Eligible);
        Assert.Equal(Day.AddDays(1), (await client.GetFromJsonAsync<TodayDto>("/api/v1/today"))!.LocalDate);

        var reconcile = await OpenSessionAsync(client, "open-keep");
        var keep = await PreviewAsync(client, reconcile.Id,
            new { actionType = "KEEP_TASKS", taskIds = new[] { task.Id } });
        Assert.Equal("WILL_KEEP", Assert.Single(keep.Items).Classification);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{keep.Id}/submit",
            new { }, "submit-keep")).EnsureSuccessStatusCode();
        Assert.Equal(1, (await TaskAsync(client, task.Id)).Version);
        Assert.False((await OverviewAsync(client)).Eligible);

        var completed = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/sessions/{reconcile.Id}/complete", new { expectedVersion = 1 }, "complete-session");
        Assert.Equal("COMPLETED", (await ReadAsync<ReconcileSessionDto>(completed)).Status);
        var closedPreview = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/sessions/{reconcile.Id}/previews",
            new { actionType = "KEEP_TASKS", taskIds = new[] { task.Id } });
        Assert.Equal("RECONCILE_SESSION_NOT_OPEN", await ProblemCodeAsync(closedPreview));

        PinLocal(Day.AddDays(2));
        var nextDay = await OverviewAsync(client);
        Assert.True(nextDay.Eligible);
        Assert.True(nextDay.ShowPrompt);
        Assert.Equal("NOT_PRESENTED", nextDay.PromptState);
    }

    [Fact]
    public async Task Commitment_reviews_are_a_separate_lane_and_store_the_next_review_snapshot()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "review-goal", targetDate: Day.AddDays(1));
        var project = await CreateProjectAsync(client, goal.Id, "review-project", targetDate: Day.AddDays(1));
        var goalTask = await CreateTaskAsync(client, "review-goal-task", goalId: goal.Id);
        var projectTask = await CreateTaskAsync(client, "review-project-task", projectId: project.Id);
        Assert.Equal(Day.AddDays(1), goal.ReviewDate);
        Assert.False((await OverviewAsync(client)).Eligible);

        PinLocal(Day.AddDays(2));
        var overview = await OverviewAsync(client);
        Assert.True(overview.Eligible);
        Assert.Equal("NONE", overview.Severity);
        Assert.Equal(2, overview.Counts.ReviewDueCount);
        Assert.Equal(0, overview.Counts.ActionableBacklogCount);

        var reconcile = await OpenSessionAsync(client, "open-review");
        Assert.Empty(reconcile.ExecutionGroups);
        var goalReview = reconcile.CommitmentReviews.Single(x => x.EntityType == "GOAL");
        var projectReview = reconcile.CommitmentReviews.Single(x => x.EntityType == "PROJECT");
        Assert.Equal(goalTask.Id, Assert.Single(goalReview.UndatedTasks).Id);
        Assert.Equal(projectTask.Id, Assert.Single(projectReview.UndatedTasks).Id);

        var past = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/review",
            new { decision = "REVIEW_LATER", reviewDate = Day.AddDays(2), expectedVersion = 1 }, "review-past");
        Assert.Equal(HttpStatusCode.BadRequest, past.StatusCode);
        var invalid = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/review",
            new { decision = "ABANDON_GOAL", expectedVersion = 1 }, "review-invalid");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var continued = await ReadAsync<GoalDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/goals/{goal.Id}/review", new { decision = "CONTINUE", expectedVersion = 1 }, "review-goal-continue"));
        Assert.Equal("ACTIVE", continued.Status);
        Assert.Equal(2, continued.Version);
        // The target is no longer in the future, so it does not cap the next default checkpoint.
        Assert.Equal(Day.AddDays(92), continued.ReviewDate);
        Assert.Equal("SYSTEM_DEFAULT", continued.ReviewDateSource);
        Assert.NotNull(continued.LastContinuationDecisionAt);

        var kept = await ReadAsync<ProjectDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/projects/{project.Id}/review",
            new { reviewDate = Day.AddDays(20), expectedVersion = 1 }, "review-project-keep"));
        Assert.Equal(Day.AddDays(20), kept.ReviewDate);
        Assert.Equal("USER", kept.ReviewDateSource);
        Assert.Equal("ACTIVE", kept.Status);

        var after = await OverviewAsync(client);
        Assert.False(after.Eligible);
        Assert.Equal(0, after.Counts.ReviewDueCount);

        // An undated child is scheduled from the review only through an acknowledged preview.
        var schedule = await PreviewAsync(client, reconcile.Id,
            new { actionType = "REPLAN_TASKS", taskIds = new[] { projectTask.Id }, plannedDate = Day.AddDays(4) });
        var warning = Assert.Single(schedule.Warnings);
        Assert.Equal("UNDATED_TASK_SCHEDULED", warning.Code);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{schedule.Id}/submit", new
        {
            acknowledgedWarnings = new[] { new { warningId = warning.WarningId, warningHash = warning.WarningHash } }
        }, "submit-schedule")).EnsureSuccessStatusCode();
        var scheduled = await TaskAsync(client, projectTask.Id);
        Assert.Equal(Day.AddDays(4), scheduled.PlannedDate);
        Assert.Equal(0, scheduled.CarryCount);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var reviewEvent = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == goal.Id && x.EventType == "GOAL_CONTINUATION_RESOLVED");
        Assert.Contains("\"CONTINUE\"", reviewEvent.PayloadJson);
        Assert.Equal(1, await db.DomainEvents.CountAsync(x =>
            x.AggregateId == project.Id && x.EventType == "PROJECT_REVIEW_RESOLVED"));
    }

    [Fact]
    public async Task Step_7_event_payloads_never_carry_titles_or_other_free_text()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        const string secret = "متن‌محرمانه‌کاربر";
        var capture = await CreateCaptureAsync(client, secret, "privacy-capture");
        var task = await CreateTaskAsync(client, "privacy-task", plannedDate: Day, title: secret);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/captures/{capture.Id}/resolve-task",
            new { expectedVersion = 1, plannedDate = Day }, "privacy-resolve")).EnsureSuccessStatusCode();

        PinLocal(Day.AddDays(1));
        var reconcile = await OpenSessionAsync(client, "privacy-open");
        var preview = await PreviewAsync(client, reconcile.Id,
            new { actionType = "REPLAN_TASKS", taskIds = new[] { task.Id }, plannedDate = Day.AddDays(2) });
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{preview.Id}/submit",
            new { }, "privacy-submit")).EnsureSuccessStatusCode();
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/sessions/{reconcile.Id}/complete",
            new { expectedVersion = 1 }, "privacy-complete")).EnsureSuccessStatusCode();

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.DomainEvents.AsNoTracking().Where(x => x.UserId == session.UserId).ToListAsync();
        Assert.Contains(events, x => x.EventType == "RECONCILE_SESSION_OPENED");
        Assert.Contains(events, x => x.EventType == "RECONCILE_SESSION_COMPLETED");
        Assert.Contains(events, x => x.EventType == "CAPTURE_CREATED");
        Assert.All(events, x => Assert.DoesNotContain(secret, x.PayloadJson));
        var facts = await db.ReconcileFacts.AsNoTracking()
            .Where(x => x.SessionId == reconcile.Id).ToListAsync();
        Assert.NotEmpty(facts);
        Assert.All(facts, x => Assert.DoesNotContain(secret, x.ObservedMetrics));
    }

    private void PinLocal(DateOnly date, int hour = 10) =>
        factory.Clock.Pin(new DateTimeOffset(date.Year, date.Month, date.Day, hour, 0, 0,
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

    private static async Task<ReconcileOverviewDto> OverviewAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<ReconcileOverviewDto>("/api/v1/reconcile/overview"))!;

    private static async Task<TaskDto> TaskAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{id}"))!;

    private static async Task<ReconcileSessionDto> OpenSessionAsync(HttpClient client, string key) =>
        await ReadAsync<ReconcileSessionDto>(await SendAsync(client, HttpMethod.Post,
            "/api/v1/reconcile/sessions", new { triggerType = "MANUAL" }, key));

    private static async Task<ActionConfirmationDto> PreviewAsync(HttpClient client, Guid sessionId,
        object body) => await ReadAsync<ActionConfirmationDto>(await SendAsync(client, HttpMethod.Post,
        $"/api/v1/reconcile/sessions/{sessionId}/previews", body));

    private static async Task<CaptureDto> CreateCaptureAsync(HttpClient client, string title, string key) =>
        await ReadAsync<CaptureDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/captures",
            new { title }, key));

    private static Task<HttpResponseMessage> CarryAsync(HttpClient client, Guid id, long expectedVersion,
        DateOnly plannedDate, string key) => SendAsync(client, HttpMethod.Post,
        $"/api/v1/tasks/{id}/carry", new { expectedVersion, plannedDate }, key);

    private static async Task<GoalDto> CreateGoalAsync(HttpClient client, string key,
        DateOnly? targetDate = null) => await ReadAsync<GoalDto>(await SendAsync(client, HttpMethod.Post,
        "/api/v1/goals",
        new { title = "هدف نمونه", desiredOutcome = "نتیجه روشن", targetDate, reviewDate = (string?)null }, key));

    private static async Task<ProjectDto> CreateProjectAsync(HttpClient client, Guid? goalId, string key,
        DateOnly? targetDate = null) => await ReadAsync<ProjectDto>(await SendAsync(client, HttpMethod.Post,
        "/api/v1/projects", new
        {
            title = "پروژه نمونه", completionMeaning = "خروجی محدود", goalId, targetDate,
            reviewDate = (string?)null
        }, key));

    private static async Task<TaskDto> CreateTaskAsync(HttpClient client, string key, Guid? goalId = null,
        Guid? projectId = null, DateOnly? plannedDate = null, DateOnly? deadline = null,
        Guid? sequenceId = null, int? sequenceOrder = null, bool isProtected = false, string? title = null) =>
        await ReadAsync<TaskDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/tasks", new
        {
            title = title ?? $"کار {key}", description = (string?)null, goalId, projectId, plannedDate,
            deadline, sequenceId, sequenceOrder, isProtected
        }, key));

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
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
