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

/// <summary>
/// The local week (Saturday to Friday) of each active Routine: per day, how many slots are
/// scheduled and how many are done. Days up to today count the occurrences that exist; later
/// days count the slots the schedule will create. A read model only.
/// </summary>
public sealed record RoutineWeeksDto(DateOnly WeekStart, DateOnly Today, IReadOnlyList<RoutineWeekDto> Routines);

public sealed record RoutineWeekDto(Guid RoutineId, RecurrenceDto Recurrence, int SlotsPerDay,
    IReadOnlyList<RoutineWeekDayDto> Days);

public sealed record RoutineWeekDayDto(DateOnly LocalDate, int Scheduled, int Done);
