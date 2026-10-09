using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.DTOs.Planning;
using TidySense.DTOs.Reconcile;
using TidySense.DTOs.Tasks;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Operations;

namespace TidySense.Backend.Tests;

/// <summary>Retention classes, the maintenance run and account erasure against real PostgreSQL.</summary>
public sealed class OperationsRetentionTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private static readonly string Hash = new('E', 64);

    [Fact]
    public async Task Every_persisted_record_type_has_one_retention_class()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = db.Model.GetEntityTypes().Select(x => x.ClrType).ToHashSet();
        var catalogued = RetentionCatalog.Entries.Select(x => x.Entity).ToArray();
        Assert.Equal(catalogued.Length, catalogued.Distinct().Count());
        Assert.Empty(persisted.Except(catalogued));
        Assert.Empty(catalogued.Except(persisted));
        Assert.All(RetentionCatalog.Entries, x =>
        {
            Assert.Contains(x.Class, new[] { "CANONICAL", "R1", "R2", "R3", "R4" });
            Assert.False(string.IsNullOrWhiteSpace(x.Rule));
        });
    }

    [Fact]
    public async Task A_maintenance_run_closes_lost_work_and_purges_each_class_at_its_boundary_while_R1_stays()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Clock.GetUtcNow();
        var user = NewUser(now);
        db.Add(user);
        await db.SaveChangesAsync();

        // R4: 91 days is past the boundary, 89 days is not. An unfinished idempotency record is never removed.
        var oldCall = Invocation(user.Id, now.AddDays(-91));
        var recentCall = Invocation(user.Id, now.AddDays(-89));
        var oldKey = Idempotency(user.Id, "old", "SUCCEEDED", now.AddDays(-91));
        var unfinishedKey = Idempotency(user.Id, "unfinished", "IN_PROGRESS", now.AddDays(-91));
        var result = new CommandResult
        {
            Id = Guid.NewGuid(), UserId = user.Id, IdempotencyRecordId = oldKey.Id, CommandType = "TEST",
            Status = "SUCCEEDED", CreatedAt = now.AddDays(-91)
        };
        db.AddRange(oldCall, recentCall, oldKey, unfinishedKey, result);
        await db.SaveChangesAsync();
        var oldEvent = Event(user.Id, now.AddDays(-200), result.Id);
        db.AddRange(oldEvent, new OutboxMessage { Id = Guid.NewGuid(), EventId = oldEvent.EventId, CreatedAt = now.AddDays(-200) });

        // R3: a draft that ended 31 days ago goes with its revision, confirmation and attempts; 29 days stays.
        var asked = Attempt(user.Id, now.AddDays(-32), x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = "{\"questions\":[{\"id\":\"q1\",\"text\":\"?\"}]}";
        });
        db.Add(asked);
        await db.SaveChangesAsync();
        var oldAttempt = Attempt(user.Id, now.AddDays(-31), x =>
        {
            x.PreviousAttemptId = asked.Id;
            x.ClarificationTurn = 1;
            Drafted(x);
        });
        var oldDraft = Draft(oldAttempt, PlanningDraftStatuses.Expired, now.AddDays(-31));
        var recentAttempt = Attempt(user.Id, now.AddDays(-29), Drafted);
        var recentDraft = Draft(recentAttempt, PlanningDraftStatuses.Cancelled, now.AddDays(-29));
        // Still marked reviewable long after its expiry: it ends now, so its retention starts now.
        var forgottenAttempt = Attempt(user.Id, now.AddDays(-60), Drafted);
        var forgottenDraft = Draft(forgottenAttempt, PlanningDraftStatuses.Reviewable, now.AddDays(-60));
        var lostAttempt = Attempt(user.Id, now.AddMinutes(-10), x =>
        {
            x.Status = PlanningAttemptStatuses.Running;
            x.CompletedAt = null;
        });
        db.AddRange(oldAttempt, oldDraft, recentAttempt, recentDraft, forgottenAttempt, forgottenDraft);
        await db.SaveChangesAsync();
        db.AddRange(lostAttempt, new ActionConfirmation
        {
            Id = Guid.NewGuid(), UserId = user.Id, PlanningDraftId = oldDraft.Id, PlanningDraftRevision = 1,
            ActionType = "APPLY_PLANNING_DRAFT", PreviewHash = Hash, CreatedAt = now.AddDays(-31),
            ExpiresAt = now.AddDays(-31).AddMinutes(15)
        });

        // R2: a session closed 181 days ago goes with everything attached to it; 179 days and an open one stay.
        var oldSession = Session(user.Id, ReconcileSessionStatuses.Completed, now.AddDays(-181));
        var recentSession = Session(user.Id, ReconcileSessionStatuses.Completed, now.AddDays(-179));
        var openSession = Session(user.Id, ReconcileSessionStatuses.Open, now.AddDays(-400));
        var oldExplanation = Explanation(oldSession, ReconcileExplanationStatuses.Ready, now.AddDays(-181));
        var lostExplanation = Explanation(openSession, ReconcileExplanationStatuses.Running, now.AddMinutes(-10));
        var recommendation = new ReconcileRecommendation
        {
            Id = Guid.NewGuid(), ExplanationId = oldExplanation.Id, UserId = user.Id, Ordinal = 1, RuleId = "R2",
            RuleVersion = "test", ActionType = "KEEP_TASKS", TaskIds = [Guid.NewGuid()], EvidenceFingerprint = Hash,
            Explanation = "explanation"
        };
        var sessionEvent = Event(user.Id, now.AddDays(-181), null, oldSession.Id);
        db.AddRange(oldSession, recentSession, openSession, oldExplanation, lostExplanation, recommendation, sessionEvent,
            new ActionConfirmation
            {
                Id = Guid.NewGuid(), UserId = user.Id, ReconcileSessionId = oldSession.Id,
                ReconcileRecommendationId = recommendation.Id, ActionType = "KEEP_TASKS", PreviewHash = Hash,
                CreatedAt = now.AddDays(-181), ExpiresAt = now.AddDays(-181).AddMinutes(15)
            },
            new AiInvocation
            {
                Id = Guid.NewGuid(), UserId = user.Id, ReconcileExplanationId = oldExplanation.Id, Family = "RECONCILE",
                ConfigurationKey = "test", ProviderKey = "test", Model = "test", PromptVersion = "test",
                SchemaVersion = "test", ContextBuilderVersion = "test", RepairPolicyVersion = "test", Sequence = 1,
                StartedAt = now.AddDays(-10), CompletedAt = now.AddDays(-10), Outcome = AiInvocationOutcomes.Succeeded
            },
            new ReconcileExposure { Id = Guid.NewGuid(), UserId = user.Id, LocalDate = Date(now.AddDays(-181)), FirstSeenAt = now.AddDays(-181) },
            new ReconcileExposure { Id = Guid.NewGuid(), UserId = user.Id, LocalDate = Date(now.AddDays(-179)), FirstSeenAt = now.AddDays(-179) },
            new ReconcilePrompt { Id = Guid.NewGuid(), UserId = user.Id, LocalDate = Date(now.AddDays(-200)), UpdatedAt = now },
            new ReconcilePrompt { Id = Guid.NewGuid(), UserId = user.Id, LocalDate = Date(now.AddDays(-5)), UpdatedAt = now });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var counts = await scope.ServiceProvider.GetRequiredService<OperationsMaintenance>()
            .RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, counts["lostExplanations"]);
        Assert.Equal(1, counts["lostPlanningAttempts"]);
        Assert.Equal("GENERATION_TIMEOUT", (await db.ReconcileExplanations.AsNoTracking()
            .SingleAsync(x => x.Id == lostExplanation.Id)).FailureCode);
        Assert.Equal(PlanningAttemptStatuses.Failed, (await db.PlanningAttempts.AsNoTracking()
            .SingleAsync(x => x.Id == lostAttempt.Id)).Status);

        Assert.Equal(1, counts["aiInvocations"]);
        Assert.Equal(1, counts["idempotencyRecords"]);
        Assert.Equal(1, counts["outboxMessages"]);
        Assert.Equal([unfinishedKey.Id], await db.IdempotencyRecords.Where(x => x.UserId == user.Id)
            .Select(x => x.Id).ToArrayAsync());
        Assert.False(await db.AiInvocations.AnyAsync(x => x.Id == oldCall.Id));
        Assert.True(await db.AiInvocations.AnyAsync(x => x.Id == recentCall.Id));

        Assert.Equal(1, counts["planningDrafts"]);
        Assert.Equal(1, counts["planningConfirmations"]);
        Assert.Equal(2, counts["planningAttempts"]);
        Assert.Equal(new[] { recentDraft.Id, forgottenDraft.Id }.Order(), (await db.PlanningDrafts
            .Where(x => x.UserId == user.Id).Select(x => x.Id).ToArrayAsync()).Order());
        Assert.Equal(PlanningDraftStatuses.Expired, (await db.PlanningDrafts.AsNoTracking()
            .SingleAsync(x => x.Id == forgottenDraft.Id)).Status);
        Assert.Equal(0, await db.PlanningDraftRevisions.CountAsync(x => x.DraftId == oldDraft.Id));
        Assert.False(await db.PlanningAttempts.AnyAsync(x => x.Id == asked.Id || x.Id == oldAttempt.Id));

        Assert.Equal(1, counts["reconcileSessions"]);
        Assert.Equal(1, counts["reconcileConfirmations"]);
        Assert.Equal(1, counts["reconcilePrompts"]);
        Assert.Equal(1, counts["reconcileExposures"]);
        Assert.Equal(1, await db.ReconcileExposures.CountAsync(x => x.UserId == user.Id));
        Assert.Equal(new[] { recentSession.Id, openSession.Id }.Order(), (await db.ReconcileSessions
            .Where(x => x.UserId == user.Id).Select(x => x.Id).ToArrayAsync()).Order());
        Assert.Equal(0, await db.ReconcileRecommendations.CountAsync(x => x.Id == recommendation.Id));
        Assert.Equal(0, await db.ReconcileFacts.CountAsync(x => x.SessionId == oldSession.Id));
        // The diagnostic row of the purged explanation is inside its own window and only loses the link.
        Assert.Null((await db.AiInvocations.AsNoTracking().SingleAsync(x =>
            x.UserId == user.Id && x.Family == "RECONCILE")).ReconcileExplanationId);

        // R1 evidence is untouched, however old.
        Assert.True(await db.DomainEvents.AnyAsync(x => x.EventId == oldEvent.EventId));
        Assert.True(await db.DomainEvents.AnyAsync(x => x.EventId == sessionEvent.EventId));
        Assert.True(await db.CommandResults.AnyAsync(x => x.Id == result.Id));

        var record = await db.OperationsRecords.AsNoTracking().OrderByDescending(x => x.CreatedAt)
            .FirstAsync(x => x.Kind == OperationsRecordKinds.MaintenanceRun);
        Assert.Equal(OperationsRecordOutcomes.Succeeded, record.Outcome);
        Assert.Equal(1, JsonDocument.Parse(record.DetailsJson).RootElement.GetProperty("counts")
            .GetProperty("reconcileSessions").GetInt32());

        // A second run finds nothing left to do.
        var again = await scope.ServiceProvider.GetRequiredService<OperationsMaintenance>()
            .RunAsync(TestContext.Current.CancellationToken);
        Assert.All(again.Values, x => Assert.Equal(0, x));
        await CleanUpAsync(scope.ServiceProvider, user.Id);
    }

    [Fact]
    public async Task A_purge_removes_at_most_one_batch_per_statement_oldest_first_and_the_next_run_continues()
    {
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Operations:Retention:BatchSize"] = "2" })));
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Clock.GetUtcNow();
        var user = NewUser(now);
        var calls = Enumerable.Range(0, 5).Select(i => Invocation(user.Id, now.AddDays(-100 - i))).ToArray();
        var sessions = Enumerable.Range(0, 3).Select(i => Session(user.Id, ReconcileSessionStatuses.Completed,
            now.AddDays(-200 - i))).ToArray();
        db.Add(user);
        db.AddRange(calls);
        db.AddRange(sessions);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var maintenance = scope.ServiceProvider.GetRequiredService<OperationsMaintenance>();

        var first = await maintenance.RunAsync(TestContext.Current.CancellationToken);
        Assert.Equal(2, first["aiInvocations"]);
        Assert.Equal(2, first["reconcileSessions"]);
        // The oldest went first; the newest of the due rows are still there.
        Assert.Equal(calls.Take(3).Select(x => x.Id).Order(), (await db.AiInvocations
            .Where(x => x.UserId == user.Id).Select(x => x.Id).ToArrayAsync()).Order());
        Assert.Equal([sessions[0].Id], await db.ReconcileSessions.Where(x => x.UserId == user.Id)
            .Select(x => x.Id).ToArrayAsync());
        Assert.Equal(1, await db.ReconcileFacts.CountAsync(x => x.Session.UserId == user.Id));

        var second = await maintenance.RunAsync(TestContext.Current.CancellationToken);
        Assert.Equal(2, second["aiInvocations"]);
        Assert.Equal(1, second["reconcileSessions"]);
        var third = await maintenance.RunAsync(TestContext.Current.CancellationToken);
        Assert.Equal(1, third["aiInvocations"]);
        Assert.False(await db.AiInvocations.AnyAsync(x => x.UserId == user.Id));
        await CleanUpAsync(scope.ServiceProvider, user.Id);
    }

    [Fact]
    public async Task Erasing_an_account_removes_everything_personal_and_keeps_the_audit_history_under_a_tombstone()
    {
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);
        // The clock is pinned after the real time (see TestClock.Pin): the Task is planned, then nine days pass.
        var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3);
        PinLocal(day);
        const string title = "کار شخصی برای پاک شدن";
        var task = await CreateTaskAsync(client, "erase-task", day, title);
        await CreateTaskAsync(otherClient, "erase-other", day, "کار کاربر دیگر");
        PinLocal(day.AddDays(9));
        // Looking at an eligible Reconcile twice on one day is one exposure.
        Assert.True((await client.GetFromJsonAsync<ReconcileOverviewDto>("/api/v1/reconcile/overview"))!.Eligible);
        await client.GetFromJsonAsync<ReconcileOverviewDto>("/api/v1/reconcile/overview");
        await using (var early = factory.Services.CreateAsyncScope())
            Assert.Equal(day.AddDays(9), (await early.ServiceProvider.GetRequiredService<AppDbContext>()
                .ReconcileExposures.SingleAsync(x => x.UserId == owner.UserId)).LocalDate);
        var session = await ReadAsync<ReconcileSessionDto>(await SendAsync(client, HttpMethod.Post,
            "/api/v1/reconcile/sessions", new { triggerType = "MANUAL" }, "erase-open"));
        var preview = await ReadAsync<ActionConfirmationDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/reconcile/sessions/{session.Id}/previews", new { actionType = "KEEP_TASKS", taskIds = new[] { task.Id } }));
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/confirmations/{preview.Id}/submit", new { },
            "erase-submit")).EnsureSuccessStatusCode();
        var attempt = await ReadAsync<PlanningAttemptDto>(await SendAsync(client, HttpMethod.Post,
            "/api/v1/planning/attempts", new { clientAttemptId = "attempt-erase", intention = "یک برنامهٔ شخصی", replaceActive = false }));
        for (var poll = 0; poll < 200; poll++)
        {
            var current = (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{attempt.Id}"))!;
            if (current.Status is not ("QUEUED" or "RUNNING")) break;
            await Task.Delay(50);
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var phone = (await db.Users.AsNoTracking().SingleAsync(x => x.Id == owner.UserId)).PhoneNumber;
        var events = await db.DomainEvents.CountAsync(x => x.UserId == owner.UserId);
        var results = await db.CommandResults.CountAsync(x => x.UserId == owner.UserId);
        Assert.True(events >= 3);
        var erasure = scope.ServiceProvider.GetRequiredService<UserErasureService>();
        await Assert.ThrowsAsync<ArgumentException>(() => erasure.EraseAsync(owner.UserId, "operator",
            "the user asked by phone", TestContext.Current.CancellationToken));

        var erased = await erasure.EraseAsync(owner.UserId, "drill-operator", "USER_REQUEST",
            TestContext.Current.CancellationToken);
        Assert.NotNull(erased);
        Assert.Equal(1, erased.Deleted["users"]);
        Assert.Equal(1, erased.Deleted["tasks"]);
        Assert.Equal(1, erased.Deleted["reconcileExposures"]);
        Assert.Equal(events, erased.Tombstoned["domainEvents"]);
        Assert.Equal(results, erased.Tombstoned["commandResults"]);

        // No table still refers to the account; the history survives under the tombstone only.
        // Table names come from the model, not from input.
#pragma warning disable EF1002
        foreach (var table in db.Model.GetEntityTypes().Where(x => x.FindProperty("UserId") is not null)
                     .Select(x => x.GetTableName()!))
            Assert.Equal(0, await db.Database.SqlQueryRaw<int>(
                    $"SELECT COUNT(*)::int AS \"Value\" FROM \"{table}\" WHERE \"UserId\" = {{0}}", owner.UserId)
                .SingleAsync());
#pragma warning restore EF1002
        Assert.False(await db.Users.AnyAsync(x => x.Id == owner.UserId || x.PhoneNumber == phone));
        Assert.Equal(events, await db.DomainEvents.CountAsync(x => x.UserId == erased.TombstoneUserId));
        Assert.Equal(results, await db.CommandResults.CountAsync(x => x.UserId == erased.TombstoneUserId));
        // What stays carries no text the user wrote.
        var kept = string.Join('\n', await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == erased.TombstoneUserId).Select(x => x.PayloadJson).ToArrayAsync());
        Assert.DoesNotContain("شخصی", kept);

        // The record of the erasure names the operator, the reason and the tombstone, never the account.
        var record = await db.OperationsRecords.AsNoTracking().SingleAsync(x =>
            x.Kind == OperationsRecordKinds.UserErasure && x.Operator == "drill-operator");
        Assert.Equal("drill-operator", record.Operator);
        Assert.Equal("USER_REQUEST", record.ReasonCode);
        Assert.Contains(erased.TombstoneUserId.ToString(), record.DetailsJson);
        Assert.DoesNotContain(owner.UserId.ToString(), record.DetailsJson);
        Assert.DoesNotContain(phone, record.DetailsJson);

        // The session is gone with the account; another account is untouched; repeating finds nothing.
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Equal(1, await db.Tasks.CountAsync(x => x.UserId == other.UserId));
        Assert.Equal(System.Net.HttpStatusCode.OK, (await otherClient.GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Null(await erasure.EraseAsync(owner.UserId, "drill-operator", "USER_REQUEST",
            TestContext.Current.CancellationToken));
    }

    private static DateOnly Date(DateTimeOffset instant) => DateOnly.FromDateTime(instant.UtcDateTime);

    /// <summary>The tests of this class share one database and one clock; each leaves nothing another could purge.</summary>
    private static Task CleanUpAsync(IServiceProvider services, Guid userId) =>
        services.GetRequiredService<UserErasureService>().EraseAsync(userId, "test-cleanup", "TEST_CLEANUP",
            TestContext.Current.CancellationToken);

    private void PinLocal(DateOnly date) =>
        factory.Clock.Pin(new DateTimeOffset(date.Year, date.Month, date.Day, 10, 0, 0, TimeSpan.FromMinutes(210)));

    private static User NewUser(DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000), IsActive = true,
        SetupComplete = true, CreatedAt = now.AddDays(-500)
    };

    private static AiInvocation Invocation(Guid userId, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Family = "PLANNING", ConfigurationKey = "test", ProviderKey = "test",
        Model = "test", PromptVersion = "test", SchemaVersion = "test", ContextBuilderVersion = "test",
        RepairPolicyVersion = "test", Sequence = 1, StartedAt = at, CompletedAt = at,
        Outcome = AiInvocationOutcomes.Succeeded
    };

    private static IdempotencyRecord Idempotency(Guid userId, string key, string status, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, IdempotencyKey = $"retention-{key}", CommandType = "TEST",
        RequestHash = Hash, Status = status, CreatedAt = at, ExpiresAt = at.AddDays(1)
    };

    private static DomainEvent Event(Guid userId, DateTimeOffset at, Guid? resultId, Guid? sessionId = null) => new()
    {
        EventId = Guid.NewGuid(), EventType = "PROJECT_TITLE_CHANGED", EventVersion = 1, OccurredAt = at,
        RecordedAt = at, UserId = userId, Actor = "USER", AggregateType = "Project", AggregateId = Guid.NewGuid(),
        AggregateVersion = 1, TransactionId = Guid.NewGuid(), CorrelationId = Guid.NewGuid().ToString("N"),
        CommandResultId = resultId, ReconcileSessionId = sessionId, PayloadJson = "{\"changedFields\":[\"title\"]}"
    };

    private static PlanningAttempt Attempt(Guid userId, DateTimeOffset at, Action<PlanningAttempt> set)
    {
        var attempt = new PlanningAttempt
        {
            Id = Guid.NewGuid(), UserId = userId, ClientAttemptId = Guid.NewGuid().ToString("N"), RequestHash = Hash,
            Status = PlanningAttemptStatuses.Succeeded, Intention = "retention", GeneratorKey = "test",
            ContextBuilderVersion = "test", ContextFingerprint = Hash, CreatedAt = at, UpdatedAt = at, CompletedAt = at
        };
        set(attempt);
        return attempt;
    }

    private static void Drafted(PlanningAttempt attempt)
    {
        attempt.Outcome = PlanningOutcomes.Draft;
        attempt.DraftId = Guid.NewGuid();
    }

    private static PlanningDraft Draft(PlanningAttempt attempt, string status, DateTimeOffset at) => new()
    {
        Id = attempt.DraftId!.Value, UserId = attempt.UserId, AttemptId = attempt.Id, Status = status,
        SchemaVersion = "test", ContextFingerprint = Hash, CreatedAt = at, UpdatedAt = at, ExpiresAt = at.AddDays(1),
        Revisions = [new PlanningDraftRevision { Id = Guid.NewGuid(), Revision = 1, CreatedAt = at }]
    };

    private static ReconcileSession Session(Guid userId, string status, DateTimeOffset at)
    {
        var id = Guid.NewGuid();
        return new ReconcileSession
        {
            Id = id, UserId = userId, Status = status, RulesCatalogVersion = "test", Timezone = "Asia/Tehran",
            LocalDate = Date(at), OpenedAt = at.AddMinutes(-10),
            CompletedAt = status == ReconcileSessionStatuses.Open ? null : at,
            Facts =
            [
                new ReconcileFact { Id = Guid.NewGuid(), SessionId = id, FactType = "TASK_EXECUTION", EntityType = "Task", EntityId = Guid.NewGuid() }
            ],
            RuleMatches =
            [
                new RuleMatch { Id = Guid.NewGuid(), SessionId = id, RuleId = "R2", RuleVersion = "test", AffectedEntityIds = [Guid.NewGuid()], MatchedAt = at }
            ]
        };
    }

    private static ReconcileExplanation Explanation(ReconcileSession session, string status, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), SessionId = session.Id, UserId = session.UserId, Status = status, ExplainerKey = "test",
        ContextBuilderVersion = "test", ContextFingerprint = Hash,
        Summary = status == ReconcileExplanationStatuses.Ready ? "summary" : null, CreatedAt = at,
        CompletedAt = status == ReconcileExplanationStatuses.Running ? null : at
    };

    private HttpClient Client(string token)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private async Task<Account> CreateSessionAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = NewUser(DateTimeOffset.UtcNow.AddDays(500));
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Account(user.Id, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private static async Task<TaskDto> CreateTaskAsync(HttpClient client, string key, DateOnly plannedDate,
        string title) => await ReadAsync<TaskDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/tasks", new
    {
        title, description = (string?)null, goalId = (Guid?)null, projectId = (Guid?)null, plannedDate,
        deadline = (string?)null, sequenceId = (Guid?)null, sequenceOrder = (int?)null, isProtected = false
    }, key));

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path,
        object body, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Account(Guid UserId, string Token);
}
