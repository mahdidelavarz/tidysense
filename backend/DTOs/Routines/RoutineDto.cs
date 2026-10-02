namespace TidySense.DTOs.Routines;

/// <summary>DaysOfWeek are ISO numbers (Monday = 1 … Sunday = 7). DayOfMonth is a Persian-calendar day.</summary>
public sealed record RecurrenceDto(string Type, IReadOnlyList<int>? DaysOfWeek, int? DayOfMonth);

public sealed record RoutineDto(
    Guid Id,
    Guid? GoalId,
    Guid? ProjectId,
    Guid? ContinuationOfRoutineId,
    Guid? ContinuedByRoutineId,
    string Title,
    string? Description,
    string Status,
    RecurrenceDto Recurrence,
    IReadOnlyList<TimeOnly> TimesOfDay,
    string RecurrenceTimezone,
    DateOnly EffectiveFromLocalDate,
    DateOnly? EffectiveUntilLocalDate,
    string Source,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? StoppedAt);

public sealed record RoutineOccurrenceDto(
    Guid Id,
    Guid RoutineId,
    string RoutineTitle,
    DateOnly ScheduledLocalDate,
    TimeOnly? ScheduledLocalTime,
    string Status,
    DateTimeOffset? ResolvedAt,
    long Version);
