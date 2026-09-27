using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Projects;

public sealed record CreateProjectRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? CompletionMeaning,
    Guid? GoalId,
    DateOnly? TargetDate,
    DateOnly? ReviewDate);
