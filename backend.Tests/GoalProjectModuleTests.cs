using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TidySense.Common.Auth;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Goals;
using TidySense.DTOs.Projects;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class GoalProjectModuleTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    [Fact]
    public async Task Goal_service_creates_a_goal_with_the_authenticated_owner()
    {
        var session = await CreateSessionAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var accessor = scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>();
        accessor.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(AuthConstants.UserIdClaim, session.UserId.ToString())], "test"))
        };

        var created = await scope.ServiceProvider.GetRequiredService<GoalService>().CreateAsync(
            new CreateGoalRequest("Goal", "Outcome", null, null),
            $"direct-goal-{Guid.NewGuid():N}", CancellationToken.None);

        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(1, created.Version);
    }

    [Fact]
    public async Task Goal_create_defaults_review_and_matching_replay_has_one_effect()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var body = new { title = "یادگیری زبان", desiredOutcome = "رسیدن به سطح B2", targetDate = (string?)null, reviewDate = (string?)null };

        var first = await SendAsync(client, HttpMethod.Post, "/api/v1/goals", body, "goal-create-replay");
        var replay = await SendAsync(client, HttpMethod.Post, "/api/v1/goals", body, "goal-create-replay");
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, replay.StatusCode);
        var created = await first.Content.ReadFromJsonAsync<GoalDto>();
        var replayed = await replay.Content.ReadFromJsonAsync<GoalDto>();
        Assert.Equal(created!.Id, replayed!.Id);
        Assert.Equal(1, created.Version);
        Assert.Equal("ACTIVE", created.Status);
        Assert.Equal("SYSTEM_DEFAULT", created.ReviewDateSource);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Goals.CountAsync(x => x.UserId == session.UserId));
        Assert.Equal(1, await db.DomainEvents.CountAsync(x => x.UserId == session.UserId && x.EventType == "GOAL_CREATED"));
        Assert.Equal(1, await db.CommandResults.CountAsync(x => x.UserId == session.UserId));
        Assert.Equal(1, await db.OutboxMessages.CountAsync(x =>
            db.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == session.UserId)));

        var mismatch = await SendAsync(client, HttpMethod.Post, "/api/v1/goals",
            new { title = "Different", desiredOutcome = "Different", targetDate = (string?)null, reviewDate = (string?)null },
            "goal-create-replay");
        Assert.Equal(HttpStatusCode.Conflict, mismatch.StatusCode);
        Assert.Equal("IDEMPOTENCY_MISMATCH",
            (await mismatch.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Goal_edit_preserves_review_snapshot_and_stale_write_is_safe()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var created = await CreateGoalAsync(client, "goal-edit-create", "2026-12-01");
        var update = new
        {
            title = created.Title,
            desiredOutcome = created.DesiredOutcome,
            targetDate = "2027-01-15",
            reviewDate = (string?)null,
            expectedVersion = 1
        };
        var changedResponse = await SendAsync(client, HttpMethod.Put, $"/api/v1/goals/{created.Id}", update, "goal-edit");
        changedResponse.EnsureSuccessStatusCode();
        var changed = await changedResponse.Content.ReadFromJsonAsync<GoalDto>();
        Assert.Equal(new DateOnly(2026, 12, 1), changed!.ReviewDate);
        Assert.Equal(new DateOnly(2027, 1, 15), changed.TargetDate);
        Assert.Equal(2, changed.Version);

        var stale = await SendAsync(client, HttpMethod.Put, $"/api/v1/goals/{created.Id}", update, "goal-edit-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var problem = await stale.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("CONFLICT_STALE_VERSION", problem.GetProperty("code").GetString());
        Assert.Equal(2, problem.GetProperty("currentVersion").GetInt64());
    }

    [Fact]
    public async Task A_project_completes_by_its_tasks_never_by_hand_reopens_with_open_work_and_never_infers_the_goal()
    {
        // Owner decision 2026-10-19: a Project's state follows its Tasks; achieving a Goal stays the user's call.
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "terminal-goal-create");
        var project = await CreateProjectAsync(client, goal.Id, "terminal-project-create");
        var today = (await client.GetFromJsonAsync<JsonElement>("/api/v1/today")).GetProperty("localDate").GetString();
        async Task<JsonElement> TaskAsync(string key) => await (await SendAsync(client, HttpMethod.Post, "/api/v1/tasks", new
        {
            title = key, description = (string?)null, goalId = (Guid?)null, projectId = project.Id, plannedDate = (string?)null,
            deadline = (string?)null, sequenceId = (Guid?)null, sequenceOrder = (int?)null, isProtected = false
        }, key)).Content.ReadFromJsonAsync<JsonElement>();
        async Task<JsonElement> ActAsync(JsonElement task, string action, string key, object? extra = null)
        {
            var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.GetProperty("id").GetGuid()}/{action}",
                extra ?? new { expectedVersion = task.GetProperty("version").GetInt64() }, key);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        async Task<string> StatusAsync() => (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{project.Id}"))!.Status;

        var blockedPreview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.False(blockedPreview.CanApply);
        Assert.Equal(project.Id, Assert.Single(blockedPreview.Blockers).ResourceId);

        // Never completed by hand.
        var byHand = await SendAsync(client, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal-preview",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version }, "complete-by-hand-preview");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, byHand.StatusCode);
        Assert.Equal("PROJECT_COMPLETES_BY_PROGRESS",
            (await byHand.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await SendAsync(client, HttpMethod.Post,
            $"/api/v1/projects/{project.Id}/terminal", new { targetStatus = "COMPLETED", expectedVersion = project.Version,
                previewHash = new string('A', 64) }, "complete-by-hand")).StatusCode);
        Assert.Equal("ACTIVE", await StatusAsync());

        // Its last open Task done: it completes itself. Undone: active again.
        var first = await TaskAsync("project-task-1");
        var done = await ActAsync(first, "complete", "complete-1",
            new { expectedVersion = first.GetProperty("version").GetInt64(), completedForLocalDate = today });
        Assert.Equal("COMPLETED", await StatusAsync());
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<GoalDto>($"/api/v1/goals/{goal.Id}"))!.Status);
        var undone = await ActAsync(done, "undo-complete", "undo-1");
        Assert.Equal("ACTIVE", await StatusAsync());
        await ActAsync(undone, "complete", "complete-1-again",
            new { expectedVersion = undone.GetProperty("version").GetInt64(), completedForLocalDate = today });
        Assert.Equal("COMPLETED", await StatusAsync());

        // New work reopens it; dropping that work leaves only done work, so it completes again.
        var second = await TaskAsync("project-task-2");
        Assert.Equal("ACTIVE", await StatusAsync());
        await ActAsync(second, "drop", "drop-2");
        Assert.Equal("COMPLETED", await StatusAsync());

        // A completed Project does not block achieving its Goal, and the Goal is still achieved by hand.
        var ready = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.True(ready.CanApply);
        var achievedResponse = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = ready.PreviewHash },
            "achieve-goal");
        achievedResponse.EnsureSuccessStatusCode();
        Assert.Equal("ACHIEVED", (await achievedResponse.Content.ReadFromJsonAsync<GoalDto>())!.Status);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.DomainEvents.AsNoTracking().Where(x => x.UserId == session.UserId && x.AggregateId == project.Id)
            .OrderBy(x => x.RecordedAt).Select(x => new { x.EventType, x.EventVersion, x.PayloadJson }).ToListAsync();
        Assert.Equal(["PROJECT_CREATED", "PROJECT_COMPLETED", "PROJECT_REOPENED", "PROJECT_COMPLETED", "PROJECT_REOPENED",
            "PROJECT_COMPLETED"], events.Select(x => x.EventType));
        Assert.All(events.Where(x => x.EventType == "PROJECT_COMPLETED"),
            x => Assert.Equal((2, "PROGRESS"), (x.EventVersion, JsonDocument.Parse(x.PayloadJson).RootElement.GetProperty("cause").GetString())));
    }

    [Fact]
    public async Task Stopping_a_goal_or_project_ends_everything_open_under_it_exactly_as_previewed()
    {
        // Owner decision 2026-10-19: open Tasks are dropped, Routines and Projects stop, done work stays done.
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "stop-goal-create");
        var phase = await CreateProjectAsync(client, goal.Id, "stop-phase-create");
        var today = (await client.GetFromJsonAsync<JsonElement>("/api/v1/today")).GetProperty("localDate").GetString();
        async Task<JsonElement> TaskAsync(string key, Guid? goalId, Guid? projectId) => await (await SendAsync(client,
            HttpMethod.Post, "/api/v1/tasks", new
            {
                title = key, description = (string?)null, goalId, projectId, plannedDate = today, deadline = (string?)null,
                sequenceId = (Guid?)null, sequenceOrder = (int?)null, isProtected = false
            }, key)).Content.ReadFromJsonAsync<JsonElement>();
        async Task<JsonElement> RoutineAsync(string key, Guid? goalId, Guid? projectId) => await (await SendAsync(client,
            HttpMethod.Post, "/api/v1/routines", new
            {
                title = key, description = (string?)null, goalId, projectId,
                recurrence = new { type = "DAILY" }, timesOfDay = Array.Empty<string>(), effectiveFromLocalDate = (string?)null
            }, key)).Content.ReadFromJsonAsync<JsonElement>();
        var direct = await TaskAsync("goal-task", goal.Id, null);
        var inPhase = await TaskAsync("phase-task", null, phase.Id);
        var finished = await TaskAsync("phase-done", null, phase.Id);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{finished.GetProperty("id").GetGuid()}/complete",
            new { expectedVersion = finished.GetProperty("version").GetInt64(), completedForLocalDate = today }, "phase-done-complete"))
            .EnsureSuccessStatusCode();
        var habit = await RoutineAsync("goal-routine", goal.Id, null);
        var phaseHabit = await RoutineAsync("phase-routine", null, phase.Id);

        // The preview names every child the stop ends; nothing blocks it.
        var preview = await PreviewAsync(client, "goals", goal.Id, "ABANDONED", goal.Version);
        Assert.True(preview.CanApply);
        Assert.Empty(preview.Blockers);
        Assert.Equal(
            new[] { ("Project", phase.Id, "STOPPED"), ("Task", direct.GetProperty("id").GetGuid(), "DROPPED"),
                ("Task", inPhase.GetProperty("id").GetGuid(), "DROPPED"), ("Routine", habit.GetProperty("id").GetGuid(), "STOPPED"),
                ("Routine", phaseHabit.GetProperty("id").GetGuid(), "STOPPED") }.OrderBy(x => x.Item1).ThenBy(x => x.Item2),
            preview.Cascades.Select(x => (x.ResourceType, x.ResourceId, x.ResultingStatus)).OrderBy(x => x.ResourceType).ThenBy(x => x.ResourceId));

        // A child changed after the preview makes it stale; nothing is applied.
        var late = await TaskAsync("late-task", goal.Id, null);
        var stale = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ABANDONED", expectedVersion = goal.Version, previewHash = preview.PreviewHash }, "stop-goal-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("ACTIVE", (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{phase.Id}"))!.Status);

        var fresh = await PreviewAsync(client, "goals", goal.Id, "ABANDONED", goal.Version);
        Assert.Equal(6, fresh.Cascades.Count);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ABANDONED", expectedVersion = goal.Version, previewHash = fresh.PreviewHash }, "stop-goal"))
            .EnsureSuccessStatusCode();

        Assert.Equal("ABANDONED", (await client.GetFromJsonAsync<GoalDto>($"/api/v1/goals/{goal.Id}"))!.Status);
        Assert.Equal("STOPPED", (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{phase.Id}"))!.Status);
        async Task<string> TaskStatus(JsonElement task) => (await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/tasks/{task.GetProperty("id").GetGuid()}")).GetProperty("status").GetString()!;
        Assert.Equal(["DROPPED", "DROPPED", "DROPPED", "COMPLETED"],
            [await TaskStatus(direct), await TaskStatus(inPhase), await TaskStatus(late), await TaskStatus(finished)]);
        async Task<string> RoutineStatus(JsonElement routine) => (await client.GetFromJsonAsync<JsonElement>(
            $"/api/v1/routines/{routine.GetProperty("id").GetGuid()}")).GetProperty("status").GetString()!;
        Assert.Equal(["STOPPED", "STOPPED"], [await RoutineStatus(habit), await RoutineStatus(phaseHabit)]);
        // Nothing of it is left on Today.
        var day = await client.GetFromJsonAsync<JsonElement>("/api/v1/today");
        Assert.Equal(0, day.GetProperty("tasks").GetArrayLength());
        Assert.Equal(0, day.GetProperty("routineOccurrences").GetArrayLength());
    }

    [Fact]
    public async Task Cross_user_parent_access_and_attachment_are_hidden()
    {
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var ownerClient = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var goal = await CreateGoalAsync(ownerClient, "private-goal");

        Assert.Equal(HttpStatusCode.NotFound,
            (await otherClient.GetAsync($"/api/v1/goals/{goal.Id}")).StatusCode);
        var preview = await SendAsync(otherClient, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal-preview",
            new { targetStatus = "ABANDONED", expectedVersion = 1 });
        Assert.Equal(HttpStatusCode.NotFound, preview.StatusCode);
        var attach = await SendAsync(otherClient, HttpMethod.Post, "/api/v1/projects",
            new { title = "پروژه پنهان", completionMeaning = (string?)null, goalId = goal.Id, targetDate = (string?)null, reviewDate = (string?)null },
            "cross-user-parent");
        Assert.Equal(HttpStatusCode.NotFound, attach.StatusCode);
        Assert.DoesNotContain(owner.UserId.ToString(), await attach.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task PostgreSQL_enforces_terminal_state_and_same_owner_parent()
    {
        var first = await CreateSessionAsync();
        var second = await CreateSessionAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = first.UserId, Title = "Goal", DesiredOutcome = "Outcome",
            ReviewDate = new DateOnly(2026, 12, 1), CreatedAt = now, UpdatedAt = now
        };
        db.Goals.Add(goal);
        await db.SaveChangesAsync();

        db.Projects.Add(new Project
        {
            Id = Guid.NewGuid(), UserId = second.UserId, GoalId = goal.Id, Title = "Wrong owner",
            ReviewDate = new DateOnly(2026, 12, 1), CreatedAt = now, UpdatedAt = now
        });
        var ownerError = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("FK_Projects_Goals_GoalId_UserId", ((PostgresException)ownerError.InnerException!).ConstraintName);
        db.ChangeTracker.Clear();

        var status = "ACHIEVED";
        var stateError = await Assert.ThrowsAsync<PostgresException>(() =>
            db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "Goals" SET "Status" = {status}, "TerminalAt" = NULL WHERE "Id" = {goal.Id}
                """));
        Assert.Equal("CK_Goals_TerminalState", stateError.ConstraintName);
    }

    [Fact]
    public async Task Goal_terminal_and_project_attachment_race_never_leave_an_active_child_under_terminal_goal()
    {
        var session = await CreateSessionAsync();
        using var terminalClient = Client(session.Token);
        using var projectClient = Client(session.Token);
        var goal = await CreateGoalAsync(terminalClient, $"race-goal-{Guid.NewGuid():N}");
        var preview = await PreviewAsync(terminalClient, "goals", goal.Id, "ACHIEVED", goal.Version);

        var terminalTask = SendAsync(terminalClient, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = preview.PreviewHash },
            $"race-terminal-{Guid.NewGuid():N}");
        var attachTask = SendAsync(projectClient, HttpMethod.Post, "/api/v1/projects",
            new { title = "Race project", completionMeaning = (string?)null, goalId = goal.Id,
                targetDate = (string?)null, reviewDate = (string?)null }, $"race-project-{Guid.NewGuid():N}");
        await Task.WhenAll(terminalTask, attachTask);
        var terminalResponse = await terminalTask;
        var attachResponse = await attachTask;

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedGoal = await db.Goals.AsNoTracking().SingleAsync(x => x.Id == goal.Id);
        var activeChildren = await db.Projects.AsNoTracking().CountAsync(x =>
            x.GoalId == goal.Id && x.Status == ParentStatuses.Active);
        Assert.True(persistedGoal.Status == ParentStatuses.Active || activeChildren == 0);
        Assert.True(terminalResponse.StatusCode is HttpStatusCode.OK or HttpStatusCode.Conflict);
        Assert.True(attachResponse.StatusCode is HttpStatusCode.Created or HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Lists_use_an_opaque_cursor_without_duplicates()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        for (var index = 0; index < 3; index++)
            await CreateGoalAsync(client, $"cursor-{index}-{Guid.NewGuid():N}");

        var first = await client.GetFromJsonAsync<CursorPageDto<GoalDto>>("/api/v1/goals?limit=2");
        Assert.NotNull(first);
        Assert.Equal(2, first.Items.Count);
        Assert.True(first.Page.HasMore);
        Assert.NotNull(first.Page.NextCursor);
        var second = await client.GetFromJsonAsync<CursorPageDto<GoalDto>>(
            $"/api/v1/goals?limit=2&cursor={Uri.EscapeDataString(first.Page.NextCursor)}");
        Assert.NotNull(second);
        Assert.Single(second.Items);
        Assert.Empty(first.Items.Select(x => x.Id).Intersect(second.Items.Select(x => x.Id)));
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

    private static async Task<GoalDto> CreateGoalAsync(HttpClient client, string key, string? targetDate = null)
    {
        var response = await SendAsync(client, HttpMethod.Post, "/api/v1/goals",
            new { title = "هدف نمونه", desiredOutcome = "نتیجه روشن", targetDate, reviewDate = (string?)null }, key);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<GoalDto>())!;
    }

    private static async Task<ProjectDto> CreateProjectAsync(HttpClient client, Guid goalId, string key)
    {
        var response = await SendAsync(client, HttpMethod.Post, "/api/v1/projects",
            new { title = "پروژه نمونه", completionMeaning = "خروجی محدود", goalId, targetDate = (string?)null, reviewDate = (string?)null }, key);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ProjectDto>())!;
    }

    private static async Task<TerminalPreviewDto> PreviewAsync(HttpClient client, string resource,
        Guid id, string targetStatus, long version)
    {
        var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/{resource}/{id}/terminal-preview",
            new { targetStatus, expectedVersion = version });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TerminalPreviewDto>())!;
    }

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path,
        object body, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Session(Guid UserId, string Token);
}
