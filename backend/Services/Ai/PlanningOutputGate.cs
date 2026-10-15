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

    /// <summary>
    /// What a rejected output got wrong, for the one corrective resend: field paths, rule names and
    /// allowed values in the gate's own words, never text from the output. Null when asking again
    /// cannot help.
    /// </summary>
    public string? Correction { get; init; }

    /// <summary>
    /// For a draft whose only fault is items that cannot be approved: the same draft without them
    /// (029 §8), used when the answer is not asked for again. Null otherwise.
    /// </summary>
    public PlanningGateResult? Fallback { get; init; }
}

/// <summary>
/// The only way model text becomes a planning result. The whole output passes every gate or is
/// rejected: transport completeness, one allowlisted syntax repair, strict parsing against the
/// pinned schema, policy, and the same structural rules every draft obeys. Nothing is guessed,
/// dropped or reshaped to make an output pass. It reads nothing but its arguments.
/// </summary>
public static partial class PlanningOutputGate
{
    public const string RepairPolicyVersion = "2026-10-15.1";
    public const int MaxOutputChars = 60_000;
    public const int MaxCorrectionChars = 1_500;

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
    public const string RemoveInvalidItems = "REMOVE_INVALID_ITEMS";
    public const string DropInvalidSequence = "DROP_INVALID_SEQUENCE";

    // Structural faults a draft can be cured of by leaving items out: its later items past a count
    // limit, and planning details that break the catalogue.
    private static readonly HashSet<string> RemovableErrors = new(StringComparer.Ordinal)
    {
        "TOO_MANY_PROPOSALS", "TOO_MANY_GOALS", "TOO_MANY_PROJECTS", "TOO_MANY_TASKS", "TOO_MANY_ROUTINES",
        "FACT_INVALID", "NOTE_INVALID", "WARNING_INVALID", "TOO_MANY_ASSUMPTIONS", "TOO_MANY_WARNINGS",
        "TOO_MANY_QUESTIONS"
    };

    private const string TextDateCorrection =
        "a Persian date written in the text names a day its month does not have, or a weekday that is not that date's weekday: write a day only as an exact \"persianDate\" from \"calendar\", with its own \"weekday\"";

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

            var root = AiOutputText.ParseObject(text, rules) ?? throw new GateFailure(GateParse, AiFailureClasses.Parse,
                "the answer was not exactly one JSON object: there must be no text before or after it and no repeated property name");
            var reader = new Reader(rules);
            reader.Only(root, "kind", "message", "blockReason", "questions", "draft");
            var kind = reader.RequiredEnum(root, "kind", Kinds);
            var message = reader.Text(root, "message");
            var questions = reader.Items(root, "questions").Select((node, index) =>
            {
                reader.Path = $"questions[{index}]";
                var item = reader.Object(node);
                reader.Only(item, "id", "text", "reason", "kind", "options", "multiple");
                return new PlanningQuestion(reader.Required(item, "id"), reader.Required(item, "text").Trim())
                {
                    Reason = reader.Text(item, "reason")?.Trim(),
                    Kind = reader.RequiredEnum(item, "kind", PlanningQuestionKinds.All),
                    Options = reader.Strings(item, "options").Select(x => x.Trim()).ToArray(),
                    Multiple = reader.Flag(item, "multiple")
                };
            }).ToArray();
            reader.Path = string.Empty;
            var blockReason = reader.Enum(root, "blockReason", BlockReasons);
            var draftNode = reader.Node(root, "draft");

            if (kind != PlanningOutcomes.Draft)
            {
                var clarification = new PlanningClarification(questions, blockReason, message?.Trim());
                if (draftNode is not null)
                    throw Schema($"kind {kind}: \"draft\" must be null");
                if (PlanningClarificationRules.Error(kind, clarification) is { } error)
                    throw Schema($"kind {kind}: {ExplainQuestions(error)}");
                // Asking again after the turn budget or after "draft now" is not an acceptable answer.
                if (kind == PlanningOutcomes.Clarification && !allowClarification)
                    throw new GateFailure(GatePolicy, AiFailureClasses.Policy,
                        "clarificationAllowed is false, so kind CLARIFICATION is not allowed: return a DRAFT with visible assumptions or INPUT_BLOCKED");
                var asked = new PlanningGateResult(kind, null, clarification, null, null, rules);
                // A wrong Persian date is asked for again once; otherwise the questions are kept as written.
                if (PlanningTextDates.HasError(PlanningTextDates.Of(clarification), context.Today))
                    throw new GateFailure(GateSemantic, AiFailureClasses.Semantic, TextDateCorrection) { Fallback = asked };
                return asked;
            }

