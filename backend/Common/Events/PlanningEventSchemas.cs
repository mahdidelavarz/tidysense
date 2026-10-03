using System.Text.Json;

namespace TidySense.Common.Events;

public static class PlanningEventTypes
{
    public const string DraftCreated = "PLANNING_DRAFT_CREATED";
    public const string DraftRevised = "PLANNING_DRAFT_REVISED";
    public const string DraftCancelled = "PLANNING_DRAFT_CANCELLED";
    public const string DraftApplied = "PLANNING_DRAFT_APPLIED";
    public const string FactCreated = "PLANNING_FACT_CREATED";
    public const string FactRemoved = "PLANNING_FACT_REMOVED";
}

public static class PlanningDraftEndReasons
{
    public const string User = "USER";
    public const string Superseded = "SUPERSEDED";
}

/// <summary>Planning payloads carry classifications and counts only: never an intention, a title or a fact value.</summary>
public static class PlanningEventSchemas
{
    private static readonly HashSet<string> ContextScopes = new(StringComparer.Ordinal)
        { "NONE", "GOAL", "PROJECT" };
    private static readonly HashSet<string> EndReasons = new(StringComparer.Ordinal)
        { PlanningDraftEndReasons.User, PlanningDraftEndReasons.Superseded };
    private static readonly HashSet<string> FactTypes = new(StringComparer.Ordinal)
    {
        "UNAVAILABLE_WEEKDAY", "UNAVAILABLE_DATE", "UNAVAILABLE_DATE_RANGE", "AVAILABLE_DEVICE",
        "CURRENT_LEVEL", "LEARNING_FOCUS", "EXCLUDED_PATH"
    };
    private static readonly HashSet<string> Strengths = new(StringComparer.Ordinal)
        { "HARD", "SOFT", "INFORMATIONAL" };
    private static readonly HashSet<string> FactSources = new(StringComparer.Ordinal)
        { "USER_EXPLICIT", "USER_CONFIRMED_AI_EXTRACTION" };
    private static readonly HashSet<string> FactScopes = new(StringComparer.Ordinal) { "GOAL", "PROJECT" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return new EventPayloadSchema(PlanningEventTypes.DraftCreated, 1,
            new EventPayloadFieldPolicy("generator", true, IsShortText),
            new EventPayloadFieldPolicy("contextScope", true, value => Allowed(value, ContextScopes)),
            Count("proposalCount"), Count("factCount"));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftRevised, 1,
            Count("revision"), Count("includedCount"), Count("excludedCount"));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftCancelled, 1,
            new EventPayloadFieldPolicy("reason", true, value => Allowed(value, EndReasons)));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftApplied, 1,
            Count("goalCount"), Count("projectCount"), Count("taskCount"), Count("routineCount"),
            Count("factCount"));
        yield return new EventPayloadSchema(PlanningEventTypes.FactCreated, 1,
            new EventPayloadFieldPolicy("factType", true, value => Allowed(value, FactTypes)),
            new EventPayloadFieldPolicy("strength", true, value => Allowed(value, Strengths)),
            new EventPayloadFieldPolicy("source", true, value => Allowed(value, FactSources)),
            new EventPayloadFieldPolicy("scope", true, value => Allowed(value, FactScopes)));
        yield return new EventPayloadSchema(PlanningEventTypes.FactRemoved, 1,
            new EventPayloadFieldPolicy("factType", true, value => Allowed(value, FactTypes)));
    }

    private static EventPayloadFieldPolicy Count(string name) => new(name, true, value =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var count) && count >= 0);

    private static bool IsShortText(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 and <= 64 };

    private static bool Allowed(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);
}
