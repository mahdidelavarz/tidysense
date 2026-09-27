using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Goals;

public sealed record CreateGoalRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [Required, StringLength(2000, MinimumLength = 1)] string DesiredOutcome,
    DateOnly? TargetDate,
    DateOnly? ReviewDate);
