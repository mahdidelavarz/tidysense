using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace TidySense.Services.Ai;

public sealed record PlanningGateResult(
    string? Outcome,
    PlanningDraftContent? Draft,
    PlanningClarification? Clarification,
    string? Gate,
    string? FailureClass,
    IReadOnlyList<string> RepairRules)
{
    public bool Passed => FailureClass is null;
}

/// <summary>
/// The only way model text becomes a planning result. The whole output passes every gate or is
/// rejected: transport completeness, one allowlisted syntax repair, strict parsing against the
/// pinned schema, policy, and the same structural rules every draft obeys. Nothing is guessed,
/// dropped or reshaped to make an output pass. It reads nothing but its arguments.
/// </summary>
public static partial class PlanningOutputGate
{
    public const string RepairPolicyVersion = "2026-10-03.1";
    public const int MaxOutputChars = 60_000;

    public const string GateTransport = "TRANSPORT";
    public const string GateParse = "PARSE";
    public const string GateSchema = "SCHEMA";
    public const string GatePolicy = "POLICY";
    public const string GateSemantic = "SEMANTIC";

    public const string RemoveBom = AiOutputText.RemoveBom;
    public const string TrimWhitespace = AiOutputText.TrimWhitespace;
    public const string RemoveCodeFence = AiOutputText.RemoveCodeFence;
    public const string NormalizeEnumCase = "NORMALIZE_KNOWN_ENUM_CASE";
    public const string NormalizeDateSeparator = "NORMALIZE_YEAR_FIRST_DATE_SEPARATOR";
    public const string PadDate = "PAD_YEAR_FIRST_MONTH_OR_DAY";

    private static readonly string[] Kinds =
        [PlanningOutcomes.Draft, PlanningOutcomes.Clarification, PlanningOutcomes.InputBlocked];
    private static readonly string[] BlockReasons =
    [
        PlanningBlockReasons.TooVague, PlanningBlockReasons.Contradictory,
        PlanningBlockReasons.UnsupportedRequest, PlanningBlockReasons.MissingConstraint
    ];
    private static readonly string[] EntityTypes =
        [PlanningEntityTypes.Goal, PlanningEntityTypes.Project, PlanningEntityTypes.Task, PlanningEntityTypes.Routine];
    private static readonly string[] Sources = ["EXPLICIT", "INFERRED"];
    private static readonly string[] Confidences = ["HIGH", "MEDIUM", "LOW"];
    private static readonly string[] RecurrenceKinds = ["DAILY", "SPECIFIC_WEEKDAYS", "MONTHLY_ON_DAY"];
    private static readonly string[] FactTypes =
    [
        PlanningFactTypes.UnavailableWeekday, PlanningFactTypes.UnavailableDate,
        PlanningFactTypes.UnavailableDateRange, PlanningFactTypes.AvailableDevice, PlanningFactTypes.CurrentLevel,
        PlanningFactTypes.LearningFocus, PlanningFactTypes.ExcludedPath
    ];
    private static readonly string[] Strengths =
        [PlanningFactStrengths.Hard, PlanningFactStrengths.Soft, PlanningFactStrengths.Informational];
    private static readonly string[] Severities =
        [PlanningSeverities.Info, PlanningSeverities.Important, PlanningSeverities.Blocking];

    [GeneratedRegex(@"^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$")]
    private static partial Regex YearFirstDate();

    [GeneratedRegex("^[A-Z_]{1,32}$")]
    private static partial Regex Token();

