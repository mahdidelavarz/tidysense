using System.Globalization;
using System.Text.Json;

namespace TidySense.Services;

public static class RecurrenceTypes
{
    public const string Daily = "DAILY";
    public const string SpecificWeekdays = "SPECIFIC_WEEKDAYS";
    public const string MonthlyOnDay = "MONTHLY_ON_DAY";
}

/// <summary>DaysOfWeek are ISO numbers (Monday = 1 … Sunday = 7). DayOfMonth is a Persian-calendar day.</summary>
public sealed record RoutineRecurrence(string Type, IReadOnlyList<int> DaysOfWeek, int? DayOfMonth);

/// <summary>
/// Deterministic local-calendar scheduling rules. Everything here works on local dates and
/// wall-clock times, never on instants, so a DST shift cannot move, duplicate or drop a slot:
/// a slot inside a skipped hour is reached once the wall clock passes it, and a slot inside a
/// repeated hour is reached the first time.
/// </summary>
public static class RoutineSchedule
{
    public const int MaxTimesOfDay = 24;
    private const string PersianCalendarName = "PERSIAN";
    private static readonly PersianCalendar Persian = new();

    public static RoutineRecurrence Validate(string? type, IReadOnlyList<int>? daysOfWeek, int? dayOfMonth)
    {
        switch (type)
        {
            case RecurrenceTypes.Daily:
                if (daysOfWeek is { Count: > 0 } || dayOfMonth is not null)
                    throw new ArgumentException("DAILY recurrence takes no day selection.");
                return new RoutineRecurrence(RecurrenceTypes.Daily, [], null);
            case RecurrenceTypes.SpecificWeekdays:
                if (dayOfMonth is not null || daysOfWeek is not { Count: > 0 } ||
                    daysOfWeek.Any(x => x is < 1 or > 7) || daysOfWeek.Distinct().Count() != daysOfWeek.Count)
                    throw new ArgumentException("SPECIFIC_WEEKDAYS requires unique daysOfWeek between 1 and 7.");
                return new RoutineRecurrence(RecurrenceTypes.SpecificWeekdays, daysOfWeek.Order().ToArray(), null);
            case RecurrenceTypes.MonthlyOnDay:
                if (daysOfWeek is { Count: > 0 } || dayOfMonth is not (>= 1 and <= 31))
                    throw new ArgumentException("MONTHLY_ON_DAY requires dayOfMonth between 1 and 31.");
                return new RoutineRecurrence(RecurrenceTypes.MonthlyOnDay, [], dayOfMonth);
            default:
                throw new ArgumentException("recurrence type is not supported.");
        }
    }

    public static string Serialize(RoutineRecurrence recurrence) => recurrence.Type switch
    {
        RecurrenceTypes.SpecificWeekdays =>
            JsonSerializer.Serialize(new { type = recurrence.Type, daysOfWeek = recurrence.DaysOfWeek }),
        RecurrenceTypes.MonthlyOnDay =>
            JsonSerializer.Serialize(new { type = recurrence.Type, calendar = PersianCalendarName, dayOfMonth = recurrence.DayOfMonth }),
        _ => JsonSerializer.Serialize(new { type = recurrence.Type })
    };

    public static RoutineRecurrence Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var type = root.GetProperty("type").GetString();
        var days = root.TryGetProperty("daysOfWeek", out var daysElement)
            ? daysElement.EnumerateArray().Select(x => x.GetInt32()).ToArray() : null;
        int? dayOfMonth = root.TryGetProperty("dayOfMonth", out var dayElement) ? dayElement.GetInt32() : null;
        return Validate(type, days, dayOfMonth);
    }

    /// <summary>Unique minute-precision local slots in ascending order. Duplicates are invalid, not merged.</summary>
    public static TimeOnly[] NormalizeTimes(IReadOnlyList<TimeOnly>? times)
    {
        if (times is null || times.Count == 0) return [];
        if (times.Count > MaxTimesOfDay) throw new ArgumentException("timesOfDay has too many slots.");
        if (times.Any(x => x.Second != 0 || x.Millisecond != 0 || x.Ticks % TimeSpan.TicksPerMinute != 0))
            throw new ArgumentException("timesOfDay must use whole minutes.");
        if (times.Distinct().Count() != times.Count)
            throw new ArgumentException("timesOfDay must not contain duplicate slots.");
        return times.Order().ToArray();
    }

    public static bool OccursOn(RoutineRecurrence recurrence, DateOnly date) => recurrence.Type switch
    {
        RecurrenceTypes.Daily => true,
        RecurrenceTypes.SpecificWeekdays => recurrence.DaysOfWeek.Contains(IsoDayOfWeek(date)),
        // A Persian month without this day produces no occurrence; the day is never shifted.
        RecurrenceTypes.MonthlyOnDay =>
            Persian.GetDayOfMonth(date.ToDateTime(TimeOnly.MinValue)) == recurrence.DayOfMonth,
        _ => false
    };

    /// <summary>The effective range is inclusive on both ends.</summary>
    public static bool IsEligible(DateOnly effectiveFrom, DateOnly? effectiveUntil, DateOnly date) =>
        date >= effectiveFrom && (effectiveUntil is null || date <= effectiveUntil);

    /// <summary>One untimed slot when no times are defined, otherwise one slot per local time.</summary>
    public static IReadOnlyList<TimeOnly?> SlotsFor(IReadOnlyList<TimeOnly> timesOfDay) =>
        timesOfDay.Count == 0 ? [null] : timesOfDay.Select(x => (TimeOnly?)x).ToArray();

    /// <summary>
    /// A pending occurrence is missed once its local date has ended, or, for a timed slot, once
    /// a later slot of the same Routine on the same date has been reached. No grace period.
    /// </summary>
    public static bool IsMissed(DateOnly scheduledDate, TimeOnly? scheduledTime,
        IEnumerable<TimeOnly> sameDaySlots, DateOnly today, TimeOnly now)
    {
        if (scheduledDate < today) return true;
        if (scheduledDate > today || scheduledTime is not { } time) return false;
        return sameDaySlots.Any(x => x > time && x <= now);
    }

    public static int IsoDayOfWeek(DateOnly date) => ((int)date.DayOfWeek + 6) % 7 + 1;
}
