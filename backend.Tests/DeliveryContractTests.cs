using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class DeliveryContractTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    [Fact]
    public async Task Same_key_replays_one_result_and_different_hash_is_rejected()
    {
        var (user, project) = await SeedAsync();
        const string key = "same-key";
        var calls = 0;
        var request = Request(user.Id, key, "rename:one");
        async Task<CommandResult> RunAsync(CommandExecutionRequest identity) => await ExecuteAsync(identity,
            async (db, owner, ct) =>
            {
                Interlocked.Increment(ref calls);
                return await RenameAsync(db, owner, project.Id, 1, "New title", ct);
            });

        var first = await RunAsync(request);
        var replay = await RunAsync(request with { ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1) });
        Assert.Equal("SUCCEEDED", first.Status);
        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(1, calls);
        await Assert.ThrowsAsync<IdempotencyMismatchException>(() =>
            RunAsync(Request(user.Id, key, "rename:other")));
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, (await db.Projects.SingleAsync(x => x.Id == project.Id)).Version);
        Assert.Equal(1, await db.CommandResults.CountAsync(x => x.UserId == user.Id));
        Assert.Equal(1, await db.DomainEvents.CountAsync(x => x.UserId == user.Id));
        Assert.Equal(1, await db.OutboxMessages.CountAsync(x =>
            db.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == user.Id)));
        var domainEvent = await db.DomainEvents.SingleAsync(x => x.UserId == user.Id);
        var outbox = await db.OutboxMessages.SingleAsync(x => x.EventId == domainEvent.EventId);
        Assert.Equal("R1", domainEvent.RetentionClass);
        Assert.Equal("R4", outbox.RetentionClass);
        Assert.Equal("R1", (await db.CommandResults.SingleAsync(x => x.UserId == user.Id)).RetentionClass);
        Assert.Equal("R4", (await db.IdempotencyRecords.SingleAsync(x => x.UserId == user.Id)).RetentionClass);
        Assert.Equal(first.Id, domainEvent.CommandResultId);
    }

    [Fact]
    public async Task Payload_policy_rejects_unapproved_fields_sensitive_names_and_unregistered_schemas()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var validator = scope.ServiceProvider.GetRequiredService<EventPayloadValidator>();
        Assert.Throws<ArgumentException>(() => new EventPayloadSchema("TEST_FORBIDDEN_SCHEMA", 1,
            new EventPayloadFieldPolicy("accessToken", true, _ => true)));
        Assert.Throws<ArgumentException>(() => validator.Validate("PROJECT_TITLE_CHANGED", 1,
            "{\"changedFields\":[{\"otp\":\"1234\"}]}"));
        Assert.Throws<ArgumentException>(() => validator.Validate("PROJECT_TITLE_CHANGED", 1,
            "{\"changedFields\":[\"" + new string('x', EventPayloadValidator.MaxPayloadUtf8Bytes) + "\"]}"));
        Assert.Throws<ArgumentException>(() => validator.Validate("UNREGISTERED_TEST_EVENT", 1, "{}"));

        var (user, project) = await SeedAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => ExecuteAsync(
            Request(user.Id, "unapproved-payload", "rename:unapproved"), async (db, owner, ct) =>
            {
                var mutation = await RenameAsync(db, owner, project.Id, 1, "Not committed", ct);
                return mutation with { PayloadJson = "{\"changedFields\":[\"title\"],\"title\":\"Not approved\"}" };
            }));

        await using var checkScope = factory.Services.CreateAsyncScope();
        var check = checkScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Original", (await check.Projects.SingleAsync(x => x.Id == project.Id)).Title);
        Assert.False(await check.DomainEvents.AnyAsync(x => x.UserId == user.Id));
        Assert.False(await check.OutboxMessages.AnyAsync(x =>
            check.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == user.Id)));
    }

    [Fact]
    public async Task Database_rejects_oversized_payload_when_EF_validation_is_bypassed()
    {
        var (user, project) = await SeedAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var payload = "{\"changedFields\":[\"" + new string('x', 4096) + "\"]}";
        var now = DateTimeOffset.UtcNow;
        var error = await Assert.ThrowsAsync<Npgsql.PostgresException>(() =>
            db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "DomainEvents"
                    ("EventId", "EventType", "EventVersion", "OccurredAt", "RecordedAt", "UserId",
                     "Actor", "AggregateType", "AggregateId", "AggregateVersion", "TransactionId",
                     "CorrelationId", "PayloadJson", "RetentionClass")
                VALUES ({Guid.NewGuid()}, {"PROJECT_TITLE_CHANGED"}, {1}, {now}, {now}, {user.Id},
                        {"USER"}, {"Project"}, {project.Id}, {1L}, {Guid.NewGuid()}, {"raw-sql-size-test"},
                        {payload}::jsonb, {"R1"})
                """, TestContext.Current.CancellationToken));
        Assert.Equal("CK_DomainEvents_PayloadSize", error.ConstraintName);
    }

    [Fact]
    public async Task R4_records_can_be_deleted_without_removing_R1_result_or_event()
    {
        var (user, project) = await SeedAsync();
        var result = await ExecuteAsync(Request(user.Id, "retention-key", "rename:retention"),
            (db, owner, ct) => RenameAsync(db, owner, project.Id, 1, "Retained", ct));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var commandResult = await db.CommandResults.SingleAsync(x => x.Id == result.Id);
        var domainEvent = await db.DomainEvents.SingleAsync(x => x.CommandResultId == result.Id);
        Assert.Equal("R1", commandResult.RetentionClass);
        Assert.Equal("R1", domainEvent.RetentionClass);

        Assert.Equal(1, await db.OutboxMessages.Where(x => x.EventId == domainEvent.EventId)
            .ExecuteDeleteAsync(TestContext.Current.CancellationToken));
        Assert.Equal(1, await db.IdempotencyRecords.Where(x => x.Id == commandResult.IdempotencyRecordId)
            .ExecuteDeleteAsync(TestContext.Current.CancellationToken));

        db.ChangeTracker.Clear();
        Assert.NotNull(await db.CommandResults.SingleOrDefaultAsync(x => x.Id == result.Id));
        Assert.NotNull(await db.DomainEvents.SingleOrDefaultAsync(x => x.EventId == domainEvent.EventId));
        Assert.False(await db.IdempotencyRecords.AnyAsync(x => x.Id == commandResult.IdempotencyRecordId));
        Assert.False(await db.OutboxMessages.AnyAsync(x => x.EventId == domainEvent.EventId));
    }

    [Fact]
    public async Task Concurrent_same_key_commits_once_and_stale_version_has_no_event()
    {
        var (user, project) = await SeedAsync();
        var calls = 0;
        var identity = Request(user.Id, "concurrent-key", "rename:parallel");
        async Task<CommandResult> RunAsync() => await ExecuteAsync(identity, async (db, owner, ct) =>
        {
            Interlocked.Increment(ref calls);
            return await RenameAsync(db, owner, project.Id, 1, "Parallel title", ct);
        });
        var parallel = await Task.WhenAll(RunAsync(), RunAsync());
        Assert.Equal(parallel[0].Id, parallel[1].Id);
        Assert.Equal(1, calls);

        var stale = await ExecuteAsync(Request(user.Id, "stale-key", "rename:stale"),
            (db, owner, ct) => RenameAsync(db, owner, project.Id, 1, "Stale title", ct));
        Assert.Equal("CONFLICTED", stale.Status);
        Assert.Equal("CONFLICT_STALE_VERSION", stale.ErrorCode);
        Assert.Equal(1, stale.ExpectedVersion);
        Assert.Equal(2, stale.AggregateVersion);
        await using var scope = factory.Services.CreateAsyncScope();
        var check = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Parallel title", (await check.Projects.SingleAsync(x => x.Id == project.Id)).Title);
        Assert.Equal(1, await check.DomainEvents.CountAsync(x => x.UserId == user.Id));
        Assert.Equal(1, await check.OutboxMessages.CountAsync(x =>
            check.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == user.Id)));
    }

    [Fact]
    public async Task Different_keys_compete_on_version_and_rollback_removes_all_intent()
    {
        var (user, project) = await SeedAsync();
        var competing = await Task.WhenAll(
            ExecuteAsync(Request(user.Id, "version-a", "rename:a"),
                (db, owner, ct) => RenameAsync(db, owner, project.Id, 1, "A", ct)),
            ExecuteAsync(Request(user.Id, "version-b", "rename:b"),
                (db, owner, ct) => RenameAsync(db, owner, project.Id, 1, "B", ct)));
        Assert.Single(competing, x => x.Status == "SUCCEEDED");
        Assert.Single(competing, x => x.Status == "CONFLICTED");

        await Assert.ThrowsAsync<InvalidOperationException>(() => ExecuteAsync(
            Request(user.Id, "rollback-key", "rename:rollback"), async (db, owner, ct) =>
            {
                await RenameAsync(db, owner, project.Id, 2, "Rolled back", ct);
                throw new InvalidOperationException("Injected failure after domain update.");
            }));
        await using var scope = factory.Services.CreateAsyncScope();
        var check = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await check.Projects.SingleAsync(x => x.Id == project.Id);
        Assert.Equal(2, persisted.Version);
        Assert.NotEqual("Rolled back", persisted.Title);
        Assert.False(await check.IdempotencyRecords.AnyAsync(x => x.UserId == user.Id && x.IdempotencyKey == "rollback-key"));
        Assert.Equal(1, await check.DomainEvents.CountAsync(x => x.UserId == user.Id));
        Assert.Equal(1, await check.OutboxMessages.CountAsync(x =>
            check.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == user.Id)));
    }

    [Fact]
    public async Task Final_rejection_is_replayable_without_domain_or_event_changes()
    {
        var (user, project) = await SeedAsync();
        var identity = Request(user.Id, "final-rejection", "rename:rejected");
        var calls = 0;
        async Task<CommandResult> RunAsync() => await ExecuteAsync(identity, async (db, owner, ct) =>
        {
            Interlocked.Increment(ref calls);
            await RenameAsync(db, owner, project.Id, 1, "Should roll back", ct);
            throw new CommandRejectedException();
        });

        var rejected = await RunAsync();
        var replay = await RunAsync();
        Assert.Equal("FAILED_FINAL", rejected.Status);
        Assert.Equal("DOMAIN_RULE_VIOLATION", rejected.ErrorCode);
        Assert.Equal(rejected.Id, replay.Id);
        Assert.Equal(1, calls);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var unchanged = await db.Projects.SingleAsync(x => x.Id == project.Id);
        Assert.Equal(1, unchanged.Version);
        Assert.Equal("Original", unchanged.Title);
        Assert.False(await db.DomainEvents.AnyAsync(x => x.UserId == user.Id));
        Assert.False(await db.OutboxMessages.AnyAsync(x =>
            db.DomainEvents.Any(e => e.EventId == x.EventId && e.UserId == user.Id)));
    }

    [Fact]
    public async Task Api_conflict_and_validation_are_safe_and_liveness_is_independent()
    {
        var (owner, project) = await SeedAsync();
        var (other, _) = await SeedAsync();
        using var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var tokens = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
            client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={tokens.Create(owner)}");
        }
        var stale = await PostAsync(client, $"/api/v1/test-delivery-contract/version/{project.Id}",
            new { expectedVersion = 2 });
        Assert.True(stale.StatusCode == HttpStatusCode.Conflict, await stale.Content.ReadAsStringAsync());
        var problem = await stale.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("CONFLICT_STALE_VERSION", problem.GetProperty("code").GetString());
        Assert.Equal(project.Id.ToString(), problem.GetProperty("entityId").GetString());
        Assert.Equal(1, problem.GetProperty("currentVersion").GetInt64());
        Assert.False(problem.GetProperty("retryable").GetBoolean());
        Assert.True(problem.TryGetProperty("correlationId", out _));

        var invalid = await PostAsync(client, $"/api/v1/test-delivery-contract/version/{project.Id}",
            new { expectedVersion = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.True((await invalid.Content.ReadFromJsonAsync<JsonElement>()).TryGetProperty("errors", out _));

        client.DefaultRequestHeaders.Remove("Cookie");
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var tokens = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
            client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={tokens.Create(other)}");
        }
        var hidden = await PostAsync(client, $"/api/v1/test-delivery-contract/version/{project.Id}",
            new { expectedVersion = 2 });
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.False((await hidden.Content.ReadFromJsonAsync<JsonElement>()).TryGetProperty("currentVersion", out _));
    }

    private async Task<CommandResult> ExecuteAsync(CommandExecutionRequest request,
        Func<AppDbContext, Guid, CancellationToken, Task<CommandMutation>> mutate)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<CommandExecutionService>()
            .ExecuteAsync(request, mutate, TestContext.Current.CancellationToken);
    }

    private static CommandExecutionRequest Request(Guid userId, string key, string body) => new(
        userId, key, "TEST_PROJECT_RENAME",
        CommandExecutionRequest.HashCanonicalRequest(Encoding.UTF8.GetBytes(body)),
        DateTimeOffset.UtcNow.AddHours(1), "test-correlation-id");

    private static async Task<CommandMutation> RenameAsync(AppDbContext db, Guid userId, Guid id,
        long expectedVersion, string title, CancellationToken ct)
    {
        var project = await db.Projects.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (project is null) throw new TidySense.Common.Exceptions.ResourceNotFoundException("Project", id);
        VersionGuard.RequireMatch(id, expectedVersion, project.Version);
        var now = DateTimeOffset.UtcNow;
        var updated = await db.Projects.Where(x => x.Id == id && x.UserId == userId && x.Version == expectedVersion)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Title, title)
                .SetProperty(x => x.Version, expectedVersion + 1)
                .SetProperty(x => x.UpdatedAt, now), ct);
        if (updated == 0)
        {
            var current = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == id && x.UserId == userId, ct);
            throw new VersionConflictException(id, expectedVersion, current.Version);
        }
        return new CommandMutation("Project", id, expectedVersion + 1, "PROJECT_TITLE_CHANGED", 1,
            "{\"changedFields\":[\"title\"]}", now);
    }

    private async Task<(User User, Project Project)> SeedAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, CreatedAt = now
        };
        var project = new Project
        {
            Id = Guid.NewGuid(), UserId = user.Id, Title = "Original",
            ReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            CreatedAt = now, UpdatedAt = now
        };
        db.AddRange(user, project);
        await db.SaveChangesAsync();
        return (user, project);
    }

    private static async Task<HttpResponseMessage> PostAsync(HttpClient client, string path, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        return await client.SendAsync(request);
    }
}
