namespace TidySense.DTOs.Projects;

public sealed record ProjectDto(
    Guid Id,
    Guid? GoalId,
    string Title,
    string? CompletionMeaning,
    string Status,
    DateOnly? TargetDate,
    DateOnly ReviewDate,
    string ReviewDateSource,
    string Source,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? TerminalAt);
