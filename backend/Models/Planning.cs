namespace TidySense.Models;

/// <summary>
/// One request to generate a planning draft. It preserves the user's input for retry and is
/// identified by a client-chosen id, so a reconnect or duplicate click never starts a second
/// generation.
/// </summary>
public sealed class PlanningAttempt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string ClientAttemptId { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public string Status { get; set; } = PlanningAttemptStatuses.Queued;
    public string Intention { get; set; } = string.Empty;
    public Guid? ContextGoalId { get; set; }
    public Guid? ContextProjectId { get; set; }
    public string GeneratorKey { get; set; } = string.Empty;
    public string ContextBuilderVersion { get; set; } = string.Empty;
    public string ContextFingerprint { get; set; } = string.Empty;
    // Categories and counts of what the generator was given; never the values themselves.
    public string ContextManifestJson { get; set; } = "{}";
    public string? FailureCode { get; set; }
    // What a succeeded attempt ended in: a draft, clarifying questions, or a blocked input.
    public string? Outcome { get; set; }
    public string? ClarificationJson { get; set; }
    // The clarification this attempt answers. A clarification is answered at most once.
    public Guid? PreviousAttemptId { get; set; }
    public int ClarificationTurn { get; set; }
    public bool DraftNow { get; set; }
    public string? AnswersJson { get; set; }
    public Guid? DraftId { get; set; }
    /// <summary>The planned week this attempt continues (029 §3); null for any other planning.</summary>
    public Guid? ContinuationOfWindowId { get; set; }
    /// <summary>
    /// The reviewable draft this attempt makes again (owner decision 2026-10-19, 013 §10): with the
    /// user's <see cref="Correction"/>, or as another version when it is null. The draft stays until
    /// the new one is stored.
    /// </summary>
    public Guid? RedoOfDraftId { get; set; }
    public string? Correction { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string RetentionClass { get; set; } = "R3";
}

/// <summary>
/// Operational metadata of one AI operation step: a physical provider call, or the reason no call
/// was made (sequence 0). It never holds a prompt, a response or any user text.
/// </summary>
public sealed class AiInvocation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? PlanningAttemptId { get; set; }
    public Guid? ReconcileExplanationId { get; set; }
    public string Family { get; set; } = string.Empty;
    public string ConfigurationKey { get; set; } = string.Empty;
    public string ProviderKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;
    public string SchemaVersion { get; set; } = string.Empty;
    public string ContextBuilderVersion { get; set; } = string.Empty;
    public string RepairPolicyVersion { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public int LatencyMs { get; set; }
    public int EstimatedInputTokens { get; set; }
    public int MaxOutputTokens { get; set; }
    public int? InputTokens { get; set; }
    public int? OutputTokens { get; set; }
    // Millionths of a US dollar, from the configured prices.
    public long EstimatedCostMicros { get; set; }
    public string Outcome { get; set; } = string.Empty;
    public string? FailureClass { get; set; }
    public string? Gate { get; set; }
    public string RepairRulesJson { get; set; } = "[]";
    public string? RetryReason { get; set; }
    public string ContextReduction { get; set; } = "NONE";
    public string RetentionClass { get; set; } = "R4";
}

public static class AiInvocationOutcomes
{
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
    public const string Rejected = "REJECTED";
    public const string Blocked = "BLOCKED";
    public const string Cancelled = "CANCELLED";
}

public static class PlanningAttemptStatuses
{
    public const string Queued = "QUEUED";
    public const string Running = "RUNNING";
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
    public const string Cancelled = "CANCELLED";
}

/// <summary>
/// A temporary, unapproved proposal. Its status describes only the draft's own lifecycle; whether
/// anything was created is answered by the linked confirmation and its command result.
/// </summary>
public sealed class PlanningDraft
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AttemptId { get; set; }
    public string Status { get; set; } = PlanningDraftStatuses.Reviewable;
    public int CurrentRevision { get; set; } = 1;
    public Guid? ContextGoalId { get; set; }
    public Guid? ContextProjectId { get; set; }
    public string SchemaVersion { get; set; } = string.Empty;
    public string ContextFingerprint { get; set; } = string.Empty;
    public Guid? LinkedConfirmationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public long Version { get; set; } = 1;
    public string RetentionClass { get; set; } = "R3";
    public ICollection<PlanningDraftRevision> Revisions { get; set; } = [];
}

public static class PlanningDraftStatuses
{
    public const string Reviewable = "REVIEWABLE";
    public const string Superseded = "SUPERSEDED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}

/// <summary>An immutable, complete snapshot of the draft. An edit adds a revision; it never patches one.</summary>
public sealed class PlanningDraftRevision
{
    public Guid Id { get; set; }
    public Guid DraftId { get; set; }
    public int Revision { get; set; }
    public string Origin { get; set; } = PlanningRevisionOrigins.Generated;
    public string ContentJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public PlanningDraft Draft { get; set; } = null!;
}

public static class PlanningRevisionOrigins
{
    public const string Generated = "GENERATED";
    public const string UserEdit = "USER_EDIT";
}

/// <summary>
/// A user-confirmed, structured detail that later planning windows need and that has no canonical
/// field of its own. It belongs to exactly one Goal or one standalone Project. It is planning
/// context, not a work entity.
/// </summary>
/// <summary>
/// One approved week of detailed work for a Goal or standalone Project (014 §4.4–§4.5, 029 §3): its
/// local dates, its place in the chain of weeks, and the decision taken about the next one. It holds
/// no work of its own, so it is not a plan (023 §3); the work is the Goal's Tasks and Routines.
/// </summary>
public sealed class PlanningWindow
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? ProjectId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    /// <summary>1 for the first approved week, then one more for each continuation.</summary>
    public int Week { get; set; } = 1;
    public Guid? PreviousWindowId { get; set; }
    public Guid SourceDraftId { get; set; }
    public string? Decision { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public long Version { get; set; } = 1;
    public string RetentionClass { get; set; } = "R1";
}

/// <summary>What became of the week after a planned window (014 §4.5, §5.6).</summary>
public static class PlanningWindowDecisions
{
    /// <summary>The next week was approved as proposed.</summary>
    public const string ContinueAsIs = "CONTINUE_AS_IS";
    /// <summary>The next week was approved after the person changed it.</summary>
    public const string Adjust = "ADJUST";
    /// <summary>«فعلاً نه»: no next week now; the Goal or Project stays as it is.</summary>
    public const string PauseOrStop = "PAUSE_OR_STOP";
    /// <summary>A new plan for the same Goal or Project was approved instead.</summary>
    public const string Replanned = "REPLANNED";
}

public sealed class PlanningFact
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? ProjectId { get; set; }
    public string FactType { get; set; } = string.Empty;
    public string Strength { get; set; } = string.Empty;
    public string ValueJson { get; set; } = "{}";
    public string Source { get; set; } = PlanningFactSources.UserConfirmedAiExtraction;
    public string Status { get; set; } = PlanningFactStatuses.Active;
    public Guid? SourcePlanningAttemptId { get; set; }
    public DateTimeOffset CapturedAt { get; set; }
    public DateTimeOffset LastConfirmedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ExpiredAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
    public long Version { get; set; } = 1;
    public string RetentionClass { get; set; } = "R1";
}

public static class PlanningFactStatuses
{
    public const string Active = "ACTIVE";
    public const string Expired = "EXPIRED";
    public const string Removed = "REMOVED";
}

public static class PlanningFactSources
{
    public const string UserExplicit = "USER_EXPLICIT";
    public const string UserConfirmedAiExtraction = "USER_CONFIRMED_AI_EXTRACTION";
}
