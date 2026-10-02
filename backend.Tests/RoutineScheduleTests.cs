using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class RoutineScheduleTests
{
    private static readonly RoutineRecurrence Daily = RoutineSchedule.Validate("DAILY", null, null);

    [Fact]
    public void Daily_recurrence_occurs_on_every_date()
    {
        Assert.True(RoutineSchedule.OccursOn(Daily, new DateOnly(2026, 10, 2)));
        Assert.True(RoutineSchedule.OccursOn(Daily, new DateOnly(2028, 2, 29)));
    }

    [Fact]
    public void Specific_weekdays_use_iso_day_numbers()
    {
        // 2026-10-03 is a Saturday (ISO 6); 2026-10-05 is a Monday (ISO 1).
        var recurrence = RoutineSchedule.Validate("SPECIFIC_WEEKDAYS", [6, 1], null);
        Assert.True(RoutineSchedule.OccursOn(recurrence, new DateOnly(2026, 10, 3)));
        Assert.False(RoutineSchedule.OccursOn(recurrence, new DateOnly(2026, 10, 4)));
        Assert.True(RoutineSchedule.OccursOn(recurrence, new DateOnly(2026, 10, 5)));
        Assert.Equal([1, 6], recurrence.DaysOfWeek);
    }

    [Fact]
    public void Monthly_recurrence_follows_the_persian_calendar_and_never_shifts_a_missing_day()
    {
        // 1 Farvardin 1405 is 2026-03-21. Farvardin has 31 days; Mehr (from 2026-09-23) has 30.
        var first = RoutineSchedule.Validate("MONTHLY_ON_DAY", null, 1);
        Assert.True(RoutineSchedule.OccursOn(first, new DateOnly(2026, 3, 21)));
        Assert.False(RoutineSchedule.OccursOn(first, new DateOnly(2026, 4, 1)));

        var thirtyFirst = RoutineSchedule.Validate("MONTHLY_ON_DAY", null, 31);
        Assert.True(RoutineSchedule.OccursOn(thirtyFirst, new DateOnly(2026, 4, 20)));
        var mehr = Enumerable.Range(0, 30).Select(x => new DateOnly(2026, 9, 23).AddDays(x));
        Assert.DoesNotContain(mehr, date => RoutineSchedule.OccursOn(thirtyFirst, date));

        // Esfand 1404 is not a leap month: it ends on day 29 (2026-03-20).
        var thirtieth = RoutineSchedule.Validate("MONTHLY_ON_DAY", null, 30);
        Assert.False(RoutineSchedule.OccursOn(thirtieth, new DateOnly(2026, 3, 20)));
        Assert.False(RoutineSchedule.OccursOn(thirtieth, new DateOnly(2026, 3, 21)));
    }

    [Theory]
    [InlineData("N_TIMES_PER_WEEK")]
    [InlineData("WEEKLY")]
    [InlineData("EVERY_N_HOURS")]
    [InlineData(null)]
    public void Unsupported_recurrence_is_rejected_not_converted(string? type) =>
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate(type, [1], null));

    [Fact]
    public void Recurrence_shape_is_validated_and_round_trips()
    {
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate("SPECIFIC_WEEKDAYS", [], null));
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate("SPECIFIC_WEEKDAYS", [1, 1], null));
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate("SPECIFIC_WEEKDAYS", [8], null));
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate("MONTHLY_ON_DAY", null, 32));
        Assert.Throws<ArgumentException>(() => RoutineSchedule.Validate("DAILY", [1], null));

        var monthly = RoutineSchedule.Validate("MONTHLY_ON_DAY", null, 5);
        var json = RoutineSchedule.Serialize(monthly);
        Assert.Contains("\"calendar\":\"PERSIAN\"", json);
        Assert.Equal(5, RoutineSchedule.Parse(json).DayOfMonth);
    }

    [Fact]
    public void Time_slots_are_unique_whole_minutes_in_ascending_order()
    {
        Assert.Equal([new TimeOnly(0, 0), new TimeOnly(8, 0), new TimeOnly(16, 0)],
            RoutineSchedule.NormalizeTimes([new TimeOnly(16, 0), new TimeOnly(0, 0), new TimeOnly(8, 0)]));
        Assert.Empty(RoutineSchedule.NormalizeTimes(null));
        Assert.Throws<ArgumentException>(() =>
            RoutineSchedule.NormalizeTimes([new TimeOnly(8, 0), new TimeOnly(8, 0), new TimeOnly(20, 0)]));
        Assert.Throws<ArgumentException>(() => RoutineSchedule.NormalizeTimes([new TimeOnly(8, 0, 30)]));
    }

    [Fact]
    public void Effective_range_is_inclusive_on_both_ends()
    {
        var from = new DateOnly(2026, 10, 2);
        var until = new DateOnly(2026, 10, 5);
        Assert.False(RoutineSchedule.IsEligible(from, until, from.AddDays(-1)));
        Assert.True(RoutineSchedule.IsEligible(from, until, from));
        Assert.True(RoutineSchedule.IsEligible(from, until, until));
        Assert.False(RoutineSchedule.IsEligible(from, until, until.AddDays(1)));
        Assert.True(RoutineSchedule.IsEligible(from, null, until.AddYears(5)));
        // A Routine stopped before it started has an empty range.
        Assert.False(RoutineSchedule.IsEligible(from, from.AddDays(-1), from));
    }

    [Fact]
    public void Untimed_routine_has_one_slot_and_timed_routine_one_per_time()
    {
        Assert.Equal([null], RoutineSchedule.SlotsFor([]));
        Assert.Equal([new TimeOnly(8, 0), new TimeOnly(20, 0)],
            RoutineSchedule.SlotsFor([new TimeOnly(8, 0), new TimeOnly(20, 0)]));
    }

    [Fact]
    public void Timed_slot_is_missed_when_the_next_slot_is_reached_or_the_day_ends()
    {
        var today = new DateOnly(2026, 10, 2);
        TimeOnly[] slots = [new(8, 0), new(16, 0)];
        Assert.False(RoutineSchedule.IsMissed(today, new TimeOnly(8, 0), slots, today, new TimeOnly(15, 59)));
        Assert.True(RoutineSchedule.IsMissed(today, new TimeOnly(8, 0), slots, today, new TimeOnly(16, 0)));
        // The last slot of the day has no later slot: only the day boundary resolves it.
        Assert.False(RoutineSchedule.IsMissed(today, new TimeOnly(16, 0), slots, today, new TimeOnly(23, 59)));
        Assert.True(RoutineSchedule.IsMissed(today, new TimeOnly(16, 0), slots, today.AddDays(1), new TimeOnly(0, 0)));
    }

    [Fact]
    public void Untimed_occurrence_is_missed_only_after_its_local_date_ends()
    {
        var today = new DateOnly(2026, 10, 2);
        Assert.False(RoutineSchedule.IsMissed(today, null, [], today, new TimeOnly(23, 59)));
        Assert.True(RoutineSchedule.IsMissed(today, null, [], today.AddDays(1), new TimeOnly(0, 0)));
        Assert.False(RoutineSchedule.IsMissed(today.AddDays(1), null, [], today, new TimeOnly(12, 0)));
    }

    [Fact]
    public void Midnight_slot_belongs_to_the_new_local_date()
    {
        // 20:30 UTC on 2 October is 00:00 on 3 October in Tehran (UTC+03:30).
        var now = LocalNow("Asia/Tehran", new DateTimeOffset(2026, 10, 2, 20, 30, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 10, 3), now.Date);
        Assert.Equal(new TimeOnly(0, 0), now.Time);
        TimeOnly[] slots = [new(0, 0), new(8, 0)];
        Assert.False(RoutineSchedule.IsMissed(now.Date, new TimeOnly(0, 0), slots, now.Date, now.Time));
        Assert.True(RoutineSchedule.IsMissed(now.Date.AddDays(-1), new TimeOnly(8, 0), slots, now.Date, now.Time));
    }

    [Fact]
    public void Slot_in_a_skipped_dst_hour_is_reached_when_the_wall_clock_passes_it()
    {
        // Berlin, 29 March 2026: 02:00 jumps to 03:00, so 02:30 never appears on the wall clock.
        var date = new DateOnly(2026, 3, 29);
        TimeOnly[] slots = [new(1, 0), new(2, 30), new(12, 0)];
        var before = LocalNow("Europe/Berlin", new DateTimeOffset(2026, 3, 29, 0, 59, 0, TimeSpan.Zero));
        Assert.Equal(new TimeOnly(1, 59), before.Time);
        Assert.False(RoutineSchedule.IsMissed(date, new TimeOnly(1, 0), slots, before.Date, before.Time));

        var after = LocalNow("Europe/Berlin", new DateTimeOffset(2026, 3, 29, 1, 0, 0, TimeSpan.Zero));
        Assert.Equal(new TimeOnly(3, 0), after.Time);
        Assert.True(RoutineSchedule.IsMissed(date, new TimeOnly(1, 0), slots, after.Date, after.Time));
        Assert.False(RoutineSchedule.IsMissed(date, new TimeOnly(2, 30), slots, after.Date, after.Time));
    }

    [Fact]
    public void Slot_in_a_repeated_dst_hour_is_reached_on_the_first_pass_and_stays_one_slot()
    {
        // Berlin, 25 October 2026: 03:00 falls back to 02:00, so 02:30 happens twice.
        var date = new DateOnly(2026, 10, 25);
        TimeOnly[] slots = [new(1, 0), new(2, 30)];
        var firstPass = LocalNow("Europe/Berlin", new DateTimeOffset(2026, 10, 25, 0, 30, 0, TimeSpan.Zero));
        var secondPass = LocalNow("Europe/Berlin", new DateTimeOffset(2026, 10, 25, 1, 30, 0, TimeSpan.Zero));
        Assert.Equal(new TimeOnly(2, 30), firstPass.Time);
        Assert.Equal(new TimeOnly(2, 30), secondPass.Time);
        Assert.True(RoutineSchedule.IsMissed(date, new TimeOnly(1, 0), slots, firstPass.Date, firstPass.Time));
        Assert.True(RoutineSchedule.IsMissed(date, new TimeOnly(1, 0), slots, secondPass.Date, secondPass.Time));
        Assert.Equal(2, RoutineSchedule.SlotsFor(slots).Count);
    }

    private static (DateOnly Date, TimeOnly Time) LocalNow(string timeZoneId, DateTimeOffset instant) =>
        new ApplicationDateService(
            Options.Create(new ApplicationTimeOptions { TimeZoneId = timeZoneId }),
            new FixedTimeProvider(instant)).LocalNow;

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