    public static PlanningGateResult Evaluate(string? text, string? finishReason, PlanningContext context,
        bool allowClarification)
    {
        var rules = new List<string>();
        try
        {
            // Gate 1: only a complete response is looked at.
            if (finishReason != "stop" || string.IsNullOrWhiteSpace(text) || text.Length > MaxOutputChars)
                throw new GateFailure(GateTransport, AiFailureClasses.Incomplete);

            var root = AiOutputText.ParseObject(text, rules) ?? throw new GateFailure(GateParse, AiFailureClasses.Parse);
            var reader = new Reader(rules);
            reader.Only(root, "kind", "message", "blockReason", "questions", "draft");
            var kind = reader.Enum(root, "kind", Kinds) ?? throw Schema();
            var message = reader.Text(root, "message");
            var questions = reader.Items(root, "questions").Select(node =>
            {
                var item = reader.Object(node);
                reader.Only(item, "id", "text");
                return new PlanningQuestion(reader.Required(item, "id"), reader.Required(item, "text").Trim());
            }).ToArray();
            var blockReason = reader.Enum(root, "blockReason", BlockReasons);
            var draftNode = reader.Node(root, "draft");

            if (kind != PlanningOutcomes.Draft)
            {
                var clarification = new PlanningClarification(questions, blockReason, message?.Trim());
                if (draftNode is not null || !PlanningClarificationRules.IsValid(kind, clarification)) throw Schema();
                // Asking again after the turn budget or after "draft now" is not an acceptable answer.
                if (kind == PlanningOutcomes.Clarification && !allowClarification)
                    throw new GateFailure(GatePolicy, AiFailureClasses.Policy);
                return new PlanningGateResult(kind, null, clarification, null, null, rules);
            }

            if (draftNode is null || questions.Length > 0 || blockReason is not null) throw Schema();
            var parsed = Draft(reader, reader.Object(draftNode), context);
            try
            {
                var draft = PlanningDraftRules.Repair(parsed, context.Today);
                if (PlanningDraftRules.StructuralErrors(draft, context.Scope?.Type).Count > 0)
                    throw new GateFailure(GateSemantic, AiFailureClasses.Semantic);
                return new PlanningGateResult(kind, draft, null, null, null, rules);
            }
            catch (Exception exception) when (exception is NullReferenceException or ArgumentException
                or KeyNotFoundException or InvalidOperationException)
            {
                throw new GateFailure(GateSemantic, AiFailureClasses.Semantic);
            }
        }
        catch (GateFailure failure)
        {
            return new PlanningGateResult(null, null, null, failure.Gate, failure.FailureClass, rules);
        }
    }

    private static PlanningDraftContent Draft(Reader reader, JsonObject draft, PlanningContext context)
    {
        reader.Only(draft, "summary", "proposals", "facts", "assumptions", "warnings", "unresolvedQuestions");
        var proposals = reader.Items(draft, "proposals").Select(node =>
        {
            var item = reader.Object(node);
            // A review date is product policy; a model that supplies one fails here as an unknown field.
            reader.Only(item, "draftId", "entityType", "title", "description", "parentDraftId", "underContext",
                "source", "confidence", "desiredOutcome", "completionMeaning", "targetDate", "plannedDate",
                "deadline", "recurrence", "timesOfDay", "effectiveFromLocalDate");
            PlanningRecurrence? recurrence = null;
            if (reader.Node(item, "recurrence") is { } recurrenceNode)
            {
                var value = reader.Object(recurrenceNode);
                reader.Only(value, "type", "daysOfWeek", "dayOfMonth");
                recurrence = new PlanningRecurrence(reader.RecurrenceType(value),
                    reader.Node(value, "daysOfWeek") is null ? null : reader.Integers(value, "daysOfWeek"),
                    reader.Integer(value, "dayOfMonth"));
            }
            return new PlanningProposal(
                reader.Required(item, "draftId"),
                reader.Enum(item, "entityType", EntityTypes) ?? throw Schema(),
                reader.Required(item, "title"),
                reader.Text(item, "description"),
                reader.Text(item, "parentDraftId"),
                reader.Flag(item, "underContext"),
                reader.Enum(item, "source", Sources) ?? throw Schema(),
                reader.Enum(item, "confidence", Confidences) ?? throw Schema(),
                true,
                reader.Text(item, "desiredOutcome"),
                reader.Text(item, "completionMeaning"),
                reader.Date(item, "targetDate"),
                null,
                null,
                reader.Date(item, "plannedDate"),
                reader.Date(item, "deadline"),
                recurrence,
                reader.Node(item, "timesOfDay") is null ? null : reader.Times(item, "timesOfDay"),
                reader.Date(item, "effectiveFromLocalDate"));
        }).ToArray();
        var facts = reader.Items(draft, "facts").Select(node =>
        {
            var item = reader.Object(node);
            reader.Only(item, "draftId", "factType", "strength", "value", "scopeDraftId");
            var value = reader.Object(reader.Node(item, "value") ?? throw Schema());
            reader.Only(value, "weekdays", "localDate", "startLocalDate", "endLocalDate", "text");
            return new PlanningFactProposal(
                reader.Required(item, "draftId"),
                reader.Enum(item, "factType", FactTypes) ?? throw Schema(),
                reader.Enum(item, "strength", Strengths) ?? throw Schema(),
                new PlanningFactValue(
                    reader.Node(value, "weekdays") is null ? null : reader.Integers(value, "weekdays"),
                    reader.Date(value, "localDate"), reader.Date(value, "startLocalDate"),
                    reader.Date(value, "endLocalDate"), reader.Text(value, "text")),
                reader.Text(item, "scopeDraftId"),
                true);
        }).ToArray();
        var warnings = reader.Items(draft, "warnings").Select(node =>
        {
            var item = reader.Object(node);
            reader.Only(item, "draftId", "severity", "code");
            return new PlanningWarning(reader.Text(item, "draftId"),
                reader.Enum(item, "severity", Severities) ?? throw Schema(),
                reader.Enum(item, "code", PlanningWarningCodes.All) ?? throw Schema());
        }).ToArray();
        return new PlanningDraftContent(reader.Required(draft, "summary"), context.WindowStart, context.WindowEnd,
            proposals, facts, Notes("assumptions"), warnings, Notes("unresolvedQuestions"));

        PlanningNote[] Notes(string name) => reader.Items(draft, name).Select(node =>
        {
            var item = reader.Object(node);
            reader.Only(item, "draftId", "text");
            return new PlanningNote(reader.Text(item, "draftId"), reader.Required(item, "text"));
        }).ToArray();
    }

