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
    [MaxLength(PlanningClarificationRules.MaxQuestions)] IReadOnlyList<PlanningAnswer>? Answers = null,
    bool DraftNow = false,
    // «برنامهٔ هفتهٔ بعد»: plan the week after this planned one, in its Goal or Project (029 §3).
    Guid? ContinuationOfWindowId = null,
    // «اصلاح» or «نسخهٔ دیگر» on a reviewable draft (013 §10): the same flow made again.
    PlanningRedoRequest? Redo = null);

/// <summary>
/// Makes a reviewable draft again from its own flow (intention, answers and context), the revision the
/// user saw and, when given, what they want changed. Without a correction it asks for another version.
/// </summary>
public sealed record PlanningRedoRequest(
    Guid DraftId,
    [Range(1, int.MaxValue)] int ExpectedRevision,
    [StringLength(PlanningRedoRules.CorrectionLength)] string? Correction,
    // «روش دیگر»: the model reasons before it drafts. Without it the other way was the same steps
    // reworded (redo-different-2: 39% of Tasks kept or reworded; with reasoning, redo-different-3: 16%).
    bool DifferentWay = false);

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
    PlanningClarificationDto? Clarification = null,
    // The planned week this attempt continues (029 §3).
    Guid? ContinuationOfWindowId = null,
    // The draft this attempt makes again (013 §10); it stays reviewable until the new one is stored.
    Guid? RedoOfDraftId = null);

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
/// <c>RemovedItems</c> names what the generator proposed but could not make valid (029 §8).
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
    Guid? LinkedConfirmationId,
    IReadOnlyList<PlanningRemovedItem> RemovedItems,
    // For a continuation, the number of the week this draft plans (2 after the first week, …).
    int? ContinuationWeek = null,
    // The scope's active Projects a proposal may sit under (its ContextProjectId).
    IReadOnlyList<PlanningContextProjectDto>? ContextProjects = null,
    // The planned week this draft continues.
    Guid? ContinuationOfWindowId = null);

public sealed record PlanningContextProjectDto(Guid Id, string Title);

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
    bool UnderContext,
    Guid? ContextProjectId = null,
    // An existing Task this approval only gives a date (029 §3 follow-up).
    Guid? ExistingTaskId = null);

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
    int FactCount,
    // Existing Tasks the approval dated; they are not in TaskIds.
    IReadOnlyList<Guid>? DatedTaskIds = null);

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

/// <summary>How a planned week went, in counts (029 §3). Titles stay in the generation context.</summary>
public sealed record PlanningContinuationEvidenceDto(
    int CompletedTasks,
    int CarriedTasks,
    int DroppedTasks,
    int LeftTasks,
    int RoutineDone,
    int RoutineMissed);

/// <summary>A planned week whose next week can be planned now: «برنامهٔ هفتهٔ بعد» (029 §3).</summary>
public sealed record PlanningContinuationDto(
    Guid WindowId,
    int Week,
    string ScopeType,
    Guid ScopeId,
    string Title,
    DateOnly StartDate,
    DateOnly EndDate,
    DateOnly NextStartDate,
    DateOnly NextEndDate,
    PlanningContinuationEvidenceDto Evidence,
    long Version);

public sealed record DeclinePlanningContinuationRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record PlanningContinuationDecisionDto(Guid WindowId, string Decision, long Version);
