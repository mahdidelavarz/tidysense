using System.Text.Json;

namespace TidySense.Services;

public static class PlanningEntityTypes
{
    public const string Goal = "GOAL";
    public const string Project = "PROJECT";
    public const string Task = "TASK";
    public const string Routine = "ROUTINE";

    public static bool IsKnown(string? value) => value is Goal or Project or Task or Routine;
}

public static class PlanningReviewStates
{
    public const string Included = "INCLUDED";
    public const string Excluded = "EXCLUDED";
    public const string Blocked = "BLOCKED";
    public const string BlockedByAncestor = "BLOCKED_BY_ANCESTOR";
}

public static class PlanningSeverities
{
    public const string Info = "INFO";
    public const string Important = "IMPORTANT";
    public const string Blocking = "BLOCKING";

    public static bool IsKnown(string? value) => value is Info or Important or Blocking;
}

public static class PlanningIssueOrigins
{
    public const string Rule = "RULE";
    public const string Generator = "GENERATOR";
}

public sealed record PlanningRecurrence(string Type, IReadOnlyList<int>? DaysOfWeek, int? DayOfMonth);

/// <summary>
/// One proposed entity inside a draft. <c>DraftId</c> exists only inside the draft. A proposal
/// hangs under another proposal (<c>ParentDraftId</c>), under the Goal or Project the planning
/// started from (<c>UnderContext</c>), or stands alone. Fields that do not apply to its entity
/// type are null.
/// </summary>
public sealed record PlanningProposal(
    string DraftId,
    string EntityType,
    string Title,
    string? Description,
    string? ParentDraftId,
    bool UnderContext,
    string Source,
    string Confidence,
    bool Included,
    string? DesiredOutcome,
    string? CompletionMeaning,
    DateOnly? TargetDate,
    DateOnly? ReviewDate,
    string? ReviewDateSource,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    PlanningRecurrence? Recurrence,
    IReadOnlyList<TimeOnly>? TimesOfDay,
    DateOnly? EffectiveFromLocalDate,
    string? SequenceKey = null,
    int? SequenceOrder = null,
    // An existing active Project of the Goal context the Task or Routine belongs to (with UnderContext).
    Guid? ContextProjectId = null);

/// <summary>Only the field that belongs to the fact type is set. Weekdays are ISO numbers (Monday = 1).</summary>
public sealed record PlanningFactValue(
    IReadOnlyList<int>? Weekdays,
    DateOnly? LocalDate,
    DateOnly? StartLocalDate,
    DateOnly? EndLocalDate,
    string? Text);

/// <summary>A proposed planning detail. A null scope means the Goal or Project the planning started from.</summary>
public sealed record PlanningFactProposal(
    string DraftId,
    string FactType,
    string Strength,
    PlanningFactValue Value,
    string? ScopeDraftId,
    bool Included);

/// <summary>An assumption or an unresolved question, optionally attached to one item.</summary>
public sealed record PlanningNote(string? DraftId, string Text);

/// <summary>A generator warning. Its code comes from a closed catalogue; it carries no free text.</summary>
public sealed record PlanningWarning(string? DraftId, string Severity, string Code);

public sealed record PlanningDraftContent(
    string Summary,
    DateOnly WindowStart,
    DateOnly WindowEnd,
    IReadOnlyList<PlanningProposal> Proposals,
    IReadOnlyList<PlanningFactProposal> Facts,
    IReadOnlyList<PlanningNote> Assumptions,
    IReadOnlyList<PlanningWarning> Warnings,
    IReadOnlyList<PlanningNote> UnresolvedQuestions,
    IReadOnlyList<PlanningRemovedItem>? RemovedItems = null);

/// <summary>
/// An item the generator proposed that could not be made valid and was left out (029 §8). It is
/// named to the user in one note; nothing about it is created.
/// </summary>
public sealed record PlanningRemovedItem(string EntityType, string? Title);

public static class PlanningRemovedItemTypes
{
    /// <summary>A removed planning detail, named without its value.</summary>
    public const string Fact = "FACT";
}

public static class PlanningJson
{
    public const string SchemaVersion = "2026-10-16.1";
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    public static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)!;
}

// ---- Planning context ----

public static class PlanningContextTypes
{
    public const string Goal = "GOAL";
    public const string Project = "PROJECT";
}

/// <summary>The Goal or Project the planning started from, and where its planning details live.</summary>
public sealed record PlanningScope(
    string Type,
    Guid Id,
    string Title,
    long Version,
    string FactScopeType,
    Guid FactScopeId);

