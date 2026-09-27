namespace TidySense.DTOs.Goals;

public sealed record GoalDto(
    Guid Id,
    string Title,
    string DesiredOutcome,
    string Status,
    DateOnly? TargetDate,
    DateOnly ReviewDate,
    string ReviewDateSource,
    DateTimeOffset? LastContinuationDecisionAt,
    string Source,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? TerminalAt);
