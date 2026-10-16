using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Tasks;

public sealed record CreateTaskRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    Guid? SequenceId,
    [Range(1, int.MaxValue)] int? SequenceOrder,
    bool IsProtected = false,
    TaskFollowRequest? Follow = null);

/// <summary>
/// «بعد از…» on a new Task: it is created already following another, in the same command, while every
/// Task the preview named is unchanged (029 §9.2, 025 §16).
/// </summary>
public sealed record TaskFollowRequest(
    Guid PredecessorId,
    [Required, MaxLength(200)] IReadOnlyList<TaskVersionRefDto> ExpectedMembers);

/// <summary>What following <paramref name="PredecessorId"/> would do for a Task not yet created.</summary>
public sealed record NewTaskSequencePreviewRequest(
    Guid PredecessorId,
    Guid? GoalId,
    Guid? ProjectId,
    [StringLength(200)] string? Title);

public sealed record UpdateTaskRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    Guid? SequenceId,
    [Range(1, int.MaxValue)] int? SequenceOrder,
    [Range(1, long.MaxValue)] long ExpectedVersion,
    // Omitted means "leave as is", so clients written before protection existed cannot clear it.
    bool? IsProtected = null);

public sealed record CompleteTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    DateOnly CompletedForLocalDate);

public sealed record DropTaskRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record UndoCompleteTaskRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record RestoreTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    DateOnly? PlannedDate);

public sealed record CarryTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    DateOnly PlannedDate);

/// <summary>A change to a Task's place in a sequence (029 §9.2): FOLLOW (with the Task to follow), MOVE_EARLIER, MOVE_LATER or LEAVE.</summary>
public sealed record TaskSequenceRequest(
    [Required] string Action,
    Guid? PredecessorId);

/// <summary>
/// The change as previewed: the server applies it only while every Task the preview named is still at
/// the version shown; otherwise the preview is stale and must be asked for again.
/// </summary>
public sealed record ChangeTaskSequenceRequest(
    [Required] string Action,
    Guid? PredecessorId,
    [Required, MaxLength(200)] IReadOnlyList<TaskVersionRefDto> ExpectedMembers);

public sealed record TaskVersionRefDto(Guid TaskId, [Range(1, long.MaxValue)] long Version);
