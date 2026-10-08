using System.Text.Json;
using System.Text.Json.Nodes;

namespace TidySense.Services.Ai;

public sealed record ReconcileGateResult(
    ReconcileExplanationContent? Content,
    string? Gate,
    string? FailureClass,
    IReadOnlyList<string> RepairRules)
{
    public bool Passed => FailureClass is null;
}

/// <summary>
/// The only way model text becomes a Reconcile explanation. The whole output passes every gate or
/// is rejected. A recommendation may only point at decisions it was shown, name a rule that
/// matched every one of them and an action the deterministic rules already allow for every one
/// of them; it cannot add a fact, a number, a date or an action. It reads nothing but its arguments.
/// </summary>
public static class ReconcileExplanationGate
{
    public const string SchemaVersion = "2026-10-08.1";
    public const string RepairPolicyVersion = "2026-10-08.1";
    public const int MaxOutputChars = 8_000;
    public const int MaxSummaryChars = 400;
    public const int MaxExplanationChars = 300;
    public const int MaxRecommendations = 5;
    public const int MaxUnitsPerRecommendation = 20;

    private static readonly string[] RuleIds = ["R1", "R2", "R3", "R6"];
    private static readonly string[] Actions =
        [.. ReconcileExplanationContextBuilder.TaskActions, .. ReconcileExplanationContextBuilder.SequenceActions];

    public static ReconcileGateResult Evaluate(string? text, string? finishReason, ReconcileExplanationContext context)
    {
        var rules = new List<string>();
        if (finishReason != "stop" || string.IsNullOrWhiteSpace(text) || text.Length > MaxOutputChars)
            return Rejected(PlanningOutputGate.GateTransport, AiFailureClasses.Incomplete);
        if (AiOutputText.ParseObject(text, rules) is not { } root)
            return Rejected(PlanningOutputGate.GateParse, AiFailureClasses.Parse);
        if (Read(root, rules) is not { } content)
            return Rejected(PlanningOutputGate.GateSchema, AiFailureClasses.Schema);
        return Validate(content, context) is { } failure
            ? Rejected(failure.Gate, failure.FailureClass)
            : new ReconcileGateResult(content, null, null, rules);

        ReconcileGateResult Rejected(string gate, string failureClass) => new(null, gate, failureClass, rules);
    }

    /// <summary>Policy and semantic rules of an explanation, whoever produced it. Null when it is usable.</summary>
    public static (string Gate, string FailureClass)? Validate(ReconcileExplanationContent content,
        ReconcileExplanationContext context)
    {
        if (!IsAllowedText(content.Summary, MaxSummaryChars) ||
            content.Recommendations.Any(x => !IsAllowedText(x.Explanation, MaxExplanationChars)))
            return (PlanningOutputGate.GatePolicy, AiFailureClasses.Policy);

        var groupOf = context.Groups.SelectMany(g => g.Units.Select(u => (Unit: u, Group: g.Ref)))
            .ToDictionary(x => x.Unit.Ref, StringComparer.Ordinal);
        var used = new HashSet<string>(StringComparer.Ordinal);
        if (content.Recommendations.Count > MaxRecommendations) return Semantic();
        foreach (var recommendation in content.Recommendations)
        {
            var refs = recommendation.UnitRefs;
            if (refs.Count is 0 or > MaxUnitsPerRecommendation || refs.Any(x => !groupOf.ContainsKey(x)) ||
                refs.Any(x => !used.Add(x))) return Semantic();
            var units = refs.Select(x => groupOf[x]).ToArray();
            var kind = units[0].Unit.Kind;
            if (units.Any(x => x.Group != units[0].Group || x.Unit.Kind != kind) ||
                (kind == ReconcileUnitKinds.Sequence && units.Length != 1)) return Semantic();
            // No authority is added: the rule matched and the action is already allowed for every unit.
            if (units.Any(x => !x.Unit.RuleIds.Contains(recommendation.RuleId) ||
                    !x.Unit.AllowedActions.Contains(recommendation.ActionType))) return Semantic();
        }
        return null;

        static (string, string) Semantic() => (PlanningOutputGate.GateSemantic, AiFailureClasses.Semantic);
    }

    /// <summary>
    /// Plain text only. Digits and percent signs are refused: every number the user sees comes
    /// from the deterministic facts beside the explanation, never from the model.
    /// </summary>
    public static bool IsAllowedText(string? text, int maxChars) =>
        !string.IsNullOrWhiteSpace(text) && text.Length <= maxChars &&
        !text.Any(x => char.IsDigit(x) || char.IsControl(x) || x is '%' or '٪' or '‰' or '<' or '>') &&
        !text.Contains("http", StringComparison.OrdinalIgnoreCase);

    private static ReconcileExplanationContent? Read(JsonObject root, List<string> rules)
    {
        if (!Only(root, "summary", "recommendations") || Text(root, "summary") is not { } summary) return null;
        var recommendations = new List<ReconcileRecommendationContent>();
        if (root["recommendations"] is { } node)
        {
            if (node is not JsonArray items) return null;
            foreach (var item in items)
            {
                if (item is not JsonObject value || !Only(value, "unitRefs", "ruleId", "actionType", "explanation") ||
                    value["unitRefs"] is not JsonArray refs ||
                    refs.Any(x => x?.GetValueKind() != JsonValueKind.String) ||
                    Known(Text(value, "ruleId"), RuleIds, rules) is not { } ruleId ||
                    Known(Text(value, "actionType"), Actions, rules) is not { } actionType ||
                    Text(value, "explanation") is not { } explanation) return null;
                recommendations.Add(new ReconcileRecommendationContent(
                    refs.Select(x => x!.GetValue<string>()).ToArray(), ruleId, actionType, explanation.Trim()));
            }
        }
        return new ReconcileExplanationContent(summary.Trim(), recommendations);
    }

    private static bool Only(JsonObject value, params string[] allowed) =>
        value.All(x => allowed.Contains(x.Key, StringComparer.Ordinal));

    private static string? Text(JsonObject value, string name) =>
        value[name] is { } node && node.GetValueKind() == JsonValueKind.String ? node.GetValue<string>() : null;

    /// <summary>A known value in any letter case becomes its canonical spelling. Anything else is rejected.</summary>
    private static string? Known(string? text, string[] known, List<string> rules)
    {
        if (text is null) return null;
        foreach (var candidate in known)
        {
            if (string.Equals(candidate, text, StringComparison.Ordinal)) return candidate;
            if (!string.Equals(candidate, text, StringComparison.OrdinalIgnoreCase)) continue;
            rules.Add(PlanningOutputGate.NormalizeEnumCase);
            return candidate;
        }
        return null;
    }
}
