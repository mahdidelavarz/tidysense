namespace TidySense.DTOs.Projects;

public sealed record ProjectDto(
    Guid Id,
    string Title,
    string? Description,
    DateOnly? TargetDate,
    DateOnly ReviewDate,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
