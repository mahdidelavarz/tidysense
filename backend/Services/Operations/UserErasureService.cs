using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services.Operations;

public sealed record UserErasureResult(Guid TombstoneUserId, IReadOnlyDictionary<string, int> Deleted,
    IReadOnlyDictionary<string, int> Tombstoned);

/// <summary>
/// Erases one account (Discussion 019C §22). Everything the user wrote and every record that is
/// not canonical audit is deleted. The R1 events and command results stay as historical facts,
/// with the user id replaced by a tombstone that no remaining record connects to the person.
/// </summary>
public sealed partial class UserErasureService(AppDbContext db, ApplicationDateService dates)
{
    [GeneratedRegex("^[A-Z][A-Z0-9_]{1,63}$")]
    private static partial Regex ReasonPattern();

    /// <summary>Null when no such account exists.</summary>
    public async Task<UserErasureResult?> EraseAsync(Guid userId, string operatorName, string reasonCode,
        CancellationToken cancellationToken)
    {
        operatorName = operatorName.Trim();
        if (operatorName.Length is 0 or > 64) throw new ArgumentException("An operator name of at most 64 characters is required.");
        if (!ReasonPattern().IsMatch(reasonCode))
            throw new ArgumentException("The reason is a code such as USER_REQUEST, not free text.");

        var now = dates.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM \"Users\" WHERE \"Id\" = {userId} FOR UPDATE")
            .AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (user is null) return null;

        var tombstone = Guid.NewGuid();
        var tombstoned = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["domainEvents"] = await db.DomainEvents.Where(x => x.UserId == userId)
                .ExecuteUpdateAsync(x => x.SetProperty(e => e.UserId, tombstone), cancellationToken),
            ["commandResults"] = await db.CommandResults.Where(x => x.UserId == userId)
                .ExecuteUpdateAsync(x => x.SetProperty(r => r.UserId, tombstone), cancellationToken)
        };

        // Children before what they refer to; self-references are cleared first.
        var deleted = new Dictionary<string, int>(StringComparer.Ordinal);
        deleted["actionConfirmations"] = await db.ActionConfirmations.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["aiInvocations"] = await db.AiInvocations.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        // Facts, rule matches, explanations and recommendations go with their session.
        deleted["reconcileSessions"] = await db.ReconcileSessions.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["reconcilePrompts"] = await db.ReconcilePrompts.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["reconcileExposures"] = await db.ReconcileExposures.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["planningFacts"] = await db.PlanningFacts.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["planningDrafts"] = await db.PlanningDrafts.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.PlanningAttempts.Where(x => x.UserId == userId && x.PreviousAttemptId != null)
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.PreviousAttemptId, (Guid?)null)
                .SetProperty(a => a.ClarificationTurn, 0), cancellationToken);
        deleted["planningAttempts"] = await db.PlanningAttempts.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["idempotencyRecords"] = await db.IdempotencyRecords.Where(x => x.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["captures"] = await db.Captures.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        deleted["routineOccurrences"] = await db.RoutineOccurrences.Where(x => x.Routine.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.Routines.Where(x => x.UserId == userId && x.ContinuationOfRoutineId != null)
            .ExecuteUpdateAsync(x => x.SetProperty(r => r.ContinuationOfRoutineId, (Guid?)null), cancellationToken);
        deleted["routines"] = await db.Routines.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        deleted["tasks"] = await db.Tasks.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        deleted["projects"] = await db.Projects.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        deleted["goals"] = await db.Goals.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        deleted["otpChallenges"] = await db.OtpChallenges.Where(x => x.NormalizedPhone == user.PhoneNumber)
            .ExecuteDeleteAsync(cancellationToken);
        deleted["users"] = await db.Users.Where(x => x.Id == userId).ExecuteDeleteAsync(cancellationToken);

        // The record names the tombstone, never the account: it must not undo the erasure.
        db.OperationsRecords.Add(new OperationsRecord
        {
            Id = Guid.NewGuid(), Kind = OperationsRecordKinds.UserErasure, Operator = operatorName,
            ReasonCode = reasonCode, CreatedAt = now, RetentionClass = RetentionCatalog.R1,
            DetailsJson = JsonSerializer.Serialize(new { tombstoneUserId = tombstone, deleted, tombstoned })
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new UserErasureResult(tombstone, deleted, tombstoned);
    }
}

/// <summary>
/// Operator procedures run from the command line instead of serving HTTP:
/// <c>erase-user (--user &lt;id&gt; | --phone &lt;number&gt;) --operator &lt;name&gt; --reason &lt;CODE&gt;</c> and
/// <c>run-maintenance</c>.
/// </summary>
public static class OperationsCommandLine
{
    private const string EraseUser = "erase-user";
    private const string RunMaintenance = "run-maintenance";

    public static bool IsCommand(string[] args) => args.Length > 0 && args[0] is EraseUser or RunMaintenance;

    public static async Task<int> RunAsync(IServiceProvider services, string[] args)
    {
        await using var scope = services.CreateAsyncScope();
        if (args[0] == RunMaintenance)
        {
            var counts = await scope.ServiceProvider.GetRequiredService<OperationsMaintenance>()
                .RunAsync(CancellationToken.None);
            Console.WriteLine(JsonSerializer.Serialize(counts));
            return 0;
        }

        var operatorName = Option(args, "--operator");
        var reason = Option(args, "--reason");
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Guid? userId = Guid.TryParse(Option(args, "--user"), out var id) ? id : null;
        if (userId is null && Option(args, "--phone") is { } phone)
        {
            var normalized = UserService.NormalizeIranianMobile(phone);
            userId = await db.Users.AsNoTracking().Where(x => x.PhoneNumber == normalized)
                .Select(x => (Guid?)x.Id).SingleOrDefaultAsync();
        }
        if (operatorName is null || reason is null || (Option(args, "--user") is null && Option(args, "--phone") is null))
        {
            Console.Error.WriteLine("Usage: erase-user (--user <id> | --phone <number>) --operator <name> --reason <CODE>");
            return 2;
        }
        var result = userId is null
            ? null
            : await scope.ServiceProvider.GetRequiredService<UserErasureService>()
                .EraseAsync(userId.Value, operatorName, reason, CancellationToken.None);
        if (result is null)
        {
            Console.Error.WriteLine("No such account.");
            return 1;
        }
        Console.WriteLine(JsonSerializer.Serialize(result));
        return 0;
    }

    private static string? Option(string[] args, string name)
    {
        var index = Array.IndexOf(args, name);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}
