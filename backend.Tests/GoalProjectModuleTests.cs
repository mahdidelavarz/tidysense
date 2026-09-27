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
    public async Task Terminal_flow_blocks_goal_until_project_is_resolved_and_never_infers_goal_status()
    {
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "terminal-goal-create");
        var project = await CreateProjectAsync(client, goal.Id, "terminal-project-create");

        var blockedPreview = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.False(blockedPreview.CanApply);
        Assert.Single(blockedPreview.Blockers);
        Assert.Equal(project.Id, blockedPreview.Blockers[0].ResourceId);
        var blocked = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = blockedPreview.PreviewHash },
            "blocked-goal-terminal");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, blocked.StatusCode);
        Assert.Equal("PARENT_HAS_ACTIVE_CHILDREN",
            (await blocked.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());

        var projectPreview = await PreviewAsync(client, "projects", project.Id, "COMPLETED", project.Version);
        var completedResponse = await SendAsync(client, HttpMethod.Post, $"/api/v1/projects/{project.Id}/terminal",
            new { targetStatus = "COMPLETED", expectedVersion = project.Version, previewHash = projectPreview.PreviewHash },
            "complete-project");
        completedResponse.EnsureSuccessStatusCode();
        var completed = await completedResponse.Content.ReadFromJsonAsync<ProjectDto>();
        Assert.Equal("COMPLETED", completed!.Status);

        var stillActive = await client.GetFromJsonAsync<GoalDto>($"/api/v1/goals/{goal.Id}");
        Assert.Equal("ACTIVE", stillActive!.Status);

        var stalePreview = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = blockedPreview.PreviewHash },
            "stale-goal-preview");
        Assert.Equal(HttpStatusCode.Conflict, stalePreview.StatusCode);
        Assert.Equal("CONFIRMATION_STALE",
            (await stalePreview.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());

        var ready = await PreviewAsync(client, "goals", goal.Id, "ACHIEVED", goal.Version);
        Assert.True(ready.CanApply);
        var achievedResponse = await SendAsync(client, HttpMethod.Post, $"/api/v1/goals/{goal.Id}/terminal",
            new { targetStatus = "ACHIEVED", expectedVersion = goal.Version, previewHash = ready.PreviewHash },
            "achieve-goal");
        achievedResponse.EnsureSuccessStatusCode();
        var achieved = await achievedResponse.Content.ReadFromJsonAsync<GoalDto>();
        Assert.Equal("ACHIEVED", achieved!.Status);
        Assert.Equal(2, achieved.Version);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.DomainEvents.AsNoTracking().Where(x => x.UserId == session.UserId)
            .OrderBy(x => x.OccurredAt).ToListAsync();
        Assert.Equal(4, events.Count);
        Assert.Contains(events, x => x.EventType == "PROJECT_COMPLETED");
        Assert.Contains(events, x => x.EventType == "GOAL_ACHIEVED");
        Assert.All(events, x => Assert.DoesNotContain(goal.Title, x.PayloadJson));
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
