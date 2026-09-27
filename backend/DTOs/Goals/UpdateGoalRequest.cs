using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Goals;

public sealed record UpdateGoalRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [Required, StringLength(2000, MinimumLength = 1)] string DesiredOutcome,
    DateOnly? TargetDate,
    DateOnly? ReviewDate,
    [Range(1, long.MaxValue)] long ExpectedVersion);