public sealed record PlanningFactData(string FactType, string Strength, PlanningFactValue Value);

/// <summary>An active Project of the scope. <c>Ref</c> is how a proposal names it as its parent ("P1", "P2", …).</summary>
public sealed record PlanningContextProject(Guid Id, string Title, DateOnly? TargetDate, string Ref = "");

/// <summary>An active Routine of the scope, with its slots kept and missed in the previous window.</summary>
public sealed record PlanningContextRoutine(Guid Id, string Title, Guid? ProjectId, PlanningRecurrence Recurrence,
    int DoneCount = 0, int MissedCount = 0);

/// <summary>An unfinished Task of the scope; <c>WaitsFor</c> names the earlier steps of its sequence still open.</summary>
public sealed record PlanningContextTask(
    Guid Id,
    string Title,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    IReadOnlyList<string> ReasonCodes,
    IReadOnlyList<string>? WaitsFor = null);

/// <summary>
/// What happened in the scope during the previous window: the seven local days before today, or
/// for a continuation the planned week itself through today (029 §3). Nothing older is supplied.
/// <c>Left</c> Tasks were planned inside it and are still open.
/// </summary>
public sealed record PlanningPreviousWindow(
    DateOnly StartDate,
    DateOnly EndDate,
    IReadOnlyList<string> CompletedTaskTitles,
    int CompletedTaskCount,
    int CarriedTaskCount,
    int DroppedTaskCount,
    int RoutineDoneCount,
    int RoutineMissedCount,
    IReadOnlyList<string>? LeftTaskTitles = null,
    int LeftTaskCount = 0);

/// <summary>The planned week a generation continues: its number and its dates.</summary>
public sealed record PlanningContinuationContext(Guid WindowId, int Week, DateOnly PreviousStart, DateOnly PreviousEnd);

/// <summary>
/// The bounded input of one generation, rebuilt from current product state. It never contains a
/// conversation or anything outside the planning scope.
/// </summary>
public sealed record PlanningContext(
    string BuilderVersion,
    DateOnly Today,
    string Timezone,
    DateOnly WindowStart,
    DateOnly WindowEnd,
    PlanningScope? Scope,
    IReadOnlyList<PlanningFactData> Facts,
    IReadOnlyList<PlanningContextProject> Projects,
    IReadOnlyList<PlanningContextRoutine> Routines,
    IReadOnlyList<PlanningContextTask> UnfinishedTasks,
    PlanningPreviousWindow? PreviousWindow,
    PlanningContinuationContext? Continuation = null)
{
    /// <summary>Identifies exactly this context. A result produced from another context is rejected.</summary>
    public string Fingerprint { get; init; } = string.Empty;
}

// ---- Clarification ----

/// <summary>What one generation ends in. Only <c>DRAFT</c> carries a draft.</summary>
public static class PlanningOutcomes
{
    public const string Draft = "DRAFT";
    public const string Clarification = "CLARIFICATION";
    public const string InputBlocked = "INPUT_BLOCKED";
}

public static class PlanningBlockReasons
{
    public const string TooVague = "TOO_VAGUE";
    public const string Contradictory = "CONTRADICTORY";
    public const string UnsupportedRequest = "UNSUPPORTED_REQUEST";
    public const string MissingConstraint = "MISSING_CONSTRAINT";

    public static bool IsKnown(string? value) =>
        value is TooVague or Contradictory or UnsupportedRequest or MissingConstraint;
}

/// <summary>
/// What a clarification question is about (028 §2.5), following the 013 §6 reasons for asking. It is
/// the only part of a question that is measured; labels and answers never are.
/// </summary>
public static class PlanningQuestionKinds
{
    public const string Timing = "TIMING";
    public const string Recurrence = "RECURRENCE";
    public const string Constraint = "CONSTRAINT";
    public const string Content = "CONTENT";
    public const string Ownership = "OWNERSHIP";
    public const string Contradiction = "CONTRADICTION";

    // ENTITY_TYPE was removed by 029 §7: the system, not the user, decides structure.
    public static readonly string[] All = [Timing, Recurrence, Constraint, Content, Ownership, Contradiction];

    public static bool IsKnown(string? value) => value is not null && All.Contains(value, StringComparer.Ordinal);
}

/// <summary>
/// One clarification question (028 §2.1 as amended by 029 §7): its text, an optional one-line reason
/// saying what the answer changes, its kind, and zero or exactly two short options, one or both of
/// which may be chosen. The product adds «خودت بنویس» itself as the third answer, so the options
/// never hold an "other". Every label is model output and is shown as plain text only.
/// </summary>
public sealed record PlanningQuestion(string Id, string Text)
{
    public string? Reason { get; init; }
    public string? Kind { get; init; }
    public IReadOnlyList<string> Options { get; init; } = [];
    public bool Multiple { get; init; }
}

