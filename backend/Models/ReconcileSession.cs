namespace TidySense.Models;

/// <summary>
/// One bounded Reconcile interaction. It preserves what was observed when it opened; it is
/// never execution truth.
/// </summary>
public sealed class ReconcileSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = ReconcileSessionStatuses.Open;
    public string TriggerType { get; set; } = ReconcileTriggerTypes.Manual;
    public string RulesCatalogVersion { get; set; } = string.Empty;
    public DateOnly LocalDate { get; set; }
    public string Timezone { get; set; } = string.Empty;
    public int FactSnapshotVersion { get; set; } = 1;
    public bool DegradedMode { get; set; }
    public string Severity { get; set; } = ReconcileSeverities.None;
    public int ActionableBacklogCount { get; set; }
    public int? OldestUnresolvedAgeDays { get; set; }
    public int ReviewDueCount { get; set; }
    public int UnresolvedCaptureCount { get; set; }
    public DateTimeOffset OpenedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public long Version { get; set; } = 1;
    public string RetentionClass { get; set; } = "R2";
    public ICollection<ReconcileFact> Facts { get; set; } = [];
    public ICollection<RuleMatch> RuleMatches { get; set; } = [];
}

public sealed class ReconcileFact
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string FactType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string ObservedMetrics { get; set; } = "{}";
    public string[] ReasonCodes { get; set; } = [];
    public string EvidenceQuality { get; set; } = "SUFFICIENT";
    public int FactVersion { get; set; } = 1;
    public ReconcileSession Session { get; set; } = null!;
}

public sealed class RuleMatch
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string RuleId { get; set; } = string.Empty;
    public string RuleVersion { get; set; } = string.Empty;
    public Guid[] AffectedEntityIds { get; set; } = [];
    public DateTimeOffset MatchedAt { get; set; }
    public string[] AllowedActionTypes { get; set; } = [];
    public string[] ConsequenceCodes { get; set; } = [];
    public ReconcileSession Session { get; set; } = null!;
}

/// <summary>The user's choice about today's automatic Reconcile prompt. Presentation state only.</summary>
public sealed class ReconcilePrompt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string State { get; set; } = ReconcilePromptStates.Dismissed;
    public DateTimeOffset UpdatedAt { get; set; }
    public long Version { get; set; } = 1;
}

/// <summary>
/// The first time on a local date that Reconcile was eligible when the account looked. It exists so
/// that an eligible day on which no session was opened can be counted; it holds no fact about work.
/// </summary>
public sealed class ReconcileExposure
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string Severity { get; set; } = ReconcileSeverities.None;
    public DateTimeOffset FirstSeenAt { get; set; }
    public string RetentionClass { get; set; } = "R2";
}

public static class ReconcileSessionStatuses
{
    public const string Open = "OPEN";
    public const string Completed = "COMPLETED";
    public const string Abandoned = "ABANDONED";
    public const string Expired = "EXPIRED";
}

public static class ReconcileTriggerTypes
{
    public const string Manual = "MANUAL";
    public const string Prompt = "PROMPT";

    public static bool IsKnown(string value) => value is Manual or Prompt;
}

public static class ReconcileSeverities
{
    public const string None = "NONE";
    public const string Light = "LIGHT";
    public const string Medium = "MEDIUM";
    public const string Recovery = "RECOVERY";
}

public static class ReconcilePromptStates
{
    public const string NotPresented = "NOT_PRESENTED";
    public const string Dismissed = "DISMISSED";
    public const string Skipped = "SKIPPED";
}

/// <summary>
/// One optional AI explanation of a session's deterministic evidence. It is never evidence itself:
/// removing it leaves the session, its facts and its rule matches complete.
/// </summary>
public sealed class ReconcileExplanation
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = ReconcileExplanationStatuses.Running;
    public string ExplainerKey { get; set; } = string.Empty;
    public string ContextBuilderVersion { get; set; } = string.Empty;
    public string ContextFingerprint { get; set; } = string.Empty;
    public string ContextManifestJson { get; set; } = "{}";
    public string? Summary { get; set; }
    public string? FailureCode { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string RetentionClass { get; set; } = "R3";
    public ReconcileSession Session { get; set; } = null!;
    public ICollection<ReconcileRecommendation> Recommendations { get; set; } = [];
}

/// <summary>
/// A pointer from an explanation to one action the deterministic rules already allow for the
/// listed work. The disposition is the user's answer to the recommendation; whether anything
/// changed is answered only by the linked confirmation and its command result.
/// </summary>
public sealed class ReconcileRecommendation
{
    public Guid Id { get; set; }
    public Guid ExplanationId { get; set; }
    public Guid UserId { get; set; }
    public int Ordinal { get; set; }
    public string RuleId { get; set; } = string.Empty;
    public string RuleVersion { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public Guid? SequenceId { get; set; }
    public Guid[] TaskIds { get; set; } = [];
    public string EvidenceFingerprint { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    // What the deterministic rules had found about each unit when the recommendation was made.
    public string EvidenceJson { get; set; } = "[]";
    public string Disposition { get; set; } = ReconcileRecommendationDispositions.Pending;
    public DateTimeOffset? DisposedAt { get; set; }
    // The result of the latest command submitted from this recommendation. Acceptance never implies it succeeded.
    public Guid? ResultingCommandResultId { get; set; }
    public ReconcileExplanation ExplanationRecord { get; set; } = null!;
}

public static class ReconcileExplanationStatuses
{
    public const string Running = "RUNNING";
    public const string Ready = "READY";
    public const string Failed = "FAILED";
    public const string Cancelled = "CANCELLED";
}

public static class ReconcileRecommendationDispositions
{
    public const string Pending = "PENDING";
    public const string Accepted = "ACCEPTED";
    public const string AcceptedEdited = "ACCEPTED_EDITED";
    public const string Rejected = "REJECTED";
    public const string Cancelled = "CANCELLED";
    public const string ExpiredWithoutDecision = "EXPIRED_WITHOUT_DECISION";
}
