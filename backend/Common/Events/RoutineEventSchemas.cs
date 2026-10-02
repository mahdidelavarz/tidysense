using System.Text.Json;

namespace TidySense.Common.Events;

public static class RoutineEventTypes
{
    public const string RoutineCreated = "ROUTINE_CREATED";
    public const string RoutineContinuationCreated = "ROUTINE_CONTINUATION_CREATED";
    public const string RoutineUpdated = "ROUTINE_UPDATED";
    public const string RoutineRecurrenceChanged = "ROUTINE_RECURRENCE_CHANGED";
    public const string RoutineStopped = "ROUTINE_STOPPED";
    public const string OccurrenceCreated = "ROUTINE_OCCURRENCE_CREATED";
    public const string OccurrenceDone = "ROUTINE_OCCURRENCE_DONE";
    public const string OccurrenceMissed = "ROUTINE_OCCURRENCE_MISSED";
    public const string OccurrenceCorrected = "ROUTINE_OCCURRENCE_CORRECTED";
}

public static class RoutineStopCauses
{
    public const string User = "USER";
    public const string ProjectTerminal = "PROJECT_TERMINAL";
}

public static class RoutineEventSchemas
{
    private static readonly HashSet<string> Sources = new(StringComparer.Ordinal)
        { "MANUAL", "AI_ASSISTED", "SYSTEM_MIGRATED" };
    private static readonly HashSet<string> Scopes = new(StringComparer.Ordinal)
        { "GOAL", "PROJECT", "STANDALONE" };
    private static readonly HashSet<string> RecurrenceTypes = new(StringComparer.Ordinal)
        { "DAILY", "SPECIFIC_WEEKDAYS", "MONTHLY_ON_DAY" };
    private static readonly HashSet<string> StopCauses = new(StringComparer.Ordinal)
        { RoutineStopCauses.User, RoutineStopCauses.ProjectTerminal };
    private static readonly HashSet<string> ResolvedStatuses = new(StringComparer.Ordinal)
        { "DONE", "MISSED" };
    private static readonly HashSet<string> MetadataFields = new(StringComparer.Ordinal)
        { "title", "description", "goalId", "projectId" };
    private static readonly HashSet<string> ScheduleFields = new(StringComparer.Ordinal)
        { "title", "description", "goalId", "projectId", "recurrence", "timesOfDay" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return Created(RoutineEventTypes.RoutineCreated);
        yield return Created(RoutineEventTypes.RoutineContinuationCreated);
        yield return new EventPayloadSchema(RoutineEventTypes.RoutineUpdated, 1,
            ChangedFields(MetadataFields));
        yield return new EventPayloadSchema(RoutineEventTypes.RoutineRecurrenceChanged, 1,
            ChangedFields(ScheduleFields),
            new EventPayloadFieldPolicy("recurrenceType", true, value => Allowed(value, RecurrenceTypes)),
            new EventPayloadFieldPolicy("slotCount", true, IsSlotCount));
        yield return new EventPayloadSchema(RoutineEventTypes.RoutineStopped, 1,
            new EventPayloadFieldPolicy("cause", true, value => Allowed(value, StopCauses)));
        yield return new EventPayloadSchema(RoutineEventTypes.OccurrenceCreated, 1,
            new EventPayloadFieldPolicy("timed", true, IsBoolean));
        yield return new EventPayloadSchema(RoutineEventTypes.OccurrenceDone, 1);
        yield return new EventPayloadSchema(RoutineEventTypes.OccurrenceMissed, 1);
        yield return new EventPayloadSchema(RoutineEventTypes.OccurrenceCorrected, 1,
            new EventPayloadFieldPolicy("previousStatus", true, value => Allowed(value, ResolvedStatuses)),
            new EventPayloadFieldPolicy("newStatus", true, value => Allowed(value, ResolvedStatuses)));
    }

    private static EventPayloadSchema Created(string type) => new(type, 1,
        new EventPayloadFieldPolicy("source", true, value => Allowed(value, Sources)),
        new EventPayloadFieldPolicy("parentScope", true, value => Allowed(value, Scopes)),
        new EventPayloadFieldPolicy("recurrenceType", true, value => Allowed(value, RecurrenceTypes)),
        new EventPayloadFieldPolicy("slotCount", true, IsSlotCount));

    private static EventPayloadFieldPolicy ChangedFields(HashSet<string> allowed) =>
        new("changedFields", true, value =>
        {
            if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() == 0) return false;
            var seen = new HashSet<string>(StringComparer.Ordinal);
            return value.EnumerateArray().All(item => item.ValueKind == JsonValueKind.String &&
                item.GetString() is { } field && allowed.Contains(field) && seen.Add(field));
        });

    private static bool Allowed(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);

    private static bool IsBoolean(JsonElement value) =>
        value.ValueKind is JsonValueKind.True or JsonValueKind.False;

    private static bool IsSlotCount(JsonElement value) =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var count) && count is >= 0 and <= 24;
}