/// <summary>
/// The answer to one question: the zero-based positions of the chosen options, the «خودت بنویس» text,
/// or both. The server, not the client, turns positions into labels for the model.
/// </summary>
public sealed record PlanningAnswer(string QuestionId, string? Text = null)
{
    public IReadOnlyList<int> Options { get; init; } = [];
}

/// <summary>One finished clarification turn: what was asked and what the user answered.</summary>
public sealed record PlanningTurn(IReadOnlyList<PlanningQuestion> Questions, IReadOnlyList<PlanningAnswer> Answers);

/// <summary>
/// The questions of a clarification, or the reason the input cannot be planned. The message is
/// the boundary or the blocking ambiguity in the user's language; it never proposes work.
/// </summary>
public sealed record PlanningClarification(
    IReadOnlyList<PlanningQuestion> Questions,
    string? BlockReason,
    string? Message);

public static partial class PlanningClarificationRules
{
    public const int MaxTurns = 3;
    public const int MaxQuestions = 4;
    public const int QuestionLength = 300;
    public const int MessageLength = 500;
    public const int AnswerLength = 500;

    [System.Text.RegularExpressions.GeneratedRegex("^[A-Za-z0-9_-]{1,40}$")]
    private static partial System.Text.RegularExpressions.Regex IdPattern();

    public const int ReasonLength = 120;
    public const int MinOptions = 2;
    public const int MaxOptions = 2;
    public const int OptionLength = 40;

    // A free-text "other" in the forms a model is likely to write it. The product adds its own
    // «خودت بنویس», so a second one would duplicate it and break the OTHER measurement (028 §2.2).
    private static readonly HashSet<string> OtherLabels = new(StringComparer.Ordinal)
    {
        "other", "others", "otheroption", "somethingelse", "else",
        "سایر", "سایرموارد", "دیگر", "دیگری", "مورددیگر", "موارددیگر", "گزینهدیگر", "گزینهدیگری",
        "چیزدیگر", "چیزدیگری", "غیره", "غیرازاین", "غیرازاینها", "پاسخدیگر", "جوابدیگر",
        "خودممینویسم", "خودمبنویسم", "نوشتنپاسخ", "پاسخخودم", "خودتبنویس", "خودتبنویسید",
        "خودتاننوشته", "بنویسید", "بنویس"
    };

    /// <summary>A clarification asks one to four distinct questions; a blocked input names a known reason and says why.</summary>
    public static bool IsValid(string outcome, PlanningClarification? value) => Error(outcome, value) is null;

    /// <summary>The first rule a clarification or blocked input breaks, or null when it is valid.</summary>
    public static string? Error(string outcome, PlanningClarification? value)
    {
        if (value is null) return "CLARIFICATION_MISSING";
        if (value.Message is { Length: > MessageLength }) return "MESSAGE_TOO_LONG";
        var questions = value.Questions ?? [];
        if (outcome == PlanningOutcomes.InputBlocked)
            return questions.Count == 0 && PlanningBlockReasons.IsKnown(value.BlockReason) &&
                !string.IsNullOrWhiteSpace(value.Message) ? null : "BLOCKED_INVALID";
        if (outcome != PlanningOutcomes.Clarification || value.BlockReason is not null ||
            questions.Count is < 1 or > MaxQuestions) return "QUESTION_COUNT_INVALID";
        if (questions.Select(x => x.Id).Distinct(StringComparer.Ordinal).Count() != questions.Count)
            return "QUESTION_ID_DUPLICATE";
        return questions.Select(QuestionError).FirstOrDefault(x => x is not null);
    }

