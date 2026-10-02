using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Routines;

public sealed record CreateRoutineRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    [Required] RecurrenceDto Recurrence,
    [MaxLength(24)] IReadOnlyList<TimeOnly>? TimesOfDay,
    DateOnly? EffectiveFromLocalDate);

public sealed record UpdateRoutineRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? Description,
    Guid? GoalId,
    Guid? ProjectId,
    [Required] RecurrenceDto Recurrence,
    [MaxLength(24)] IReadOnlyList<TimeOnly>? TimesOfDay,
    [Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record StopRoutineRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record CompleteOccurrenceRequest([Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record CorrectOccurrenceRequest(
    [Required, RegularExpression("^(DONE|MISSED)$")] string TargetStatus,
    [Range(1, long.MaxValue)] long ExpectedVersion);
