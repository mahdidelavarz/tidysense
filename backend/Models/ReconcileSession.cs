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