    /// <summary>The first 028 §2.1–§2.2 rule one question breaks, or null.</summary>
    public static string? QuestionError(PlanningQuestion question)
    {
        if (question.Id is null || !IdPattern().IsMatch(question.Id)) return "QUESTION_ID_INVALID";
        if (question.Text is not { Length: > 0 and <= QuestionLength } || string.IsNullOrWhiteSpace(question.Text))
            return "QUESTION_TEXT_INVALID";
        if (question.Reason is not null && (question.Reason.Length > ReasonLength ||
                string.IsNullOrWhiteSpace(question.Reason) || question.Reason.Any(char.IsControl)))
            return "QUESTION_REASON_INVALID";
        if (!PlanningQuestionKinds.IsKnown(question.Kind)) return "QUESTION_KIND_INVALID";
        var options = question.Options ?? [];
        if (options.Count == 0) return question.Multiple ? "QUESTION_MULTIPLE_WITHOUT_OPTIONS" : null;
        if (options.Count is < MinOptions or > MaxOptions) return "QUESTION_OPTION_COUNT_INVALID";
        if (options.Any(x => x is null || x.Length is 0 or > OptionLength || string.IsNullOrWhiteSpace(x) ||
                x.Any(char.IsControl)))
            return "QUESTION_OPTION_INVALID";
        if (options.Select(Comparable).Distinct(StringComparer.Ordinal).Count() != options.Count)
            return "QUESTION_OPTION_DUPLICATE";
        return options.Any(IsOther) ? "QUESTION_OPTION_OTHER" : null;
    }

    /// <summary>True for a label that only means "something else": the product's own «چیز دیگر…» covers it.</summary>
    public static bool IsOther(string label)
    {
        var key = Comparable(label);
        return OtherLabels.Contains(key) || key.StartsWith("چیزدیگر", StringComparison.Ordinal) ||
            key.StartsWith("خودتبنویس", StringComparison.Ordinal);
    }

    /// <summary>
    /// A label reduced for comparison: lower case, Arabic yeh and kaf as Persian, and without spaces,
    /// zero-width joiners, tatweel and punctuation, so «چیز دیگر…» and «چیزِ دیگر؟» compare equal.
    /// </summary>
    private static string Comparable(string label)
    {
        var builder = new System.Text.StringBuilder(label.Length);
        foreach (var c in label.ToLowerInvariant())
        {
            if (char.IsWhiteSpace(c) || char.IsPunctuation(c) || char.IsSymbol(c) || char.IsControl(c) ||
                c is '\u200c' or '\u200d' or '\u0640' || char.GetUnicodeCategory(c) == System.Globalization.UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(c switch { '\u064a' or '\u0649' => '\u06cc', '\u0643' => '\u06a9', _ => c });
        }
        return builder.ToString();
    }

    /// <summary>
    /// What an answer says about its question for measurement (028 §2.5): the chosen positions and
    /// whether «چیز دیگر…» was written. Neither means UNANSWERED. Never the labels or the text.
    /// </summary>
    public static object AnswerCode(PlanningQuestion question, PlanningAnswer? answer) => new
    {
        kind = question.Kind ?? "UNKNOWN",
        chosen = answer?.Options ?? [],
        other = !string.IsNullOrEmpty(answer?.Text)
    };
}

// ---- Generator port ----

public sealed record PlanningGenerationRequest(
    Guid AttemptId,
    string Intention,
    PlanningContext Context,
    string? Fixture)
{
    /// <summary>The clarification turns already finished in this flow, oldest first.</summary>
    public IReadOnlyList<PlanningTurn> Turns { get; init; } = [];

    /// <summary>False once the turn budget is spent or the user chose to draft now.</summary>
    public bool AllowClarification { get; init; }

    public Guid UserId { get; init; }
}

/// <summary>The fingerprint is the context the output was actually produced from.</summary>
public sealed record PlanningGenerationResult(PlanningDraftContent? Draft, string ContextFingerprint)
{
    public string Outcome { get; init; } = PlanningOutcomes.Draft;

    public PlanningClarification? Clarification { get; init; }
}

/// <summary>A generation that ended without a usable result. The code is one a client may be shown.</summary>
public sealed class PlanningGenerationException(string failureCode) : Exception(failureCode)
{
    public string FailureCode { get; } = failureCode;
}

public static class PlanningFailureCodes
{
    public const string DraftInvalid = "DRAFT_INVALID";
    public const string ContextIntegrity = "CONTEXT_INTEGRITY";
    public const string ProviderError = "PROVIDER_ERROR";
    public const string GenerationTimeout = "GENERATION_TIMEOUT";
    public const string DraftCollision = "DRAFT_COLLISION";
    public const string AiUnavailable = "AI_UNAVAILABLE";
    public const string AiBudgetExhausted = "AI_BUDGET_EXHAUSTED";
    public const string ContextTooLarge = "CONTEXT_TOO_LARGE";
}

/// <summary>
/// Produces a draft proposal and nothing else. An implementation has no access to canonical state
/// beyond the context it is handed and cannot create or change anything.
/// </summary>
public interface IPlanningGenerator
{
    string Key { get; }

    Task<PlanningGenerationResult> GenerateAsync(PlanningGenerationRequest request,
        CancellationToken cancellationToken);
}
