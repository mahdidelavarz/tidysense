namespace TidySense.DTOs.Tasks;

public sealed record TaskDependencyDto(Guid Id, string Title, string Status, long Version);

public sealed record TaskDto(
    Guid Id,
    Guid? GoalId,
    Guid? ProjectId,
    string Title,
    string? Description,
    string Status,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    Guid? SequenceId,
    int? SequenceOrder,
    bool IsBlocked,
    IReadOnlyList<TaskDependencyDto> BlockedBy,
    bool IsProtected,
    int CarryCount,
    DateOnly? CompletedForLocalDate,
    string Source,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? TerminalAt);
