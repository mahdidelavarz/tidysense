using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Events;
using TidySense.Data;

namespace TidySense.Services;

/// <summary>
/// What a Task's event history says about it. Carry count and review acknowledgement are
/// derived here and never stored on the Task.
/// </summary>
internal sealed record TaskSignals(
    int CarryCount,
    DateTimeOffset? LastKeptAt,
    bool KeptSinceLastCarry,
    bool IndividuallyRescheduled)
{
    public static readonly TaskSignals None = new(0, null, false, false);
}

internal static class TaskHistory
{
    private static readonly string[] EventTypes =
        [TaskEventTypes.TaskCarried, TaskEventTypes.TaskReviewKept, TaskEventTypes.TaskUpdated];

    public static async Task<IReadOnlyDictionary<Guid, TaskSignals>> LoadAsync(AppDbContext db,
        Guid userId, IReadOnlyCollection<Guid> taskIds, CancellationToken cancellationToken)
    {
        if (taskIds.Count == 0) return new Dictionary<Guid, TaskSignals>();
        var events = await db.DomainEvents.AsNoTracking()
            .Where(x => x.UserId == userId && x.AggregateType == "Task" &&
                taskIds.Contains(x.AggregateId) && EventTypes.Contains(x.EventType))
            .Select(x => new { x.AggregateId, x.EventType, x.OccurredAt, x.RecordedAt, x.PayloadJson })
            .ToListAsync(cancellationToken);
        return events.GroupBy(x => x.AggregateId).ToDictionary(group => group.Key, group =>
        {
            var carryCount = 0;
            // Order of a Carry and a Keep is taken from when each was recorded.
            DateTimeOffset? lastCarryRecorded = null, lastKeepRecorded = null, lastKeptAt = null;
            var rescheduled = false;
            foreach (var item in group)
            {
                using var payload = JsonDocument.Parse(item.PayloadJson);
                var root = payload.RootElement;
                switch (item.EventType)
                {
                    case TaskEventTypes.TaskCarried:
                        if (root.GetProperty("wasDue").GetBoolean()) carryCount++;
                        if (root.GetProperty("scope").GetString() == TaskCarryScopes.Task) rescheduled = true;
                        if (lastCarryRecorded is null || item.RecordedAt > lastCarryRecorded)
                            lastCarryRecorded = item.RecordedAt;
                        break;
                    case TaskEventTypes.TaskReviewKept:
                        if (lastKeepRecorded is null || item.RecordedAt > lastKeepRecorded)
                        {
                            lastKeepRecorded = item.RecordedAt;
                            lastKeptAt = item.OccurredAt;
                        }
                        break;
                    default:
                        if (root.GetProperty("changedFields").EnumerateArray()
                            .Any(field => field.GetString() == "plannedDate")) rescheduled = true;
                        break;
                }
            }
            return new TaskSignals(carryCount, lastKeptAt,
                lastKeepRecorded is not null && (lastCarryRecorded is null || lastKeepRecorded > lastCarryRecorded),
                rescheduled);
        });
    }
}
