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
    public const string ClarificationAsked = "PLANNING_CLARIFICATION_ASKED";
    public const string ClarificationAnswered = "PLANNING_CLARIFICATION_ANSWERED";
    public const string WindowOpened = "PLANNING_WINDOW_OPENED";
    public const string ContinuationDecided = "PLANNING_CONTINUATION_DECIDED";
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
    private static readonly HashSet<string> Decisions = new(StringComparer.Ordinal)
        { "CONTINUE_AS_IS", "ADJUST", "PAUSE_OR_STOP", "REPLANNED" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return new EventPayloadSchema(PlanningEventTypes.DraftCreated, 1,
            new EventPayloadFieldPolicy("generator", true, IsShortText),
            new EventPayloadFieldPolicy("contextScope", true, value => Allowed(value, ContextScopes)),
            Count("proposalCount"), Count("factCount"));
        // Version 2 (STEP-18) adds the flow and how many clarification turns came before the draft.
        yield return new EventPayloadSchema(PlanningEventTypes.DraftCreated, 2,
            new EventPayloadFieldPolicy("generator", true, IsShortText),
            new EventPayloadFieldPolicy("contextScope", true, value => Allowed(value, ContextScopes)),
            Count("proposalCount"), Count("factCount"), Id("flowId"), Count("clarificationTurns"));
        // Clarification measurement (027 §5, 028 §2.5): kinds, option counts and chosen positions only.
        yield return new EventPayloadSchema(PlanningEventTypes.ClarificationAsked, 1,
            Id("flowId"), Turn(),
            new EventPayloadFieldPolicy("questions", true, value => Items(value, item =>
                Only(item, "kind", "optionCount", "multiple") && IsKind(item.GetProperty("kind")) &&
                item.GetProperty("optionCount").ValueKind == JsonValueKind.Number &&
                item.GetProperty("optionCount").TryGetInt32(out var count) && count is >= 0 and <= 7 &&
                IsBoolean(item.GetProperty("multiple")))));
        yield return new EventPayloadSchema(PlanningEventTypes.ClarificationAnswered, 1,
            Id("flowId"), Turn(),
            new EventPayloadFieldPolicy("draftNow", true, IsBoolean),
            new EventPayloadFieldPolicy("answers", true, value => Items(value, item =>
                Only(item, "kind", "chosen", "other") && IsKind(item.GetProperty("kind")) &&
                item.GetProperty("chosen") is { ValueKind: JsonValueKind.Array } chosen && chosen.GetArrayLength() <= 7 &&
                chosen.EnumerateArray().All(x => x.ValueKind == JsonValueKind.Number && x.TryGetInt32(out var i) && i is >= 0 and < 7) &&
                IsBoolean(item.GetProperty("other")))));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftRevised, 1,
            Count("revision"), Count("includedCount"), Count("excludedCount"));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftCancelled, 1,
            new EventPayloadFieldPolicy("reason", true, value => Allowed(value, EndReasons)));
        yield return new EventPayloadSchema(PlanningEventTypes.DraftApplied, 1,
            Count("goalCount"), Count("projectCount"), Count("taskCount"), Count("routineCount"),
            Count("factCount"));
        // Version 2 (STEP-14) adds what the user removed before accepting, by entity type (027 §5).
        yield return new EventPayloadSchema(PlanningEventTypes.DraftApplied, 2,
            Count("goalCount"), Count("projectCount"), Count("taskCount"), Count("routineCount"),
            Count("factCount"), Count("excludedGoalCount"), Count("excludedProjectCount"),
            Count("excludedTaskCount"), Count("excludedRoutineCount"));
        // Version 3 (029 §3 follow-up) adds the existing Tasks the approval only dated; taskCount stays new Tasks.
        yield return new EventPayloadSchema(PlanningEventTypes.DraftApplied, 3,
            Count("goalCount"), Count("projectCount"), Count("taskCount"), Count("routineCount"),
            Count("factCount"), Count("excludedGoalCount"), Count("excludedProjectCount"),
            Count("excludedTaskCount"), Count("excludedRoutineCount"), Count("datedTaskCount"));
        yield return new EventPayloadSchema(PlanningEventTypes.FactCreated, 1,
            new EventPayloadFieldPolicy("factType", true, value => Allowed(value, FactTypes)),
            new EventPayloadFieldPolicy("strength", true, value => Allowed(value, Strengths)),
            new EventPayloadFieldPolicy("source", true, value => Allowed(value, FactSources)),
            new EventPayloadFieldPolicy("scope", true, value => Allowed(value, FactScopes)));
        yield return new EventPayloadSchema(PlanningEventTypes.FactRemoved, 1,
            new EventPayloadFieldPolicy("factType", true, value => Allowed(value, FactTypes)));
        // A planned week (029 §3): its scope kind and number, and what was decided about the next one.
        yield return new EventPayloadSchema(PlanningEventTypes.WindowOpened, 1,
            new EventPayloadFieldPolicy("scope", true, value => Allowed(value, FactScopes)), Count("week"));
        yield return new EventPayloadSchema(PlanningEventTypes.ContinuationDecided, 1,
            new EventPayloadFieldPolicy("decision", true, value => Allowed(value, Decisions)), Count("week"),
            Count("daysAfterEnd"));
    }

    private static readonly HashSet<string> QuestionKinds = new(StringComparer.Ordinal)
    {
        "TIMING", "RECURRENCE", "CONSTRAINT", "CONTENT", "OWNERSHIP", "ENTITY_TYPE", "CONTRADICTION",
        // A question stored before kinds existed.
        "UNKNOWN"
    };

    private static EventPayloadFieldPolicy Id(string name) => new(name, true, value =>
        value.ValueKind == JsonValueKind.String && Guid.TryParse(value.GetString(), out var id) && id != Guid.Empty);

    private static EventPayloadFieldPolicy Turn() => new("turn", true, value =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var turn) && turn is >= 1 and <= 3);

    /// <summary>One object per question, up to the questions one turn may ask (029 §7), each passing the item rule.</summary>
    private static bool Items(JsonElement value, Func<JsonElement, bool> item) =>
        value.ValueKind == JsonValueKind.Array &&
        value.GetArrayLength() >= 1 && value.GetArrayLength() <= Services.PlanningClarificationRules.MaxQuestions &&
        value.EnumerateArray().All(x => x.ValueKind == JsonValueKind.Object && item(x));

    private static bool Only(JsonElement item, params string[] names) =>
        item.EnumerateObject().Select(x => x.Name).Order(StringComparer.Ordinal)
            .SequenceEqual(names.Order(StringComparer.Ordinal), StringComparer.Ordinal);

    private static bool IsKind(JsonElement value) => Allowed(value, QuestionKinds);

    private static bool IsBoolean(JsonElement value) => value.ValueKind is JsonValueKind.True or JsonValueKind.False;

    private static EventPayloadFieldPolicy Count(string name) => new(name, true, value =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var count) && count >= 0);

    private static bool IsShortText(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 and <= 64 };

    private static bool Allowed(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);
}
