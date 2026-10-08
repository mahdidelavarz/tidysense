using System.Text.Json;

namespace TidySense.Common.Events;

public static class CaptureEventTypes
{
    public const string CaptureCreated = "CAPTURE_CREATED";
    public const string CaptureResolved = "CAPTURE_RESOLVED";
    public const string CaptureDiscarded = "CAPTURE_DISCARDED";
}

public static class ReconcileEventTypes
{
    public const string SessionOpened = "RECONCILE_SESSION_OPENED";
    public const string SessionCompleted = "RECONCILE_SESSION_COMPLETED";
    public const string PromptResolved = "RECONCILE_PROMPT_RESOLVED";
    public const string ActionConfirmed = "RECONCILE_ACTION_CONFIRMED";
    public const string RecommendationPresented = "RECONCILE_RECOMMENDATION_PRESENTED";
    public const string RecommendationAccepted = "RECONCILE_RECOMMENDATION_ACCEPTED";
    public const string RecommendationRejected = "RECONCILE_RECOMMENDATION_REJECTED";
}

public static class ReconcileActionTypes
{
    public const string ReplanTasks = "REPLAN_TASKS";
    public const string DropTasks = "DROP_TASKS";
    public const string KeepTasks = "KEEP_TASKS";
    public const string SequenceCarryAll = "SEQUENCE_CARRY_ALL";
    public const string SequenceDropAll = "SEQUENCE_DROP_ALL";
    public const string DetachDroppedPredecessor = "DETACH_DROPPED_PREDECESSOR";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        ReplanTasks, DropTasks, KeepTasks, SequenceCarryAll, SequenceDropAll, DetachDroppedPredecessor
    };
}

public static class ReconcileEventSchemas
{
    private static readonly HashSet<string> CaptureSources = new(StringComparer.Ordinal)
        { "MANUAL", "SYSTEM_MIGRATED" };
    private static readonly HashSet<string> ResolvedAs = new(StringComparer.Ordinal)
        { "TASK", "ROUTINE" };
    private static readonly HashSet<string> TriggerTypes = new(StringComparer.Ordinal)
        { "MANUAL", "PROMPT" };
    private static readonly HashSet<string> Severities = new(StringComparer.Ordinal)
        { "NONE", "LIGHT", "MEDIUM", "RECOVERY" };
    private static readonly HashSet<string> PromptStates = new(StringComparer.Ordinal)
        { "DISMISSED", "SKIPPED" };

    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return new EventPayloadSchema(CaptureEventTypes.CaptureCreated, 1,
            new EventPayloadFieldPolicy("source", true, value => Allowed(value, CaptureSources)));
        yield return new EventPayloadSchema(CaptureEventTypes.CaptureResolved, 1,
            new EventPayloadFieldPolicy("resolvedAs", true, value => Allowed(value, ResolvedAs)));
        yield return new EventPayloadSchema(CaptureEventTypes.CaptureDiscarded, 1);

        yield return new EventPayloadSchema(ReconcileEventTypes.SessionOpened, 1,
            new EventPayloadFieldPolicy("triggerType", true, value => Allowed(value, TriggerTypes)),
            new EventPayloadFieldPolicy("rulesCatalogVersion", true, IsShortText),
            Severity(), Count("actionableBacklogCount"), Count("reviewDueCount"),
            Count("unresolvedCaptureCount"));
        yield return new EventPayloadSchema(ReconcileEventTypes.SessionCompleted, 1,
            Severity(), Count("actionableBacklogCount"), Count("reviewDueCount"),
            Count("unresolvedCaptureCount"));
        yield return new EventPayloadSchema(ReconcileEventTypes.PromptResolved, 1,
            new EventPayloadFieldPolicy("state", true, value => Allowed(value, PromptStates)),
            Severity());
        yield return new EventPayloadSchema(ReconcileEventTypes.ActionConfirmed, 1,
            new EventPayloadFieldPolicy("actionType", true,
                value => value.ValueKind == JsonValueKind.String &&
                    ReconcileActionTypes.All.Contains(value.GetString()!)),
            Count("affectedCount"));
        // Recommendation events carry classifications only; the rule is in the event's rule columns.
        yield return new EventPayloadSchema(ReconcileEventTypes.RecommendationPresented, 1,
            ActionType(), Count("unitCount"),
            new EventPayloadFieldPolicy("explainer", true, IsExplainerKey));
        yield return new EventPayloadSchema(ReconcileEventTypes.RecommendationAccepted, 1,
            ActionType(),
            new EventPayloadFieldPolicy("edited", true,
                value => value.ValueKind is JsonValueKind.True or JsonValueKind.False));
        yield return new EventPayloadSchema(ReconcileEventTypes.RecommendationRejected, 1, ActionType());
    }

    private static EventPayloadFieldPolicy ActionType() => new("actionType", true,
        value => value.ValueKind == JsonValueKind.String && ReconcileActionTypes.All.Contains(value.GetString()!));

    private static bool IsExplainerKey(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 and <= 64 };

    private static EventPayloadFieldPolicy Severity() =>
        new("severity", true, value => Allowed(value, Severities));

    private static EventPayloadFieldPolicy Count(string name) => new(name, true, value =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var count) && count >= 0);

    private static bool IsShortText(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 and <= 32 };

    private static bool Allowed(JsonElement value, HashSet<string> allowed) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && allowed.Contains(text);
}
