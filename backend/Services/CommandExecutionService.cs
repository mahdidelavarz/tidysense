using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public sealed class CommandExecutionService(
    AppDbContext db,
    EventPayloadValidator eventPayloadValidator,
    ILogger<CommandExecutionService> logger)
{
    public async Task<CommandResult> ExecuteAsync(
        CommandExecutionRequest request,
        Func<AppDbContext, Guid, CancellationToken, Task<CommandMutation>> mutate,
        CancellationToken cancellationToken = default)
    {
        Validate(request);
        var stopwatch = Stopwatch.StartNew();
        var now = DateTimeOffset.UtcNow;
        var recordId = Guid.NewGuid();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var inserted = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "IdempotencyRecords"
                ("Id", "UserId", "IdempotencyKey", "CommandType", "RequestHash", "Status",
                 "CreatedAt", "ExpiresAt", "RetentionClass")
            VALUES ({recordId}, {request.UserId}, {request.IdempotencyKey}, {request.CommandType},
                    {request.RequestHash}, {"IN_PROGRESS"}, {now}, {request.ExpiresAt}, {"R4"})
            ON CONFLICT ("UserId", "IdempotencyKey") DO NOTHING
            """, cancellationToken);

        var record = await LockRecordAsync(request, cancellationToken);
        if (record.CommandType != request.CommandType || record.RequestHash != request.RequestHash)
            throw new IdempotencyMismatchException();
        if (inserted == 0)
        {
            if (record.ResultId is null)
                throw new InvalidOperationException("An idempotency record has no committed result.");
            var replay = await db.CommandResults.AsNoTracking()
                .SingleAsync(x => x.Id == record.ResultId && x.UserId == request.UserId, cancellationToken);
            logger.LogInformation("Command replayed. CommandType: {CommandType}, Outcome: {Outcome}, DurationMs: {DurationMs}, CorrelationId: {CorrelationId}",
                request.CommandType, replay.Status, stopwatch.ElapsedMilliseconds, request.CorrelationId);
            return replay;
        }
        if (request.ExpiresAt <= now)
            throw new ArgumentException("A new command must have a future expiry.");

        await transaction.CreateSavepointAsync("before_mutation", cancellationToken);
        try
        {
            var mutation = await mutate(db, request.UserId, cancellationToken);
            Validate(mutation);
            eventPayloadValidator.Validate(mutation.EventType, mutation.EventVersion, mutation.PayloadJson);
            var result = NewResult(record, "SUCCEEDED", now, mutation.AggregateType,
                mutation.AggregateId, mutation.AggregateVersion, null, null);
            var domainEvent = new DomainEvent
            {
                EventId = Guid.NewGuid(), EventType = mutation.EventType,
                EventVersion = mutation.EventVersion, OccurredAt = mutation.OccurredAt,
                RecordedAt = DateTimeOffset.UtcNow, UserId = request.UserId, Actor = "USER",
                AggregateType = mutation.AggregateType, AggregateId = mutation.AggregateId,
                AggregateVersion = mutation.AggregateVersion, TransactionId = Guid.NewGuid(),
                CorrelationId = request.CorrelationId, CommandResultId = result.Id,
                PayloadJson = mutation.PayloadJson
            };
            db.CommandResults.Add(result);
            db.DomainEvents.Add(domainEvent);
            db.OutboxMessages.Add(new OutboxMessage
            {
                Id = Guid.NewGuid(), EventId = domainEvent.EventId, CreatedAt = DateTimeOffset.UtcNow
            });
            record.Status = "SUCCEEDED";
            record.ResultId = result.Id;
            record.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Command committed. CommandType: {CommandType}, Outcome: {Outcome}, DurationMs: {DurationMs}, CorrelationId: {CorrelationId}",
                request.CommandType, result.Status, stopwatch.ElapsedMilliseconds, request.CorrelationId);
            return result;
        }
        catch (VersionConflictException conflict)
        {
            await transaction.RollbackToSavepointAsync("before_mutation", cancellationToken);
            db.ChangeTracker.Clear();
            record = await LockRecordAsync(request, cancellationToken);
            var result = NewResult(record, "CONFLICTED", DateTimeOffset.UtcNow,
                null, conflict.EntityId, conflict.CurrentVersion,
                conflict.ExpectedVersion, "CONFLICT_STALE_VERSION");
            db.CommandResults.Add(result);
            record.Status = "CONFLICTED";
            record.ResultId = result.Id;
            record.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Command resolved. CommandType: {CommandType}, Outcome: {Outcome}, DurationMs: {DurationMs}, CorrelationId: {CorrelationId}",
                request.CommandType, result.Status, stopwatch.ElapsedMilliseconds, request.CorrelationId);
            return result;
        }
        catch (CommandRejectedException)
        {
            await transaction.RollbackToSavepointAsync("before_mutation", cancellationToken);
            db.ChangeTracker.Clear();
            record = await LockRecordAsync(request, cancellationToken);
            var result = NewResult(record, "FAILED_FINAL", DateTimeOffset.UtcNow,
                null, null, null, null, "DOMAIN_RULE_VIOLATION");
            db.CommandResults.Add(result);
            record.Status = "FAILED_FINAL";
            record.ResultId = result.Id;
            record.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Command resolved. CommandType: {CommandType}, Outcome: {Outcome}, DurationMs: {DurationMs}, CorrelationId: {CorrelationId}",
                request.CommandType, result.Status, stopwatch.ElapsedMilliseconds, request.CorrelationId);
            return result;
        }
    }

    private Task<IdempotencyRecord> LockRecordAsync(CommandExecutionRequest request, CancellationToken cancellationToken) =>
        db.IdempotencyRecords.FromSqlInterpolated($"""
            SELECT * FROM "IdempotencyRecords"
            WHERE "UserId" = {request.UserId} AND "IdempotencyKey" = {request.IdempotencyKey}
            FOR UPDATE
            """).SingleAsync(cancellationToken);

    private static CommandResult NewResult(IdempotencyRecord record, string status, DateTimeOffset now,
        string? aggregateType, Guid? aggregateId, long? aggregateVersion,
        long? expectedVersion, string? errorCode) => new()
    {
        Id = Guid.NewGuid(), UserId = record.UserId, IdempotencyRecordId = record.Id,
        CommandType = record.CommandType, Status = status, AggregateType = aggregateType,
        AggregateId = aggregateId, AggregateVersion = aggregateVersion,
        ExpectedVersion = expectedVersion, ErrorCode = errorCode, CreatedAt = now
    };

    private static void Validate(CommandExecutionRequest request)
    {
        if (request.UserId == Guid.Empty || string.IsNullOrWhiteSpace(request.IdempotencyKey) ||
            request.IdempotencyKey.Length > 128 || string.IsNullOrWhiteSpace(request.CommandType) ||
            request.CommandType.Length > 100 || !request.CommandType.All(IsLogSafe) ||
            request.RequestHash.Length != 64 ||
            !request.RequestHash.All(Uri.IsHexDigit) ||
            string.IsNullOrWhiteSpace(request.CorrelationId) || request.CorrelationId.Length > 128 ||
            !request.CorrelationId.All(IsLogSafe))
            throw new ArgumentException("Invalid command identity.");
    }

    private static void Validate(CommandMutation mutation)
    {
        if (string.IsNullOrWhiteSpace(mutation.AggregateType) || mutation.AggregateType.Length > 100 ||
            mutation.AggregateId == Guid.Empty || mutation.AggregateVersion < 1 ||
            string.IsNullOrWhiteSpace(mutation.EventType) || mutation.EventType.Length > 120 ||
            mutation.EventVersion < 1 ||
            mutation.OccurredAt.Offset != TimeSpan.Zero)
            throw new ArgumentException("Invalid command mutation metadata.");
    }

    private static bool IsLogSafe(char value) =>
        char.IsAsciiLetterOrDigit(value) || value is '-' or '_';
}