            if (draftNode is null || questions.Length > 0 || blockReason is not null)
                throw Schema("kind DRAFT: \"draft\" must be an object, \"questions\" must be empty and \"blockReason\" must be null");
            reader.Path = "draft";
            var parsed = Draft(reader, reader.Object(draftNode), context);
            try
            {
                var draft = PlanningDraftRules.Repair(parsed, context.Today);
                // An invalid sequence loses only its order; its Tasks stay (029 §9).
                if (PlanningDraftRules.WithoutInvalidSequences(draft) is { } unchained)
                {
                    draft = unchained;
                    rules.Add(DropInvalidSequence);
                }
                var errors = PlanningDraftRules.StructuralErrors(draft, context.Scope?.Type);
                if (errors.Count > 0)
                {
                    // Too many items, or a detail that cannot be stored, is asked for again, and otherwise
                    // the later items and the broken details are left out (029 §8).
                    var trimmed = errors.All(RemovableErrors.Contains)
                        ? PlanningDraftRules.Without(PlanningDraftRules.WithoutInvalidNotes(draft),
                            [..PlanningDraftRules.OverLimits(draft), ..PlanningDraftRules.InvalidFacts(draft)])
                        : null;
                    throw new GateFailure(GateSemantic, AiFailureClasses.Semantic,
                        "the draft breaks these rules: " + string.Join("; ", errors.Select(Explain)))
                    {
                        Fallback = trimmed is not null && PlanningDraftRules.StructuralErrors(trimmed, context.Scope?.Type).Count == 0
                            ? Approvable(kind, trimmed, context, rules, out _) : null
                    };
                }
                // The draft as handed over must be approvable: an item the user could not approve is
                // asked for again, and otherwise left out with a note (029 §8).
                var result = Approvable(kind, draft, context, rules, out var defects);
                if (defects.Count == 0)
                {
                    // A wrong Persian date is asked for again once; otherwise the draft is kept as written.
                    if (PlanningTextDates.HasError(PlanningTextDates.Of(draft), context.Today))
                        throw new GateFailure(GateSemantic, AiFailureClasses.Semantic, TextDateCorrection) { Fallback = result };
                    return result!;
                }
                throw new GateFailure(GateSemantic, AiFailureClasses.Semantic,
                    "these items could not be approved as proposed: " + string.Join("; ", defects
                        .Select(x => (Where: Where(draft, x.DraftId), x.Code))
                        .Distinct().Select(x => $"{x.Where}: {ExplainIssue(x.Code)}")))
                {
                    Fallback = result
                };
            }
            catch (Exception exception) when (exception is NullReferenceException or ArgumentException
                or KeyNotFoundException or InvalidOperationException)
            {
                throw new GateFailure(GateSemantic, AiFailureClasses.Semantic,
                    "the proposals, facts and notes of the draft do not form a consistent structure");
            }
        }
        catch (GateFailure failure)
        {
            return new PlanningGateResult(null, null, null, failure.Gate, failure.FailureClass, rules)
            {
                Correction = failure.Detail is { Length: > MaxCorrectionChars } ? failure.Detail[..MaxCorrectionChars] : failure.Detail,
                Fallback = failure.Fallback
            };
        }
    }

    /// <summary>
    /// The draft itself when the user could approve every item as handed over; otherwise the draft
    /// without the items that block (marked by the repair rule), or null when nothing usable is left
    /// or the whole draft is at fault. The blocking issues found are returned either way.
    /// </summary>
    private static PlanningGateResult? Approvable(string kind, PlanningDraftContent draft, PlanningContext context,
        List<string> rules, out IReadOnlyList<(string? DraftId, string Code)> defects)
    {
        var ruleContext = new PlanningRuleContext(context.Today, context.Scope?.Type, context.Facts);
        defects = PlanningDraftRules.Defects(PlanningDraftRules.Evaluate(draft, ruleContext));
        var reduced = draft.RemovedItems is { Count: > 0 };
        if (defects.Count == 0)
            return new PlanningGateResult(kind, draft, null, null, null, reduced ? [..rules, RemoveInvalidItems] : rules);
        // An overloaded first week is the only fault of the whole draft that leaving items out can cure.
        var candidate = draft;
        if (defects.Any(x => x.DraftId is null))
        {
            if (defects.Any(x => x.DraftId is null && x.Code != PlanningIssueCodes.FirstWeekOverloaded) ||
                PlanningDraftRules.WithinFirstWeek(draft, ruleContext) is not { } fitted) return null;
            candidate = fitted;
        }
        var remaining = PlanningDraftRules.Defects(PlanningDraftRules.Evaluate(candidate, ruleContext));
        if (remaining.Any(x => x.DraftId is null)) return null;
        var without = remaining.Count == 0 ? candidate : PlanningDraftRules.Without(candidate, remaining.Select(x => x.DraftId!));
        return without is null ? null : new PlanningGateResult(kind, without, null, null, null, [..rules, RemoveInvalidItems]);
    }

    /// <summary>Where an item sits in the output, by position only, so the correction never repeats its content.</summary>
    private static string Where(PlanningDraftContent draft, string? draftId)
    {
        if (draftId is null) return "the draft as a whole";
        var proposal = draft.Proposals.Select((x, i) => (x.DraftId, i)).FirstOrDefault(x => x.DraftId == draftId);
        if (proposal.DraftId is not null) return $"draft.proposals[{proposal.i}]";
        var fact = draft.Facts.Select((x, i) => (x.DraftId, i)).First(x => x.DraftId == draftId);
        return $"draft.facts[{fact.i}]";
    }

    /// <summary>A review issue in words the model can act on. An unlisted issue is named by its code.</summary>
    private static string ExplainIssue(string code) => code switch
    {
        PlanningIssueCodes.StandaloneTaskNeedsDate => "a TASK without a parent and not under the context needs a \"plannedDate\" inside the window; give it a date, or leave it out",
        PlanningIssueCodes.DateOutsideWindow => "\"plannedDate\" and \"effectiveFromLocalDate\" must lie between windowStart and windowEnd",
        PlanningIssueCodes.DateInPast => "a date is before today",
        PlanningIssueCodes.DateAfterDeadline => "\"plannedDate\" is after the Task's own \"deadline\"",
        PlanningIssueCodes.DateTooFar => $"\"targetDate\" and \"deadline\" may be at most {PlanningLimits.MaxMonthsAhead} months after today",
        PlanningIssueCodes.HardConstraintConflict => "it falls on a day a HARD planning detail rules out; use another day",
        PlanningIssueCodes.UnsupportedRecurrence => "\"recurrence\" is not one of the three supported forms with valid days",
        PlanningIssueCodes.InvalidTimes => "\"timesOfDay\" must be distinct \"HH:mm\" times",
        PlanningIssueCodes.StartInPast => "\"effectiveFromLocalDate\" is before today",
        PlanningIssueCodes.TargetInPast => "\"targetDate\" is before today",
        PlanningIssueCodes.NotAllowedInContext => "inside a GOAL context propose no GOAL; inside a PROJECT context propose only TASKs and ROUTINEs under the context",
        PlanningIssueCodes.EmptyParent => "a GOAL or PROJECT needs at least one TASK or ROUTINE under it; add its real first steps, or leave it out",
        PlanningIssueCodes.FactScopeUnsupported => "a fact needs \"scopeDraftId\" set to a proposed GOAL or to a proposed PROJECT without a parent; when there is none and planningContext is null, do not propose the fact (state it as an assumption instead)",
        PlanningIssueCodes.FactAlreadyActive => "the same planning detail is already confirmed or repeated; do not propose it again",
        PlanningIssueCodes.FactDatePassed => "the planning detail's dates are before today",
        PlanningIssueCodes.FirstWeekOverloaded => $"the first week holds more than {PlanningLimits.FirstWeekEntries} Task and Routine occurrences; propose less",
        _ => $"{code}: the item cannot be approved as proposed"
    };

    /// <summary>A clarification rule in words the model can act on, never quoting the rejected output.</summary>
    private static string ExplainQuestions(string error) => error switch
    {
        "MESSAGE_TOO_LONG" => "\"message\" has at most 500 characters",
        "BLOCKED_INVALID" => "INPUT_BLOCKED needs an empty \"questions\", a listed \"blockReason\" and a non-empty \"message\"",
        "QUESTION_COUNT_INVALID" => "CLARIFICATION needs 1 to 4 questions and \"blockReason\" null",
        "QUESTION_ID_DUPLICATE" or "QUESTION_ID_INVALID" => "question ids are q1, q2, q3, q4, each used once",
        "QUESTION_KIND_INVALID" => "a question \"kind\" is one of TIMING | RECURRENCE | CONSTRAINT | CONTENT | OWNERSHIP | CONTRADICTION",
        "QUESTION_TEXT_INVALID" => "each question \"text\" has 1 to 300 characters",
        "QUESTION_REASON_INVALID" => "a question \"reason\" is null or one line of 1 to 120 characters",
        "QUESTION_MULTIPLE_WITHOUT_OPTIONS" => "\"multiple\" is true only for a question that has options",
        "QUESTION_OPTION_COUNT_INVALID" => "a question has no options, or exactly 2 options",
        "QUESTION_OPTION_INVALID" => "each option is one line of 1 to 40 characters",
        "QUESTION_OPTION_DUPLICATE" => "the options of one question are all different",
        "QUESTION_OPTION_OTHER" => "an option must not mean \"something else\" or invite the user to write their own answer; the program adds that choice itself",
        _ => error
    };

    /// <summary>A structural rule in words the model can act on. An unlisted rule is named by its code.</summary>
    private static string Explain(string error) => error switch
    {
        "SUMMARY_INVALID" => "\"summary\" must have 1 to 1000 characters",
        "TOO_MANY_PROPOSALS" or "TOO_MANY_GOALS" or "TOO_MANY_PROJECTS" or "TOO_MANY_TASKS" or "TOO_MANY_ROUTINES"
            or "TOO_MANY_FACTS" or "TOO_MANY_ASSUMPTIONS" or "TOO_MANY_WARNINGS" or "TOO_MANY_QUESTIONS"
            => $"{error}: a count limit of STRUCTURE is exceeded, so propose less",
        "DRAFT_ID_INVALID" => "every proposal and fact needs a \"draftId\" of letters, digits, \"-\" or \"_\", at most 40 characters",
        "DRAFT_ID_DUPLICATE" => "a \"draftId\" is used twice; it must be unique across all proposals and facts",
        "TITLE_INVALID" => "a \"title\" must have 1 to 200 characters",
        "TEXT_TOO_LONG" => "\"description\", \"desiredOutcome\" and \"completionMeaning\" have at most 2000 characters each",
        "GOAL_OUTCOME_REQUIRED" => "a GOAL needs \"desiredOutcome\"",
        "ROUTINE_RECURRENCE_REQUIRED" => "a ROUTINE needs \"recurrence\"",
        "PARENT_INVALID" => "a \"parentDraftId\" must be the draftId of another proposal in this output of an allowed parent type (GOAL for a PROJECT; GOAL or PROJECT for a TASK or ROUTINE), and never together with \"underContext\": true",
        "CONTEXT_PARENT_INVALID" => "\"underContext\": true is allowed only when planningContext is not null, never on a GOAL, and never on a PROJECT inside a PROJECT context",
        "FACT_INVALID" => "a fact's \"factType\", \"strength\" and \"value\" do not match the PLANNING DETAILS rules",
        "FACT_SCOPE_INVALID" => "a fact's \"scopeDraftId\" must be null or the draftId of a proposal in this output",
        "NOTE_INVALID" => "each item of \"assumptions\" and \"unresolvedQuestions\" needs a \"text\" of 1 to 300 characters and a \"draftId\" that is null or the draftId of a proposal or fact in this output",
        "WARNING_INVALID" => "each warning needs a listed \"severity\" and \"code\" and a \"draftId\" that is null or the draftId of a proposal or fact in this output",
        "SEQUENCE_INVALID" => "\"sequenceKey\" and \"sequenceOrder\" are set together and only on TASKs; a sequence has at least two Tasks with the same parent (or all standalone, or all under the context), each with a different positive \"sequenceOrder\"",
        _ => error
    };

    private static PlanningDraftContent Draft(Reader reader, JsonObject draft, PlanningContext context)
    {
        reader.Only(draft, "summary", "proposals", "facts", "assumptions", "warnings", "unresolvedQuestions");
        var proposals = List("proposals").Select((node, index) =>
        {
            var path = reader.Path = $"draft.proposals[{index}]";
            var item = reader.Object(node);
            // A review date is product policy; a model that supplies one fails here as an unknown field.
            reader.Only(item, "draftId", "entityType", "title", "description", "parentDraftId", "underContext",
                "source", "confidence", "desiredOutcome", "completionMeaning", "targetDate", "plannedDate",
                "deadline", "recurrence", "timesOfDay", "effectiveFromLocalDate", "sequenceKey", "sequenceOrder");
            PlanningRecurrence? recurrence = null;
            if (reader.Node(item, "recurrence") is { } recurrenceNode)
            {
                reader.Path = $"{path}.recurrence";
                var value = reader.Object(recurrenceNode);
                reader.Only(value, "type", "daysOfWeek", "dayOfMonth");
                recurrence = new PlanningRecurrence(reader.RecurrenceType(value),
                    reader.Node(value, "daysOfWeek") is null ? null : reader.Integers(value, "daysOfWeek"),
                    reader.Integer(value, "dayOfMonth"));
                reader.Path = path;
            }
            return new PlanningProposal(
                reader.Required(item, "draftId"),
                reader.RequiredEnum(item, "entityType", EntityTypes),
                reader.Required(item, "title"),
                reader.Text(item, "description"),
                reader.Text(item, "parentDraftId"),
                reader.Flag(item, "underContext"),
                reader.RequiredEnum(item, "source", Sources),
                reader.RequiredEnum(item, "confidence", Confidences),
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
                reader.Date(item, "effectiveFromLocalDate"),
                reader.Text(item, "sequenceKey"),
                reader.Integer(item, "sequenceOrder"));
        }).ToArray();
        var facts = List("facts").Select((node, index) =>
        {
            var path = reader.Path = $"draft.facts[{index}]";
            var item = reader.Object(node);
            reader.Only(item, "draftId", "factType", "strength", "value", "scopeDraftId");
            reader.Path = $"{path}.value";
            var value = reader.Object(reader.Node(item, "value"));
            reader.Only(value, "weekdays", "localDate", "startLocalDate", "endLocalDate", "text");
            var factValue = new PlanningFactValue(
                reader.Node(value, "weekdays") is null ? null : reader.Integers(value, "weekdays"),
                reader.Date(value, "localDate"), reader.Date(value, "startLocalDate"),
                reader.Date(value, "endLocalDate"), reader.Text(value, "text"));
            reader.Path = path;
            return new PlanningFactProposal(
                reader.Required(item, "draftId"),
                reader.RequiredEnum(item, "factType", FactTypes),
                reader.RequiredEnum(item, "strength", Strengths),
                factValue,
                reader.Text(item, "scopeDraftId"),
                true);
        }).ToArray();
        var warnings = List("warnings").Select((node, index) =>
        {
            reader.Path = $"draft.warnings[{index}]";
            var item = reader.Object(node);
            reader.Only(item, "draftId", "severity", "code");
            return new PlanningWarning(reader.Text(item, "draftId"),
                reader.RequiredEnum(item, "severity", Severities),
                reader.RequiredEnum(item, "code", PlanningWarningCodes.All));
        }).ToArray();
        var assumptions = Notes("assumptions");
        var unresolved = Notes("unresolvedQuestions");
        reader.Path = "draft";
        return new PlanningDraftContent(reader.Required(draft, "summary"), context.WindowStart, context.WindowEnd,
            proposals, facts, assumptions, warnings, unresolved);

        // The reader's path names what is being read, so a failure can say where it is.
        IReadOnlyList<JsonNode?> List(string name)
        {
            reader.Path = "draft";
            return reader.Items(draft, name);
        }

        PlanningNote[] Notes(string name) => List(name).Select((node, index) =>
        {
            reader.Path = $"draft.{name}[{index}]";
            var item = reader.Object(node);
            reader.Only(item, "draftId", "text");
            return new PlanningNote(reader.Text(item, "draftId"), reader.Required(item, "text"));
        }).ToArray();
    }

    private static GateFailure Schema(string detail) => new(GateSchema, AiFailureClasses.Schema, detail);

    private sealed class GateFailure(string gate, string failureClass, string? detail = null) : Exception
    {
        public string Gate { get; } = gate;
        public string FailureClass { get; } = failureClass;
        public string? Detail { get; } = detail;
        public PlanningGateResult? Fallback { get; init; }
    }

    /// <summary>
    /// Typed access to parsed JSON. A missing member and a JSON null are the same; a wrong type is a
    /// schema failure that names the member by its path and never quotes what the output held.
    /// </summary>
    private sealed class Reader(List<string> rules)
    {
        /// <summary>Where the object being read sits in the output; empty at the top level.</summary>
        public string Path { get; set; } = string.Empty;

        private GateFailure Fail(string? name, string problem)
        {
            var where = name is null ? Path.Length == 0 ? "the top-level object" : Path
                : Path.Length == 0 ? name : $"{Path}.{name}";
            return Schema($"{where}: {problem}");
        }

        public JsonObject Object(JsonNode? node) => node as JsonObject ?? throw Fail(null, "must be an object");

        public void Only(JsonObject value, params string[] allowed)
        {
            if (value.Any(x => !allowed.Contains(x.Key, StringComparer.Ordinal)))
                throw Fail(null, $"has a field that is not allowed; the only fields are {string.Join(", ", allowed)}");
        }

        public JsonNode? Node(JsonObject value, string name) => value.TryGetPropertyValue(name, out var node) ? node : null;

        public string? Text(JsonObject value, string name)
        {
            if (Node(value, name) is not { } node) return null;
            return node.GetValueKind() == JsonValueKind.String
                ? node.GetValue<string>() : throw Fail(name, "must be a JSON string or null");
        }

        public string Required(JsonObject value, string name) =>
            Text(value, name) ?? throw Fail(name, "is required and must be a JSON string");

        public bool Flag(JsonObject value, string name) => Node(value, name)?.GetValueKind() switch
        {
            null or JsonValueKind.False => false,
            JsonValueKind.True => true,
            _ => throw Fail(name, "must be true or false")
        };

        public int? Integer(JsonObject value, string name) => Node(value, name) is { } node ? Integer(node, name) : null;

        public IReadOnlyList<JsonNode?> Items(JsonObject value, string name) => Node(value, name) switch
        {
            null => [],
            JsonArray array => array.ToArray(),
            _ => throw Fail(name, "must be an array")
        };

        public string[] Strings(JsonObject value, string name) => Items(value, name)
            .Select(x => x?.GetValueKind() == JsonValueKind.String ? x.GetValue<string>() : throw Fail(name, "must be an array of JSON strings"))
            .ToArray();

        public int[] Integers(JsonObject value, string name) => Items(value, name)
            .Select(x => Integer(x ?? throw Fail(name, "must be an array of whole numbers"), name)).ToArray();

        public TimeOnly[] Times(JsonObject value, string name) => Items(value, name).Select(node =>
            node?.GetValueKind() == JsonValueKind.String && TimeOnly.TryParseExact(node.GetValue<string>(), "HH:mm",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)
                ? time : throw Fail(name, "must be an array of 24-hour \"HH:mm\" strings such as \"07:30\"")).ToArray();

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
            throw Fail(name, $"must be exactly one of {string.Join(" | ", known)}");
        }

        public string RequiredEnum(JsonObject value, string name, IEnumerable<string> known) =>
            Enum(value, name, known) ?? throw Fail(name, $"is required: exactly one of {string.Join(" | ", known)}");

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
            return Token().IsMatch(text)
                ? text : throw Fail("type", $"must be exactly one of {string.Join(" | ", RecurrenceKinds)}");
        }

        /// <summary>Year-first numeric dates only. A different order, a short year or a month name is rejected.</summary>
        public DateOnly? Date(JsonObject value, string name)
        {
            if (Text(value, name) is not { } text) return null;
            const string problem = "must be a real calendar date written YYYY-MM-DD, or null";
            var match = YearFirstDate().Match(text);
            if (!match.Success) throw Fail(name, problem);
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
                throw Fail(name, problem);
            }
        }

        private int Integer(JsonNode node, string name) =>
            node.GetValueKind() == JsonValueKind.Number && node.AsValue().TryGetValue<int>(out var number)
                ? number : throw Fail(name, "must be a whole number, not a string or a name");
    }
}
