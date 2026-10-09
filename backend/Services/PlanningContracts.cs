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
    DateOnly? EffectiveFromLocalDate);

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
    IReadOnlyList<PlanningNote> UnresolvedQuestions);

public static class PlanningJson
{
    public const string SchemaVersion = "2026-10-03.1";
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

public sealed record PlanningContextProject(Guid Id, string Title, DateOnly? TargetDate);

public sealed record PlanningContextRoutine(Guid Id, string Title, Guid? ProjectId, PlanningRecurrence Recurrence);

public sealed record PlanningContextTask(
    Guid Id,
    string Title,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    IReadOnlyList<string> ReasonCodes);

/// <summary>What happened in the scope during the previous seven local days. Nothing older is supplied.</summary>
public sealed record PlanningPreviousWindow(
    DateOnly StartDate,
    DateOnly EndDate,
    IReadOnlyList<string> CompletedTaskTitles,
    int CompletedTaskCount,
    int CarriedTaskCount,
    int DroppedTaskCount,
    int RoutineDoneCount,
    int RoutineMissedCount);

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
    PlanningPreviousWindow? PreviousWindow)
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

public sealed record PlanningQuestion(string Id, string Text);

public sealed record PlanningAnswer(string QuestionId, string Text);

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
    public const int MaxQuestions = 3;
    public const int QuestionLength = 300;
    public const int MessageLength = 500;
    public const int AnswerLength = 500;

    [System.Text.RegularExpressions.GeneratedRegex("^[A-Za-z0-9_-]{1,40}$")]
    private static partial System.Text.RegularExpressions.Regex IdPattern();

    /// <summary>A clarification asks one to three distinct questions; a blocked input names a known reason and says why.</summary>
    public static bool IsValid(string outcome, PlanningClarification? value)
    {
        if (value is null || value.Message is { Length: > MessageLength }) return false;
        var questions = value.Questions ?? [];
        if (outcome == PlanningOutcomes.InputBlocked)
            return questions.Count == 0 && PlanningBlockReasons.IsKnown(value.BlockReason) &&
                !string.IsNullOrWhiteSpace(value.Message);
        return outcome == PlanningOutcomes.Clarification && value.BlockReason is null &&
            questions.Count is >= 1 and <= MaxQuestions &&
            questions.All(x => x.Id is not null && IdPattern().IsMatch(x.Id) &&
                x.Text is { Length: > 0 and <= QuestionLength } && !string.IsNullOrWhiteSpace(x.Text)) &&
            questions.Select(x => x.Id).Distinct(StringComparer.Ordinal).Count() == questions.Count;
    }
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
    public const string ConsentRequired = "AI_CONSENT_REQUIRED";
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
