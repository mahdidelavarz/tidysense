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
    bool IsProtected = false);

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

public sealed record RestoreTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    DateOnly? PlannedDate);

public sealed record CarryTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    DateOnly PlannedDate);
