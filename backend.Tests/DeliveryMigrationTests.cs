using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Backend.Tests;

public sealed class DeliveryMigrationTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    [Fact]
    public async Task Step3_migration_can_roll_back_to_step2_and_upgrade_without_losing_existing_users()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989120005555", IsActive = true,
            SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260921120000_CompleteAuthentication", cancellationToken);
        Assert.Equal(1, await db.Users.AsNoTracking().CountAsync(x => x.Id == user.Id, cancellationToken));
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        Assert.Equal(1, await db.Users.AsNoTracking().CountAsync(x => x.Id == user.Id, cancellationToken));
        Assert.Equal(0, await db.IdempotencyRecords.CountAsync(cancellationToken));
        Assert.Equal(0, await db.CommandResults.CountAsync(cancellationToken));
        Assert.Equal(0, await db.DomainEvents.CountAsync(cancellationToken));
        Assert.Equal(0, await db.OutboxMessages.CountAsync(cancellationToken));
    }

    [Fact]
    public async Task Event_contract_migration_rolls_back_after_R4_cleanup_and_reapplies()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        var idempotency = new IdempotencyRecord
        {
            Id = Guid.NewGuid(), UserId = user.Id, IdempotencyKey = "migration-retention",
            CommandType = "TEST_PROJECT_RENAME", RequestHash = new string('0', 64),
            Status = "SUCCEEDED", CreatedAt = now, CompletedAt = now, ExpiresAt = now.AddHours(1)
        };
        var result = new CommandResult
        {
            Id = Guid.NewGuid(), UserId = user.Id, IdempotencyRecordId = idempotency.Id,
            CommandType = idempotency.CommandType, Status = "SUCCEEDED", CreatedAt = now
        };
        idempotency.ResultId = result.Id;
        db.AddRange(user, idempotency, result);
        await db.SaveChangesAsync(cancellationToken);
        Assert.Equal(1, await db.IdempotencyRecords.Where(x => x.Id == idempotency.Id)
            .ExecuteDeleteAsync(cancellationToken));

        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260921123236_Step3DeliveryContracts", cancellationToken);
        Assert.Equal(1, await db.IdempotencyRecords.AsNoTracking()
            .CountAsync(x => x.Id == idempotency.Id, cancellationToken));
        var legacyEventId = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "DomainEvents"
                ("EventId", "EventType", "EventVersion", "OccurredAt", "RecordedAt", "UserId",
                 "Actor", "AggregateType", "AggregateId", "AggregateVersion", "TransactionId",
                 "CorrelationId", "CommandId", "PayloadJson", "RetentionClass")
            VALUES ({legacyEventId}, {"LEGACY_TEST_EVENT"}, {1}, {now}, {now}, {user.Id}, {"USER"},
                    {"Project"}, {Guid.NewGuid()}, {1L}, {Guid.NewGuid()}, {"legacy-link"},
                    {Guid.NewGuid()}, {"{}"}::jsonb, {"R1"})
            """, cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        Assert.Null((await db.DomainEvents.AsNoTracking()
            .SingleAsync(x => x.EventId == legacyEventId, cancellationToken)).CommandResultId);
        Assert.Equal(1, await db.IdempotencyRecords.Where(x => x.Id == idempotency.Id)
            .ExecuteDeleteAsync(cancellationToken));
        Assert.Equal(1, await db.CommandResults.AsNoTracking()
            .CountAsync(x => x.Id == result.Id, cancellationToken));
    }
}
