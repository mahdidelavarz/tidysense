using System.ComponentModel.DataAnnotations;
using TidySense.DTOs.Reconcile;
using TidySense.Services;

namespace TidySense.DTOs.Planning;

/// <summary>
/// <c>ClientAttemptId</c> identifies the attempt: repeating it with the same request returns the
/// existing attempt instead of generating again. <c>ReplaceActive</c> is the explicit "start new
/// and discard the previous draft" choice. <c>PreviousAttemptId</c> answers the questions of that
/// attempt; the intention and the planning context are then taken from it. <c>DraftNow</c> asks
/// for a draft without further questions.
/// </summary>
public sealed record StartPlanningAttemptRequest(
    [Required, RegularExpression("^[A-Za-z0-9_-]{8,64}$")] string ClientAttemptId,
    [Required, StringLength(2000, MinimumLength = 1)] string Intention,
    Guid? GoalId,
    Guid? ProjectId,
    bool ReplaceActive,
    Guid? PreviousAttemptId = null,
    [MaxLength(3)] IReadOnlyList<PlanningAnswer>? Answers = null,
    bool DraftNow = false);

/// <summary>Questions to answer, or the reason the input cannot be planned and what to change.</summary>
public sealed record PlanningClarificationDto(
    IReadOnlyList<PlanningQuestion> Questions,
    string? BlockReason,
    string? Message,
    int Turn);

/// <summary>
/// A complete snapshot for polling. A succeeded attempt ended in a draft, in questions or in a
/// blocked input; a draft id is present only after a validated draft exists.
/// </summary>
public sealed record PlanningAttemptDto(
    Guid Id,
    string ClientAttemptId,
    string Status,
    string Intention,
    Guid? GoalId,
    Guid? ProjectId,
    string? FailureCode,
    Guid? DraftId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt,
    string? Outcome = null,
    PlanningClarificationDto? Clarification = null);

/// <summary>
/// The unfinished planning flow, if any: a running attempt, an unapproved draft, or questions
/// still waiting for an answer. <c>SampleGenerator</c> says drafts come from the built-in sample
/// generator, so the client never presents a sample as the work of a model.
/// </summary>
public sealed record PlanningActiveDto(PlanningAttemptDto? Attempt, PlanningDraftDto? Draft,
    PlanningAttemptDto? Clarification = null, bool SampleGenerator = false);

public sealed record PlanningContextRefDto(string Type, Guid Id, string Title);

public sealed record PlanningIssueDto(string Code, string Severity, string Origin);

public sealed record PlanningProposalViewDto(
    PlanningProposal Proposal,
    string State,
    bool ExcludedByAncestor,
    IReadOnlyList<PlanningIssueDto> Issues);

public sealed record PlanningFactViewDto(
    PlanningFactProposal Fact,
    string Category,
    string State,
    bool ExcludedByAncestor,
    IReadOnlyList<PlanningIssueDto> Issues);

public sealed record PlanningFirstWeekEntryDto(string DraftId, DateOnly Date);

/// <summary>
/// The current revision with its review states re-derived on every read. The status is the
/// draft's own lifecycle; a linked confirmation says nothing about whether anything was created.
/// </summary>
public sealed record PlanningDraftDto(
    Guid Id,
    Guid AttemptId,
    string Status,
    int Revision,
    DateTimeOffset ExpiresAt,
    PlanningContextRefDto? Context,
    string Summary,
    DateOnly WindowStart,
    DateOnly WindowEnd,
    IReadOnlyList<PlanningProposalViewDto> Proposals,
    IReadOnlyList<PlanningFactViewDto> Facts,
    IReadOnlyList<PlanningNote> Assumptions,
    IReadOnlyList<PlanningNote> UnresolvedQuestions,
    IReadOnlyList<PlanningIssueDto> DraftIssues,
    IReadOnlyList<PlanningFirstWeekEntryDto> FirstWeek,
    bool CanApply,
    Guid? LinkedConfirmationId);

/// <summary>
/// The full edited item lists of the revision being replaced. Identity, entity type, provenance
/// and fact type are taken from the stored revision; everything else is the user's edit.
/// </summary>
public sealed record RevisePlanningDraftRequest(
    [Range(1, int.MaxValue)] int ExpectedRevision,
    [Required, MaxLength(20)] IReadOnlyList<PlanningProposal> Proposals,
    [Required, MaxLength(10)] IReadOnlyList<PlanningFactProposal> Facts);

public sealed record PlanningDraftRevisionRequest([Range(1, int.MaxValue)] int ExpectedRevision);

public sealed record PlanningPreviewItemDto(
    string DraftId,
    string EntityType,
    string Title,
    string? ParentDraftId,
    bool UnderContext);

public sealed record PlanningPreviewFactDto(string DraftId, string FactType, string Strength);

/// <summary>The hash covers the warning's meaning, never its display text.</summary>
public sealed record PlanningWarningDto(
    string WarningId,
    string Code,
    IReadOnlyList<string> AffectedDraftIds,
    string WarningHash);

public sealed record PlanningApplyResultDto(
    Guid ConfirmationId,
    string Status,
    Guid? GoalId,
    IReadOnlyList<Guid> ProjectIds,
    IReadOnlyList<Guid> TaskIds,
    IReadOnlyList<Guid> RoutineIds,
    int FactCount);

/// <summary>
/// Exactly what one confirmation will create. The result is present only once the command has
/// succeeded; until then nothing has been created, whatever the status says.
/// </summary>
public sealed record PlanningConfirmationDto(
    Guid Id,
    Guid DraftId,
    int Revision,
    string Status,
    IReadOnlyList<PlanningPreviewItemDto> Items,
    IReadOnlyList<PlanningPreviewFactDto> Facts,
    IReadOnlyList<PlanningWarningDto> Warnings,
    bool NoFactsRemembered,
    string PreviewHash,
    DateTimeOffset ExpiresAt,
    PlanningApplyResultDto? Result);

public sealed record SubmitPlanningConfirmationRequest(
    [MaxLength(50)] IReadOnlyList<AcknowledgedWarningDto>? AcknowledgedWarnings);

public sealed record PlanningFactDto(
    Guid Id,
    Guid? GoalId,
    Guid? ProjectId,
    string FactType,
    string Category,
    string Strength,
    PlanningFactValue Value,
    string Source,
    string Status,
    long Version,
    DateTimeOffset CapturedAt,
    DateTimeOffset LastConfirmedAt);

public sealed record RemovePlanningFactRequest([Range(1, long.MaxValue)] long ExpectedVersion);