    private static GateFailure Schema() => new(GateSchema, AiFailureClasses.Schema);

    private sealed class GateFailure(string gate, string failureClass) : Exception
    {
        public string Gate { get; } = gate;
        public string FailureClass { get; } = failureClass;
    }

    /// <summary>Typed access to parsed JSON. A missing member and a JSON null are the same; a wrong type is a schema failure.</summary>
    private sealed class Reader(List<string> rules)
    {
        public JsonObject Object(JsonNode? node) => node as JsonObject ?? throw Schema();

        public void Only(JsonObject value, params string[] allowed)
        {
            if (value.Any(x => !allowed.Contains(x.Key, StringComparer.Ordinal))) throw Schema();
        }

        public JsonNode? Node(JsonObject value, string name) => value.TryGetPropertyValue(name, out var node) ? node : null;

        public string? Text(JsonObject value, string name)
        {
            if (Node(value, name) is not { } node) return null;
            return node.GetValueKind() == JsonValueKind.String ? node.GetValue<string>() : throw Schema();
        }

        public string Required(JsonObject value, string name) => Text(value, name) ?? throw Schema();

        public bool Flag(JsonObject value, string name) => Node(value, name)?.GetValueKind() switch
        {
            null or JsonValueKind.False => false,
            JsonValueKind.True => true,
            _ => throw Schema()
        };

        public int? Integer(JsonObject value, string name) => Node(value, name) is { } node ? Integer(node) : null;

        public IReadOnlyList<JsonNode?> Items(JsonObject value, string name) => Node(value, name) switch
        {
            null => [],
            JsonArray array => array.ToArray(),
            _ => throw Schema()
        };

        public int[] Integers(JsonObject value, string name) =>
            Items(value, name).Select(x => Integer(x ?? throw Schema())).ToArray();

        public TimeOnly[] Times(JsonObject value, string name) => Items(value, name).Select(node =>
            node?.GetValueKind() == JsonValueKind.String && TimeOnly.TryParseExact(node.GetValue<string>(), "HH:mm",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : throw Schema()).ToArray();

        /// <summary>A known value in any letter case becomes its canonical spelling. Anything else is rejected, never matched loosely.</summary>
        public string? Enum(JsonObject value, string name, IEnumerable<string> known)
        {
            if (Text(value, name) is not { } text) return null;
            foreach (var candidate in known)
            {
                if (string.Equals(candidate, text, StringComparison.Ordinal)) return candidate;
                if (!string.Equals(candidate, text, StringComparison.OrdinalIgnoreCase)) continue;
                rules.Add(NormalizeEnumCase);
                return candidate;
            }
            throw Schema();
        }

        /// <summary>A recurrence the product cannot represent stays as written, to be blocked in review; it is never converted.</summary>
        public string RecurrenceType(JsonObject value)
        {
            var text = Required(value, "type");
            foreach (var candidate in RecurrenceKinds)
            {
                if (string.Equals(candidate, text, StringComparison.Ordinal)) return candidate;
                if (!string.Equals(candidate, text, StringComparison.OrdinalIgnoreCase)) continue;
                rules.Add(NormalizeEnumCase);
                return candidate;
            }
            return Token().IsMatch(text) ? text : throw Schema();
        }

        /// <summary>Year-first numeric dates only. A different order, a short year or a month name is rejected.</summary>
        public DateOnly? Date(JsonObject value, string name)
        {
            if (Text(value, name) is not { } text) return null;
            var match = YearFirstDate().Match(text);
            if (!match.Success) throw Schema();
            if (match.Groups[2].Value == "/") rules.Add(NormalizeDateSeparator);
            if (match.Groups[3].Length == 1 || match.Groups[4].Length == 1) rules.Add(PadDate);
            try
            {
                return new DateOnly(int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture),
                    int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture),
                    int.Parse(match.Groups[4].Value, CultureInfo.InvariantCulture));
            }
            catch (ArgumentOutOfRangeException)
            {
                throw Schema();
            }
        }

        private static int Integer(JsonNode node) =>
            node.GetValueKind() == JsonValueKind.Number && node.AsValue().TryGetValue<int>(out var number)
                ? number : throw Schema();
    }
}
