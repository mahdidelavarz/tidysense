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
using TidySense.DTOs.Projects;
using TidySense.DTOs.Tasks;
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

        await using var verifyScope = factory.Services.CreateAsyncScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.DomainEvents.CountAsync(x =>
            x.UserId == session.UserId && x.AggregateId == first.Id && x.EventType == "TASK_COMPLETED"));
        Assert.Equal(1, await db.CommandResults.CountAsync(x =>
            x.UserId == session.UserId && x.CommandType == "COMPLETE_TASK" && x.AggregateId == first.Id));
    }

    [Fact]
    public async Task Parent_terminal_preview_blocks_on_dated_or_undated_tasks_and_restore_revalidates_parent()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "task-parent-goal");
        var project = await CreateProjectAsync(client, goal.Id, "task-parent-project");
        var task = await CreateTaskAsync(client, "project-undated-task",
            projectId: project.Id, plannedDate: null);

        var blockedPreview = await PreviewAsync(client, "projects", project.Id, "COMPLETED", project.Version);
        Assert.False(blockedPreview.CanApply);
        var blocker = Assert.Single(blockedPreview.Blockers);
        Assert.Equal("Task", blocker.ResourceType);
        Assert.Equal(task.Id, blocker.ResourceId);

        var droppedResponse = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.Id}/drop",
            new { expectedVersion = task.Version }, "drop-project-task");
        droppedResponse.EnsureSuccessStatusCode();
        var dropped = await droppedResponse.Content.ReadFromJsonAsync<TaskDto>();
        Assert.Equal("DROPPED", dropped!.Status);
        Assert.Equal(2, dropped.Version);

        var ready = await PreviewAsync(client, "projects", project.Id, "COMPLETED", project.Version);
        Assert.True(ready.CanApply);
        var terminalResponse = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version, previewHash = ready.PreviewHash },
            "complete-project-after-task");
        terminalResponse.EnsureSuccessStatusCode();

        var restore = await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.Id}/restore",
            new { expectedVersion = dropped.Version, plannedDate = (string?)null }, "restore-under-terminal-parent");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, restore.StatusCode);
        Assert.Equal("PARENT_NOT_ACTIVE", await ProblemCodeAsync(restore));

        var direct = await CreateTaskAsync(client, "goal-undated-task", goalId: goal.Id, plannedDate: null);
        var goalPreview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.Contains(goalPreview.Blockers, x => x.ResourceType == "Task" && x.ResourceId == direct.Id);
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
        var preview = await PreviewAsync(firstClient, "projects", project.Id, "COMPLETED", project.Version);

        var terminalCall = SendAsync(firstClient, HttpMethod.Post,
            $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version, previewHash = preview.PreviewHash },
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
