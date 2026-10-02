using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.Models;

namespace TidySense.Services;

internal static class ParentCommandSupport
{
    public static CommandExecutionRequest Command(Guid userId, string idempotencyKey,
        string commandType, object request, DateTimeOffset now) => new(
        userId,
        RequireIdempotencyKey(idempotencyKey),
        commandType,
        CommandExecutionRequest.HashCanonicalRequest(JsonSerializer.SerializeToUtf8Bytes(request)),
        now.AddHours(24),
        Guid.NewGuid().ToString("N"));

    public static void RequireSuccess(CommandResult result)
    {
        if (result.Status == "SUCCEEDED") return;
        if (result.Status == "CONFLICTED" && result.ErrorCode == "CONFLICT_STALE_VERSION" &&
            result.AggregateId is { } id && result.ExpectedVersion is { } expected &&
            result.AggregateVersion is { } current)
            throw new VersionConflictException(id, expected, current);
        if (result.Status == "CONFLICTED")
            throw new CommandConflictException(result.ErrorCode ?? "COMMAND_CONFLICT",
                "The command context changed. Refresh the preview.");
        throw new DomainRuleException(result.ErrorCode ?? "DOMAIN_RULE_VIOLATION",
            "The command is not valid for the current resource state.");
    }

    public static string RequiredText(string value, int maxLength, string field)
    {
        var normalized = value.Trim();
        if (normalized.Length is 0 || normalized.Length > maxLength)
            throw new ArgumentException($"{field} is invalid.");
        return normalized;
    }

    public static string? OptionalText(string? value, int maxLength, string field)
    {
        if (value is null) return null;
        var normalized = value.Trim();
        if (normalized.Length > maxLength) throw new ArgumentException($"{field} is invalid.");
        return normalized.Length == 0 ? null : normalized;
    }

    public static string PreviewHash(Guid id, string entityType, string currentStatus,
        string targetStatus, long version, IReadOnlyList<TerminalBlockerDto> blockers,
        IReadOnlyList<TerminalCascadeDto> cascades)
    {
        var canonical = new
        {
            entityId = id,
            entityType,
            currentStatus,
            targetStatus,
            expectedVersion = version,
            blockers = blockers.OrderBy(x => x.ResourceType, StringComparer.Ordinal)
                .ThenBy(x => x.ResourceId)
                .Select(x => new { x.ResourceType, x.ResourceId, x.Status, x.Version }),
            cascades = cascades.OrderBy(x => x.ResourceType, StringComparer.Ordinal)
                .ThenBy(x => x.ResourceId)
                .Select(x => new { x.ResourceType, x.ResourceId, x.ResultingStatus, x.Version })
        };
        return CommandExecutionRequest.HashCanonicalRequest(JsonSerializer.SerializeToUtf8Bytes(canonical));
    }

    public static string ParentScope(Guid? goalId, Guid? projectId) =>
        projectId is not null ? "PROJECT" : goalId is not null ? "GOAL" : "STANDALONE";

    /// <summary>
    /// Locks every Goal and Project a child command touches, Goals before Projects and each in
    /// ascending id order, and requires the requested parent to still be active.
    /// </summary>
    public static async Task LockParentsAsync(AppDbContext context, Guid owner,
        IEnumerable<(Guid? GoalId, Guid? ProjectId)> scopes, Guid? requestedGoalId,
        Guid? requestedProjectId, CancellationToken cancellationToken)
    {
        var scopeList = scopes.Distinct().ToArray();
        var projectIds = scopeList.Select(x => x.ProjectId).OfType<Guid>().Distinct().Order().ToArray();
        var projects = projectIds.Length == 0
            ? []
            : await context.Projects.AsNoTracking()
                .Where(x => x.UserId == owner && projectIds.Contains(x.Id))
                .ToListAsync(cancellationToken);
        if (projects.Count != projectIds.Length)
            throw new ResourceNotFoundException("Project", projectIds.First(x => projects.All(p => p.Id != x)));
        var goalIds = scopeList.Select(x => x.GoalId).OfType<Guid>()
            .Concat(projects.Select(x => x.GoalId).OfType<Guid>()).Distinct().Order().ToArray();
        var lockedGoals = new Dictionary<Guid, Goal>();
        foreach (var goalId in goalIds)
            lockedGoals[goalId] = await GoalService.LockOwnedAsync(context, goalId, owner, cancellationToken);
        var lockedProjects = new Dictionary<Guid, Project>();
        foreach (var projectId in projectIds)
            lockedProjects[projectId] = await ProjectService.LockOwnedAsync(context, projectId, owner, cancellationToken);
        if (requestedGoalId is { } requestedGoal && lockedGoals[requestedGoal].Status != ParentStatuses.Active)
            throw new CommandRejectedException("PARENT_NOT_ACTIVE");
        if (requestedProjectId is { } requestedProject &&
            lockedProjects[requestedProject].Status != ParentStatuses.Active)
            throw new CommandRejectedException("PARENT_NOT_ACTIVE");
    }

    public static string EncodeCursor(DateTimeOffset createdAt, Guid id) =>
        WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes($"{createdAt.UtcTicks}|{id:N}"));

    public static (DateTimeOffset CreatedAt, Guid Id)? DecodeCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return null;
        try
        {
            var parts = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(cursor)).Split('|');
            if (parts.Length != 2 || !long.TryParse(parts[0], out var ticks) ||
                !Guid.TryParseExact(parts[1], "N", out var id)) throw new FormatException();
            return (new DateTimeOffset(ticks, TimeSpan.Zero), id);
        }
        catch (Exception exception) when (exception is FormatException or ArgumentException)
        {
            throw new ArgumentException("cursor is invalid.");
        }
    }

    private static string RequireIdempotencyKey(string value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length is 0 or > 128 ||
            !normalized.All(x => char.IsAsciiLetterOrDigit(x) || x is '-' or '_'))
            throw new ArgumentException("Idempotency-Key is invalid.");
        return normalized;
    }
}
