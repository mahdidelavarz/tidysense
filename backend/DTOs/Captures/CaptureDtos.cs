using System.ComponentModel.DataAnnotations;
using TidySense.DTOs.Routines;

namespace TidySense.DTOs.Captures;

public sealed record CaptureDto(
    Guid Id,
    string Title,
    string Status,
    string Source,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ResolvedAt);

/// <summary>The resolved capture and the identity of the work record it produced.</summary>
public sealed record CaptureResolutionDto(CaptureDto Capture, Guid? TaskId, Guid? RoutineId);

public sealed record CreateCaptureRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title);

public sealed record ResolveCaptureToTaskRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    [StringLength(200, MinimumLength = 1)] string? Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline);

public sealed record ResolveCaptureToRoutineRequest(
    [Range(1, long.MaxValue)] long ExpectedVersion,
    [StringLength(200, MinimumLength = 1)] string? Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    [Required] RecurrenceDto Recurrence,
    [MaxLength(24)] IReadOnlyList<TimeOnly>? TimesOfDay,
    DateOnly? EffectiveFromLocalDate);

public sealed record DiscardCaptureRequest([Range(1, long.MaxValue)] long ExpectedVersion);
