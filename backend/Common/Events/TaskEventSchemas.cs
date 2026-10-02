using System.Text.Json;

namespace TidySense.Common.Events;

public static class TaskEventTypes
{
    public const string TaskCreated = "TASK_CREATED";
    public const string TaskUpdated = "TASK_UPDATED";
    public const string TaskCompleted = "TASK_COMPLETED";
    public const string TaskDropped = "TASK_DROPPED";
    public const string TaskRestored = "TASK_RESTORED";
    public const string TaskCarried = "TASK_CARRIED";
    public const string TaskReviewKept = "TASK_REVIEW_KEPT";
}

public static class TaskCarryScopes
{
    public const string Task = "TASK";
    public const string Sequence = "SEQUENCE";
    public const string Bulk = "BULK";
}

public static class TaskEventSchemas
{
    private static readonly HashSet<string> Sources = new(StringComparer.Ordinal)
        { "MANUAL", "AI_ASSISTED", "SYSTEM_MIGRATED" };
    private static readonly HashSet<string> Scopes = new(StringComparer.Ordinal)
        { "GOAL", "PROJECT", "STANDALONE" };
    private static readonly HashSet<string> ChangedFields = new(StringComparer.Ordinal)
    {
        "title", "description", "goalId", "projectId", "plannedDate", "deadline",
        "sequenceId", "sequenceOrder", "isProtected"
    };
    private static readonly HashSet<string> CarryScopes = new(StringComparer.Ordinal)
        { TaskCarryScopes.Task, TaskCarryScopes.Sequence, TaskCarryScopes.Bulk };
    private static readonly HashSet<string> ReasonCodes = new(StringComparer.Ordinal)
        { "EXECUTION_OVERDUE", "REPEATED_CARRY", "DEADLINE_RISK" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return new EventPayloadSchema(TaskEventTypes.TaskCreated, 1,
            new EventPayloadFieldPolicy("source", true, value => Allowed(value, Sources)),
            new EventPayloadFieldPolicy("parentScope", true, value => Allowed(value, Scopes)),
            new EventPayloadFieldPolicy("hasPlannedDate", true, IsBoolean),
            new EventPayloadFieldPolicy("inSequence", true, IsBoolean));
        yield return new EventPayloadSchema(TaskEventTypes.TaskUpdated, 1,
            new EventPayloadFieldPolicy("changedFields", true, value => UniqueAllowed(value, ChangedFields)));
        // wasDue records whether the Task was due when it moved; only those Carries count as evidence.
        yield return new EventPayloadSchema(TaskEventTypes.TaskCarried, 1,
            new EventPayloadFieldPolicy("scope", true, value => Allowed(value, CarryScopes)),
            new EventPayloadFieldPolicy("wasDue", true, IsBoolean));
        yield return new EventPayloadSchema(TaskEventTypes.TaskReviewKept, 1,
            new EventPayloadFieldPolicy("reasonCodes", true, value => UniqueAllowed(value, ReasonCodes)));
        yield return new EventPayloadSchema(TaskEventTypes.TaskCompleted, 1);
        yield return new EventPayloadSchema(TaskEventTypes.TaskDropped, 1);
        yield return new EventPayloadSchema(TaskEventTypes.TaskRestored, 1,
            new EventPayloadFieldPolicy("parentScope", true, value => Allowed(value, Scopes)),
            new EventPayloadFieldPolicy("hasPlannedDate", true, IsBoolean));
    }

    private static bool UniqueAllowed(JsonElement value, HashSet<string> allowed)
    {
        if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() == 0) return false;
        var seen = new HashSet<string>(StringComparer.Ordinal);
        return value.EnumerateArray().All(item => item.ValueKind == JsonValueKind.String &&
            item.GetString() is { } field && allowed.Contains(field) && seen.Add(field));
    }

    private static bool Allowed(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);

    private static bool IsBoolean(JsonElement value) =>
        value.ValueKind is JsonValueKind.True or JsonValueKind.False;
}
