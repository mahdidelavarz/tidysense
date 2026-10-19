using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Npgsql;
using TidySense.Common.Auth;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.DTOs.Progress;
using TidySense.DTOs.Projects;
using TidySense.DTOs.Tasks;
using TidySense.DTOs.Today;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class TaskTodayModuleTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    [Fact]
    public async Task Task_creation_enforces_ownership_sensitive_temporal_rules_and_owner_scope()
    {
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var ownerClient = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var goal = await CreateGoalAsync(ownerClient, "task-rules-goal");
        var project = await CreateProjectAsync(ownerClient, goal.Id, "task-rules-project");

        var undatedStandalone = await CreateTaskResponseAsync(ownerClient, "undated-standalone",
            goalId: null, projectId: null, plannedDate: null);
        Assert.Equal(HttpStatusCode.BadRequest, undatedStandalone.StatusCode);
        Assert.Equal("VALIDATION_FAILED", await ProblemCodeAsync(undatedStandalone));

        var parentOwned = await CreateTaskAsync(ownerClient, "parent-undated",
            goalId: goal.Id, plannedDate: null);
        Assert.Null(parentOwned.PlannedDate);
        Assert.Equal(goal.Id, parentOwned.GoalId);
        Assert.Equal("ACTIVE", parentOwned.Status);

        var bothParents = await CreateTaskResponseAsync(ownerClient, "both-parents",
            goalId: goal.Id, projectId: project.Id, plannedDate: null);
        Assert.Equal(HttpStatusCode.BadRequest, bothParents.StatusCode);

        var crossUser = await CreateTaskResponseAsync(otherClient, "cross-user-parent",
            goalId: goal.Id, plannedDate: null);
        Assert.Equal(HttpStatusCode.NotFound, crossUser.StatusCode);
        Assert.DoesNotContain(owner.UserId.ToString(), await crossUser.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.NotFound,
            (await otherClient.GetAsync($"/api/v1/tasks/{parentOwned.Id}")).StatusCode);
    }

    [Fact]
    public async Task Today_uses_local_date_keeps_blocked_context_and_completion_replay_is_authoritative()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        DateOnly today;
        await using (var scope = factory.Services.CreateAsyncScope())
            today = scope.ServiceProvider.GetRequiredService<ApplicationDateService>().Today;
        var sequenceId = Guid.NewGuid();
        var first = await CreateTaskAsync(client, "sequence-first", plannedDate: today,
            sequenceId: sequenceId, sequenceOrder: 10);
        var second = await CreateTaskAsync(client, "sequence-second", plannedDate: today,
            sequenceId: sequenceId, sequenceOrder: 20);
        await CreateTaskAsync(client, "future-task", plannedDate: today.AddDays(1));

        var todayView = await client.GetFromJsonAsync<TodayDto>("/api/v1/today");
        Assert.NotNull(todayView);
        Assert.Equal(today, todayView.LocalDate);
        Assert.Equal(2, todayView.Tasks.Count);
        Assert.False(todayView.Tasks.Single(x => x.Id == first.Id).IsBlocked);
        var blocked = todayView.Tasks.Single(x => x.Id == second.Id);
        Assert.True(blocked.IsBlocked);
        Assert.Equal(first.Id, Assert.Single(blocked.BlockedBy).Id);

        var blockedCompletion = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/tasks/{second.Id}/complete",
            new { expectedVersion = second.Version, completedForLocalDate = today }, "blocked-complete");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, blockedCompletion.StatusCode);
        Assert.Equal("TASK_BLOCKED", await ProblemCodeAsync(blockedCompletion));

        var body = new { expectedVersion = first.Version, completedForLocalDate = today };
        var completedResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/tasks/{first.Id}/complete", body, "complete-replay");
        var replayResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/tasks/{first.Id}/complete", body, "complete-replay");
        completedResponse.EnsureSuccessStatusCode();
        replayResponse.EnsureSuccessStatusCode();
        var completed = await completedResponse.Content.ReadFromJsonAsync<TaskDto>();
        var replayed = await replayResponse.Content.ReadFromJsonAsync<TaskDto>();
        Assert.Equal("COMPLETED", completed!.Status);
        Assert.Equal(today, completed.CompletedForLocalDate);
        Assert.Equal(2, completed.Version);
        Assert.Equivalent(completed, replayed, strict: true);

        var refreshed = await client.GetFromJsonAsync<TodayDto>("/api/v1/today");
        var unlocked = Assert.Single(refreshed!.Tasks);
        Assert.Equal(second.Id, unlocked.Id);
        Assert.False(unlocked.IsBlocked);
        Assert.Equal(first.Id, Assert.Single(refreshed.CompletedTasks).Id);

        await using var verifyScope = factory.Services.CreateAsyncScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.DomainEvents.CountAsync(x =>
            x.UserId == session.UserId && x.AggregateId == first.Id && x.EventType == "TASK_COMPLETED"));
        Assert.Equal(1, await db.CommandResults.CountAsync(x =>
            x.UserId == session.UserId && x.CommandType == "COMPLETE_TASK" && x.AggregateId == first.Id));
    }

    [Fact]
    public async Task Stopping_a_project_drops_its_open_tasks_as_previewed_and_restore_revalidates_parent()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "task-parent-goal");
        var project = await CreateProjectAsync(client, goal.Id, "task-parent-project");
        var task = await CreateTaskAsync(client, "project-undated-task",
            projectId: project.Id, plannedDate: null);

        // A stop is never blocked: the preview names each open Task it drops (owner decision 2026-10-19).
        var preview = await PreviewAsync(client, "projects", project.Id, "STOPPED", project.Version);
        Assert.True(preview.CanApply);
        Assert.Empty(preview.Blockers);
        var cascade = Assert.Single(preview.Cascades);
        Assert.Equal(("Task", task.Id, task.Title, "DROPPED"),
            (cascade.ResourceType, cascade.ResourceId, cascade.Title, cascade.ResultingStatus));
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "STOPPED", expectedVersion = project.Version, previewHash = preview.PreviewHash },
            "stop-project-with-task")).EnsureSuccessStatusCode();

        var dropped = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{task.Id}"))!;
        Assert.Equal(("DROPPED", 2L), (dropped.Status, dropped.Version));
        var restore = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.Id}/restore",
            new { expectedVersion = dropped.Version, plannedDate = (string?)null }, "restore-under-terminal-parent");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, restore.StatusCode);
        Assert.Equal("PARENT_NOT_ACTIVE", await ProblemCodeAsync(restore));

        var direct = await CreateTaskAsync(client, "goal-undated-task", goalId: goal.Id, plannedDate: null);
        var goalPreview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.Contains(goalPreview.Blockers, x => x.ResourceType == "Task" && x.ResourceId == direct.Id);
    }

    [Fact]
    public async Task Progress_counts_the_work_under_each_goal_and_project_and_lists_next_steps_in_order()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        DateOnly today;
        await using (var scope = factory.Services.CreateAsyncScope())
            today = scope.ServiceProvider.GetRequiredService<ApplicationDateService>().Today;
        var goal = await CreateGoalAsync(client, "progress-goal");
        var project = await CreateProjectAsync(client, goal.Id, "progress-project");
        var sequenceId = Guid.NewGuid();
        var first = await CreateTaskAsync(client, "progress-first", projectId: project.Id, plannedDate: today,
            sequenceId: sequenceId, sequenceOrder: 10);
        var second = await CreateTaskAsync(client, "progress-second", projectId: project.Id,
            plannedDate: today.AddDays(1), sequenceId: sequenceId, sequenceOrder: 20);
        var undated = await CreateTaskAsync(client, "progress-undated", projectId: project.Id, plannedDate: null);
        var direct = await CreateTaskAsync(client, "progress-direct", goalId: goal.Id, plannedDate: today);
        var dropped = await CreateTaskAsync(client, "progress-dropped", goalId: goal.Id, plannedDate: null);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{dropped.Id}/drop",
            new { expectedVersion = dropped.Version }, "progress-drop")).EnsureSuccessStatusCode();
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{direct.Id}/complete",
            new { expectedVersion = direct.Version, completedForLocalDate = today }, "progress-complete")).EnsureSuccessStatusCode();
        (await SendAsync(client, HttpMethod.Post, "/api/v1/routines", new
        {
            title = "progress-routine", description = (string?)null, goalId = (Guid?)null, projectId = project.Id,
            recurrence = new { type = "DAILY" }, timesOfDay = Array.Empty<string>(),
        }, "progress-routine")).EnsureSuccessStatusCode();
        var otherSession = await CreateSessionAsync();
        using var otherClient = Client(otherSession.Token);
        await CreateGoalAsync(otherClient, "progress-other");

        var progress = (await client.GetFromJsonAsync<ProgressDto>("/api/v1/progress"))!;
        // Only the caller's own Goals and Projects.
        var goalProgress = Assert.Single(progress.Goals);
        var projectProgress = Assert.Single(progress.Projects);
        Assert.Equal(goal.Id, goalProgress.GoalId);
        Assert.Equal(1, goalProgress.ActiveProjectCount);

        // The Project: three open, one of them today and one waiting for the first step.
        var work = projectProgress.Work;
        Assert.Equal((3, 0, 3, 1, 1, 1), (work.TaskCount, work.DoneTaskCount, work.OpenTaskCount,
            work.TodayTaskCount, work.WaitingTaskCount, work.ActiveRoutineCount));
        Assert.Equal(["progress-routine"], work.RoutineTitles);
        Assert.Equal([first.Id, second.Id, undated.Id], work.NextTasks.Select(x => x.Id));
        Assert.Equal([false, true, false], work.NextTasks.Select(x => x.IsBlocked));

        // The Goal adds its own Tasks: the completed one counts as done, the dropped one not at all.
        Assert.Equal((4, 1, 3), (goalProgress.Work.TaskCount, goalProgress.Work.DoneTaskCount, goalProgress.Work.OpenTaskCount));
        Assert.Equal(1, goalProgress.Work.ActiveRoutineCount);
    }

    [Fact]
    public async Task Sequence_scope_and_order_are_deterministic_and_database_constraints_backstop_shape()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var firstGoal = await CreateGoalAsync(client, "sequence-scope-goal-1");
        var secondGoal = await CreateGoalAsync(client, "sequence-scope-goal-2");
        var sequenceId = Guid.NewGuid();
        await CreateTaskAsync(client, "sequence-member", goalId: firstGoal.Id,
            plannedDate: null, sequenceId: sequenceId, sequenceOrder: 10);

        var wrongScope = await CreateTaskResponseAsync(client, "sequence-wrong-scope",
            goalId: secondGoal.Id, plannedDate: null, sequenceId: sequenceId, sequenceOrder: 20);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, wrongScope.StatusCode);
        Assert.Equal("SEQUENCE_SCOPE_MISMATCH", await ProblemCodeAsync(wrongScope));

        var duplicateOrder = await CreateTaskResponseAsync(client, "sequence-duplicate-order",
            goalId: firstGoal.Id, plannedDate: null, sequenceId: sequenceId, sequenceOrder: 10);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, duplicateOrder.StatusCode);
        Assert.Equal("SEQUENCE_ORDER_CONFLICT", await ProblemCodeAsync(duplicateOrder));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invalid = new TaskItem
        {
            Id = Guid.NewGuid(), UserId = session.UserId, Title = "Invalid standalone",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Tasks.Add(invalid);
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("CK_Tasks_TemporalValidity", ((PostgresException)error.InnerException!).ConstraintName);
    }

    [Fact]
    public async Task Task_update_uses_optimistic_version_and_events_exclude_free_text()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var task = await CreateTaskAsync(client, "update-version", plannedDate: today);

        var updatedResponse = await SendAsync(client, HttpMethod.Put, $"/api/v1/tasks/{task.Id}", new
        {
            title = "عنوان خصوصی ویرایش‌شده", description = "توضیح خصوصی",
            goalId = (Guid?)null, projectId = (Guid?)null, plannedDate = today,
            deadline = (string?)null, sequenceId = (Guid?)null, sequenceOrder = (int?)null,
            expectedVersion = task.Version
        }, "update-version-once");
        updatedResponse.EnsureSuccessStatusCode();
        var updated = await updatedResponse.Content.ReadFromJsonAsync<TaskDto>();
        Assert.Equal(2, updated!.Version);

        var stale = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.Id}/drop",
            new { expectedVersion = task.Version }, "stale-drop");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("CONFLICT_STALE_VERSION", await ProblemCodeAsync(stale));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var payloads = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == session.UserId && x.AggregateId == task.Id)
            .Select(x => x.PayloadJson).ToListAsync();
        Assert.All(payloads, payload =>
        {
            Assert.DoesNotContain("عنوان خصوصی", payload);
            Assert.DoesNotContain("توضیح خصوصی", payload);
        });
    }

    [Fact]
    public async Task Task_creation_and_parent_terminal_transition_cannot_leave_an_active_child_under_a_terminal_project()
    {
        var session = await CreateSessionAsync();
        using var firstClient = Client(session.Token);
        using var secondClient = Client(session.Token);
        var project = await CreateProjectAsync(firstClient, null, "task-race-project");
        var preview = await PreviewAsync(firstClient, "projects", project.Id, "STOPPED", project.Version);

        var terminalCall = SendAsync(firstClient, HttpMethod.Post,
            $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "STOPPED", expectedVersion = project.Version, previewHash = preview.PreviewHash },
            "task-race-terminal");
        var createCall = CreateTaskResponseAsync(secondClient, "task-race-create",
            projectId: project.Id, plannedDate: null);
        var responses = await Task.WhenAll(terminalCall, createCall);

        Assert.NotEqual(responses[0].IsSuccessStatusCode, responses[1].IsSuccessStatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storedProject = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == project.Id);
        var activeTasks = await db.Tasks.AsNoTracking().CountAsync(x =>
            x.ProjectId == project.Id && x.Status == TaskStatuses.Active);
        Assert.False(storedProject.Status != ParentStatuses.Active && activeTasks > 0);
    }

    [Fact]
    public void Application_date_uses_the_configured_IANA_timezone()
    {
        var provider = new FixedTimeProvider(new DateTimeOffset(2026, 3, 20, 21, 0, 0, TimeSpan.Zero));
        var service = new ApplicationDateService(
            Options.Create(new ApplicationTimeOptions { TimeZoneId = "Asia/Tehran" }), provider);
        Assert.Equal(new DateOnly(2026, 3, 21), service.Today);
    }

    [Fact]
    public async Task Two_existing_tasks_become_a_sequence_by_hand_that_moves_and_releases_only_as_previewed()
    {
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var goal = await CreateGoalAsync(client, "manual-sequence-goal");
        var first = await CreateTaskAsync(client, "manual-first", goalId: goal.Id);
        var second = await CreateTaskAsync(client, "manual-second", goalId: goal.Id);
        var third = await CreateTaskAsync(client, "manual-third", goalId: goal.Id);
        var elsewhere = await CreateTaskAsync(client, "manual-elsewhere", goalId: (await CreateGoalAsync(client, "manual-other-goal")).Id);

        async Task<TaskSequencePreviewDto> Preview(Guid id, string action, Guid? predecessorId = null, HttpClient? as_ = null)
        {
            var response = await SendAsync(as_ ?? client, HttpMethod.Post, $"/api/v1/tasks/{id}/sequence-preview",
                new { action, predecessorId });
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<TaskSequencePreviewDto>())!;
        }
        Task<HttpResponseMessage> Change(Guid id, string action, Guid? predecessorId, IEnumerable<TaskVersionRefDto> expected,
            string key) => SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{id}/sequence",
            new { action, predecessorId, expectedMembers = expected }, key);

        // «بعد از…» between two Tasks that had no order: the preview says who waits; nothing is stored.
        var linking = await Preview(second.Id, TaskSequenceActions.Follow, first.Id);
        Assert.Equal([first.Id, second.Id], linking.Steps.Select(x => x.TaskId));
        Assert.Equal([false, true], linking.Steps.Select(x => x.Waits));
        Assert.Null((await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{second.Id}"))!.SequenceId);

        var linked = await Change(second.Id, TaskSequenceActions.Follow, first.Id, linking.ExpectedMembers, "manual-link");
        var replay = await Change(second.Id, TaskSequenceActions.Follow, first.Id, linking.ExpectedMembers, "manual-link");
        Assert.Equal(HttpStatusCode.OK, linked.StatusCode);
        Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
        var waiting = (await linked.Content.ReadFromJsonAsync<TaskDto>())!;
        Assert.True(waiting.IsBlocked);
        Assert.Equal(first.Id, Assert.Single(waiting.BlockedBy).Id);
        var head = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{first.Id}"))!;
        Assert.Equal(waiting.SequenceId, head.SequenceId);
        Assert.True(head.SequenceOrder < waiting.SequenceOrder);

        // The third joins at the end, then moves before the second.
        var joining = await Preview(third.Id, TaskSequenceActions.Follow, second.Id);
        (await Change(third.Id, TaskSequenceActions.Follow, second.Id, joining.ExpectedMembers, "manual-join")).EnsureSuccessStatusCode();
        var moving = await Preview(third.Id, TaskSequenceActions.MoveEarlier);
        Assert.Equal([first.Id, third.Id, second.Id], moving.Steps.Select(x => x.TaskId));
        (await Change(third.Id, TaskSequenceActions.MoveEarlier, null, moving.ExpectedMembers, "manual-move")).EnsureSuccessStatusCode();
        // A drag puts the last step first, through the same preview and command.
        var dragging = await Preview(second.Id, TaskSequenceActions.MoveTo);
        Assert.Equal([second.Id, first.Id, third.Id], dragging.Steps.Select(x => x.TaskId));
        (await Change(second.Id, TaskSequenceActions.MoveTo, null, dragging.ExpectedMembers, "manual-drag")).EnsureSuccessStatusCode();
        var back = await Preview(second.Id, TaskSequenceActions.MoveTo, third.Id);
        (await Change(second.Id, TaskSequenceActions.MoveTo, third.Id, back.ExpectedMembers, "manual-drag-back")).EnsureSuccessStatusCode();
        var orders = new Dictionary<Guid, int?>();
        foreach (var id in new[] { first.Id, second.Id, third.Id })
            orders[id] = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{id}"))!.SequenceOrder;
        Assert.True(orders[first.Id] < orders[third.Id] && orders[third.Id] < orders[second.Id]);

        // A preview is applied only to what it showed: a changed Task, or a Task that joined since, is refused.
        var leaving = await Preview(first.Id, TaskSequenceActions.Leave);
        var touched = await SendAsync(client, HttpMethod.Put, $"/api/v1/tasks/{second.Id}", new
        {
            title = "کار عوض‌شده", description = (string?)null, goalId = goal.Id, projectId = (Guid?)null,
            plannedDate = (string?)null, deadline = (string?)null, sequenceId = waiting.SequenceId,
            sequenceOrder = orders[second.Id], expectedVersion = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{second.Id}"))!.Version
        }, "manual-touch");
        touched.EnsureSuccessStatusCode();
        var stale = await Change(first.Id, TaskSequenceActions.Leave, null, leaving.ExpectedMembers, "manual-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var partial = await Change(first.Id, TaskSequenceActions.Leave, null, leaving.ExpectedMembers.Take(1), "manual-partial");
        Assert.Equal("SEQUENCE_PREVIEW_STALE", await ProblemCodeAsync(partial));

        // Leaving: the Task stands alone and the rest keep their order; the next step no longer waits for it.
        var fresh = await Preview(first.Id, TaskSequenceActions.Leave);
        Assert.Equal([third.Id, second.Id], fresh.Steps.Select(x => x.TaskId));
        (await Change(first.Id, TaskSequenceActions.Leave, null, fresh.ExpectedMembers, "manual-leave")).EnsureSuccessStatusCode();
        Assert.Null((await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{first.Id}"))!.SequenceId);
        Assert.False((await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{third.Id}"))!.IsBlocked);

        // Another owner, another scope, and an unknown action.
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/tasks/{first.Id}/sequence-preview", new { action = TaskSequenceActions.Leave })).StatusCode);
        var mismatch = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{elsewhere.Id}/sequence-preview",
            new { action = TaskSequenceActions.Follow, predecessorId = first.Id });
        Assert.Equal("SEQUENCE_SCOPE_MISMATCH", await ProblemCodeAsync(mismatch));
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Post,
            $"/api/v1/tasks/{first.Id}/sequence-preview", new { action = "SHUFFLE" })).StatusCode);

        // Every re-placed Task has its own event; those the person saw in the preview are theirs.
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var linkEvents = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == owner.UserId && x.EventType == "TASK_UPDATED" &&
                (x.AggregateId == first.Id || x.AggregateId == second.Id))
            .ToListAsync();
        Assert.Contains(linkEvents, x => x.AggregateId == first.Id && x.Actor == "USER" && x.PayloadJson.Contains("sequenceId"));
    }

    [Fact]
    public async Task A_done_tick_is_undone_exactly_and_never_breaks_the_completed_part_of_a_sequence()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        DateOnly today;
        await using (var scope = factory.Services.CreateAsyncScope())
            today = scope.ServiceProvider.GetRequiredService<ApplicationDateService>().Today;
        async Task<HttpResponseMessage> Post(Guid id, string verb, object body, string key) =>
            await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{id}/{verb}", body, key);
        async Task<TaskDto> Read(Guid id) => (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{id}"))!;
        async Task<TaskDto> Complete(TaskDto task, string key)
        {
            var response = await Post(task.Id, "complete", new { expectedVersion = task.Version, completedForLocalDate = today }, key);
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<TaskDto>())!;
        }

        // An overdue Task ticked today and unticked is overdue again, exactly as before the tick.
        var late = await CreateTaskAsync(client, "undo-late", plannedDate: today.AddDays(-3));
        var lateDone = await Complete(late, "undo-late-done");
        var reopened = await Post(late.Id, "undo-complete", new { expectedVersion = lateDone.Version }, "undo-late-undo");
        var replay = await Post(late.Id, "undo-complete", new { expectedVersion = lateDone.Version }, "undo-late-undo");
        reopened.EnsureSuccessStatusCode();
        replay.EnsureSuccessStatusCode();
        var active = (await reopened.Content.ReadFromJsonAsync<TaskDto>())!;
        Assert.Equal(("ACTIVE", (DateOnly?)today.AddDays(-3), (DateOnly?)null, (DateTimeOffset?)null),
            (active.Status, active.PlannedDate, active.CompletedForLocalDate, active.TerminalAt));
        Assert.Equal(late.CarryCount, active.CarryCount);
        Assert.Equivalent(active, await replay.Content.ReadFromJsonAsync<TaskDto>(), strict: true);
        var notDone = await Post(late.Id, "undo-complete", new { expectedVersion = active.Version }, "undo-late-active");
        Assert.Equal("TASK_NOT_COMPLETED", await ProblemCodeAsync(notDone));

        // In a sequence, a step is reopened only while no later step is done; then later steps wait again.
        var sequenceId = Guid.NewGuid();
        var first = await CreateTaskAsync(client, "undo-first", plannedDate: today, sequenceId: sequenceId, sequenceOrder: 10);
        var second = await CreateTaskAsync(client, "undo-second", plannedDate: today, sequenceId: sequenceId, sequenceOrder: 20);
        var third = await CreateTaskAsync(client, "undo-third", plannedDate: today, sequenceId: sequenceId, sequenceOrder: 30);
        var firstDone = await Complete(first, "undo-first-done");
        var secondDone = await Complete(await Read(second.Id), "undo-second-done");
        Assert.False((await Read(third.Id)).IsBlocked);
        var behind = await Post(first.Id, "undo-complete", new { expectedVersion = firstDone.Version }, "undo-first-early");
        Assert.Equal("SEQUENCE_LATER_STEP_DONE", await ProblemCodeAsync(behind));
        // Restore is for dropped Tasks only, so it cannot reopen the done part of a sequence either.
        var restored = await Post(first.Id, "restore", new { expectedVersion = firstDone.Version, plannedDate = today }, "undo-first-restore");
        Assert.Equal("TASK_COMPLETED_UNDO_INSTEAD", await ProblemCodeAsync(restored));
        Assert.Equal("COMPLETED", (await Read(first.Id)).Status);
        (await Post(second.Id, "undo-complete", new { expectedVersion = secondDone.Version }, "undo-second-undo")).EnsureSuccessStatusCode();
        Assert.Equal(second.Id, Assert.Single((await Read(third.Id)).BlockedBy).Id);
        (await Post(first.Id, "undo-complete", new { expectedVersion = firstDone.Version }, "undo-first-undo")).EnsureSuccessStatusCode();
        Assert.Equal(first.Id, Assert.Single((await Read(second.Id)).BlockedBy).Id);

        // A Task under a Goal that has ended is not reopened.
        var goal = await CreateGoalAsync(client, "undo-goal");
        var owned = await Complete(await CreateTaskAsync(client, "undo-owned", goalId: goal.Id), "undo-owned-done");
        var preview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal", new
        {
            targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = preview.PreviewHash
        }, "undo-goal-achieve")).EnsureSuccessStatusCode();
        var ended = await Post(owned.Id, "undo-complete", new { expectedVersion = owned.Version }, "undo-owned-undo");
        Assert.Equal("PARENT_NOT_ACTIVE", await ProblemCodeAsync(ended));

        await using var events = factory.Services.CreateAsyncScope();
        var db = events.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(3, await db.DomainEvents.CountAsync(x => x.UserId == session.UserId &&
            x.EventType == "TASK_COMPLETION_UNDONE"));
    }

    [Fact]
    public async Task A_new_task_is_made_already_following_another_or_not_at_all()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "follow-new-goal");
        var elsewhere = await CreateGoalAsync(client, "follow-new-elsewhere");
        var sequenceId = Guid.NewGuid();
        var head = await CreateTaskAsync(client, "follow-new-head", goalId: goal.Id, sequenceId: sequenceId, sequenceOrder: 10);
        var tail = await CreateTaskAsync(client, "follow-new-tail", goalId: goal.Id, sequenceId: sequenceId, sequenceOrder: 20);
        async Task<TaskSequencePreviewDto> Preview(Guid predecessorId, Guid goalId)
        {
            var response = await SendAsync(client, HttpMethod.Post, "/api/v1/tasks/sequence-preview",
                new { predecessorId, goalId, title = "کار تازه" });
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<TaskSequencePreviewDto>())!;
        }
        Task<HttpResponseMessage> Create(string title, Guid goalId, object follow, string key, Guid? sequence = null) =>
            SendAsync(client, HttpMethod.Post, "/api/v1/tasks", new
            {
                title, description = (string?)null, goalId, projectId = (Guid?)null, plannedDate = (string?)null,
                deadline = (string?)null, sequenceId = sequence, sequenceOrder = sequence is null ? (int?)null : 99, follow
            }, key);
        async Task<int> Count(string title)
        {
            await using var scope = factory.Services.CreateAsyncScope();
            return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Tasks
                .CountAsync(x => x.UserId == session.UserId && x.Title == title);
        }

        // The preview shows the new Task between the two, and that both it and the tail will wait.
        var preview = await Preview(head.Id, goal.Id);
        Assert.Equal([head.Id, Guid.Empty, tail.Id], preview.Steps.Select(x => x.TaskId));
        Assert.Equal("کار تازه", preview.Steps[1].Title);
        Assert.Equal([false, true, true], preview.Steps.Select(x => x.Waits));
        Assert.Equal(new[] { head.Id, tail.Id }.Order(), preview.ExpectedMembers.Select(x => x.TaskId));

        // A Task changed since the preview refuses the whole create: nothing is made.
        var touched = await SendAsync(client, HttpMethod.Put, $"/api/v1/tasks/{tail.Id}", new
        {
            title = "دم عوض‌شده", description = (string?)null, goalId = goal.Id, projectId = (Guid?)null,
            plannedDate = (string?)null, deadline = (string?)null, sequenceId, sequenceOrder = 20, expectedVersion = tail.Version
        }, "follow-new-touch");
        touched.EnsureSuccessStatusCode();
        var stale = await Create("follow-new-stale", goal.Id, new { predecessorId = head.Id, preview.ExpectedMembers }, "follow-new-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var partial = await Create("follow-new-partial", goal.Id,
            new { predecessorId = head.Id, expectedMembers = preview.ExpectedMembers.Take(1) }, "follow-new-partial");
        Assert.Equal("SEQUENCE_PREVIEW_STALE", await ProblemCodeAsync(partial));
        var mismatch = await Create("follow-new-mismatch", elsewhere.Id,
            new { predecessorId = head.Id, preview.ExpectedMembers }, "follow-new-mismatch");
        Assert.Equal("SEQUENCE_SCOPE_MISMATCH", await ProblemCodeAsync(mismatch));
        var both = await Create("follow-new-both", goal.Id, new { predecessorId = head.Id, preview.ExpectedMembers },
            "follow-new-both", Guid.NewGuid());
        Assert.Equal(HttpStatusCode.BadRequest, both.StatusCode);
        foreach (var title in new[] { "follow-new-stale", "follow-new-partial", "follow-new-mismatch", "follow-new-both" })
            Assert.Equal(0, await Count(title));

        // From a fresh preview it is made and placed together; the tail now waits for it.
        var fresh = await Preview(head.Id, goal.Id);
        var created = await Create("follow-new-made", goal.Id, new { predecessorId = head.Id, fresh.ExpectedMembers }, "follow-new-made");
        created.EnsureSuccessStatusCode();
        var made = (await created.Content.ReadFromJsonAsync<TaskDto>())!;
        Assert.Equal(sequenceId, made.SequenceId);
        Assert.True(made.SequenceOrder > head.SequenceOrder);
        Assert.Equal(head.Id, Assert.Single(made.BlockedBy).Id);
        var waiting = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{tail.Id}"))!;
        Assert.True(waiting.SequenceOrder > made.SequenceOrder);
        Assert.Equal([head.Id, made.Id], waiting.BlockedBy.Select(x => x.Id));

        // A Task with no order starts one with the new Task, both placed in the same command.
        var alone = await CreateTaskAsync(client, "follow-new-alone", goalId: goal.Id);
        var starting = await Preview(alone.Id, goal.Id);
        var pair = (await (await Create("follow-new-pair", goal.Id, new { predecessorId = alone.Id, starting.ExpectedMembers },
            "follow-new-pair")).Content.ReadFromJsonAsync<TaskDto>())!;
        Assert.NotNull(pair.SequenceId);
        Assert.Equal(pair.SequenceId, (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{alone.Id}"))!.SequenceId);
    }

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

    private static async Task<TaskDto> CreateTaskAsync(HttpClient client, string key,
        Guid? goalId = null, Guid? projectId = null, DateOnly? plannedDate = null,
        Guid? sequenceId = null, int? sequenceOrder = null)
    {
        var response = await CreateTaskResponseAsync(client, key, goalId, projectId, plannedDate,
            sequenceId, sequenceOrder);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TaskDto>())!;
    }

    private static Task<HttpResponseMessage> CreateTaskResponseAsync(HttpClient client, string key,
        Guid? goalId = null, Guid? projectId = null, DateOnly? plannedDate = null,
        Guid? sequenceId = null, int? sequenceOrder = null) => SendAsync(client, HttpMethod.Post,
        "/api/v1/tasks", new
        {
            title = $"کار {key}", description = (string?)null, goalId, projectId,
            plannedDate, deadline = (string?)null, sequenceId, sequenceOrder
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

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
