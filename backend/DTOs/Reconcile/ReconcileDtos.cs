using System.ComponentModel.DataAnnotations;
using TidySense.DTOs.Captures;

namespace TidySense.DTOs.Reconcile;

public sealed record ReconcileCountsDto(
    int ActionableBacklogCount,
    int? OldestUnresolvedAgeDays,
    int RepeatedCarryTaskCount,
    int DeadlineRiskCount,
    int AffectedParentCount,
    int ReviewDueCount,
    int UnresolvedCaptureCount);

/// <summary>Enough to show the Today entry and the navigation badge without opening a session.</summary>
public sealed record ReconcileOverviewDto(
    DateOnly LocalDate,
    bool Eligible,
    string Severity,
    IReadOnlyList<string> TriggerReasons,
    ReconcileCountsDto Counts,
    int AttentionCount,
    string PromptState,
    bool ShowPrompt);

public sealed record ReconcileTaskRefDto(Guid Id, string Title, long Version, DateOnly? Deadline);

public sealed record ReconcileTaskItemDto(
    Guid TaskId,
    string Title,
    long Version,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    int? AgeDays,
    int CarryCount,
    bool IsProtected,
    bool IsBlocked,
    bool Actionable,
    IReadOnlyList<string> ReasonCodes,
    IReadOnlyList<string> RuleIds,
    IReadOnlyList<string> AllowedActions);

public sealed record ReconcileSequenceGroupDto(
    Guid SequenceId,
    IReadOnlyList<string> ReasonCodes,
    IReadOnlyList<string> RuleIds,
    IReadOnlyList<string> AllowedActions,
    ReconcileTaskRefDto? DroppedPredecessor,
    IReadOnlyList<ReconcileTaskItemDto> Items);

/// <summary>Execution lane grouping: owner, then sequence, then Task.</summary>
public sealed record ReconcileOwnerGroupDto(
    string OwnerType,
    Guid? OwnerId,
    string? OwnerTitle,
    IReadOnlyList<ReconcileSequenceGroupDto> Sequences,
    IReadOnlyList<ReconcileTaskItemDto> Tasks);

public sealed record ReconcileReviewItemDto(
    string EntityType,
    Guid Id,
    string Title,
    long Version,
    DateOnly ReviewDate,
    DateOnly? TargetDate,
    IReadOnlyList<string> AllowedActions,
    IReadOnlyList<ReconcileTaskRefDto> UndatedTasks);

public sealed record ReconcileRuleMatchDto(
    string RuleId,
    string RuleVersion,
    IReadOnlyList<Guid> AffectedEntityIds,
    IReadOnlyList<string> AllowedActions);

/// <summary>
/// A session with the current deterministic view. The stored session keeps what was observed
/// when it opened; the lanes are re-derived on every read so resolved items never linger.
/// </summary>
public sealed record ReconcileSessionDto(
    Guid Id,
    string Status,
    long Version,
    DateOnly LocalDate,
    string RulesCatalogVersion,
    DateTimeOffset OpenedAt,
    DateTimeOffset? CompletedAt,
    string OpenedSeverity,
    int OpenedActionableBacklogCount,
    string Severity,
    IReadOnlyList<string> TriggerReasons,
    ReconcileCountsDto Counts,
    IReadOnlyList<ReconcileOwnerGroupDto> ExecutionGroups,
    IReadOnlyList<ReconcileReviewItemDto> CommitmentReviews,
    IReadOnlyList<CaptureDto> Captures,
    IReadOnlyList<ReconcileRuleMatchDto> RuleMatches);

public sealed record OpenReconcileSessionRequest(
    [Required, RegularExpression("^(MANUAL|PROMPT)$")] string TriggerType);

public sealed record CompleteReconcileSessionRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record ResolveReconcilePromptRequest(
    [Required, RegularExpression("^(DISMISSED|SKIPPED)$")] string State);

public sealed record ReconcilePromptDto(DateOnly LocalDate, string State);

public sealed record CreateReconcilePreviewRequest(
    [Required, RegularExpression("^[A-Z_]+$")] string ActionType,
    [MaxLength(100)] IReadOnlyList<Guid>? TaskIds,
    Guid? SequenceId,
    DateOnly? PlannedDate,
    [MaxLength(100)] IReadOnlyList<Guid>? IncludeTaskIds);

public sealed record ReconcilePreviewItemDto(
    Guid TaskId,
    string Title,
    long ExpectedVersion,
    string Classification,
    DateOnly? CurrentPlannedDate,
    DateOnly? ResultingPlannedDate,
    string ResultingStatus);

/// <summary>The hash covers the warning's meaning, never its display text.</summary>
public sealed record ConfirmationWarningDto(
    string WarningId,
    string Code,
    IReadOnlyList<Guid> AffectedEntityIds,
    string WarningHash);

public sealed record ActionConfirmationDto(
    Guid Id,
    Guid ReconcileSessionId,
    string ActionType,
    string Status,
    bool CanApply,
    IReadOnlyList<ReconcilePreviewItemDto> Items,
    IReadOnlyList<ConfirmationWarningDto> Warnings,
    string PreviewHash,
    DateTimeOffset ExpiresAt);

public sealed record AcknowledgedWarningDto(
    [Required] string WarningId,
    [Required, RegularExpression("^[0-9A-Fa-f]{64}$")] string WarningHash);

public sealed record SubmitConfirmationRequest(
    [MaxLength(50)] IReadOnlyList<AcknowledgedWarningDto>? AcknowledgedWarnings);

public sealed record ConfirmationResultDto(
    Guid ConfirmationId,
    string Status,
    string ActionType,
    int AffectedCount);
