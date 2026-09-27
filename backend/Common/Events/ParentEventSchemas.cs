using System.Text.Json;

namespace TidySense.Common.Events;

public static class ParentEventTypes
{
    public const string GoalCreated = "GOAL_CREATED";
    public const string GoalUpdated = "GOAL_UPDATED";
    public const string GoalAchieved = "GOAL_ACHIEVED";
    public const string GoalAbandoned = "GOAL_ABANDONED";
    public const string ProjectCreated = "PROJECT_CREATED";
    public const string ProjectUpdated = "PROJECT_UPDATED";
    public const string ProjectCompleted = "PROJECT_COMPLETED";
    public const string ProjectStopped = "PROJECT_STOPPED";
}

public static class ParentEventSchemas
{
    private static readonly HashSet<string> Sources = new(StringComparer.Ordinal)
        { "MANUAL", "AI_ASSISTED", "SYSTEM_MIGRATED" };
    private static readonly HashSet<string> ReviewSources = new(StringComparer.Ordinal)
        { "USER", "SYSTEM_DEFAULT", "MIGRATED_DEFAULT" };
    private static readonly HashSet<string> Scopes = new(StringComparer.Ordinal)
        { "GOAL", "STANDALONE" };
    private static readonly HashSet<string> GoalFields = new(StringComparer.Ordinal)
        { "title", "desiredOutcome", "targetDate", "reviewDate" };
    private static readonly HashSet<string> ProjectFields = new(StringComparer.Ordinal)
        { "title", "completionMeaning", "goalId", "targetDate", "reviewDate" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return Created(ParentEventTypes.GoalCreated, false);
        yield return Updated(ParentEventTypes.GoalUpdated, GoalFields);
        yield return new EventPayloadSchema(ParentEventTypes.GoalAchieved, 1);
        yield return new EventPayloadSchema(ParentEventTypes.GoalAbandoned, 1);
        yield return Created(ParentEventTypes.ProjectCreated, true);
        yield return Updated(ParentEventTypes.ProjectUpdated, ProjectFields);
        yield return new EventPayloadSchema(ParentEventTypes.ProjectCompleted, 1);
        yield return new EventPayloadSchema(ParentEventTypes.ProjectStopped, 1);
    }

    private static EventPayloadSchema Created(string type, bool includeScope)
    {
        var fields = new List<EventPayloadFieldPolicy>
        {
            new("source", true, x => IsAllowedString(x, Sources)),
            new("reviewDateSource", true, x => IsAllowedString(x, ReviewSources))
        };
        if (includeScope)
            fields.Add(new EventPayloadFieldPolicy("parentScope", true,
                x => IsAllowedString(x, Scopes)));
        return new EventPayloadSchema(type, 1, fields.ToArray());
    }

    private static EventPayloadSchema Updated(string type, HashSet<string> allowed) =>
        new(type, 1, new EventPayloadFieldPolicy("changedFields", true, value =>
        {
            if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() == 0) return false;
            var seen = new HashSet<string>(StringComparer.Ordinal);
            return value.EnumerateArray().All(item => item.ValueKind == JsonValueKind.String &&
                item.GetString() is { } field && allowed.Contains(field) && seen.Add(field));
        }));

    private static bool IsAllowedString(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);
}
