using System.Globalization;
using System.Text.RegularExpressions;

namespace TidySense.Services.Ai;

/// <summary>
/// Checks the Persian dates a model wrote into its text (029 §6): a day that its month does not
/// have, or a weekday named beside a date that falls on another day. The model is given the
/// calendar and told to copy from it; this is how the gate knows it did. Pure.
/// </summary>
public static partial class PlanningTextDates
{
    private static readonly PersianCalendar Persian = new();
    private static readonly string[] Months =
        ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

    [GeneratedRegex(@"(?:(یک‌?شنبه|دوشنبه|سه[‌ ]?شنبه|چهارشنبه|پنج‌?شنبه|جمعه|شنبه)\s+)?(\d{1,2})\s+(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?![\p{L}])")]
    private static partial Regex WrittenDate();

    /// <summary>
    /// True when a text names a day its month does not have, or a weekday that is not the weekday of
    /// the nearest such date (from two months before today on).
    /// </summary>
    public static bool HasError(IEnumerable<string?> texts, DateOnly today)
    {
        var from = today.AddDays(-60).ToDateTime(TimeOnly.MinValue);
        var year = Persian.GetYear(today.ToDateTime(TimeOnly.MinValue));
        foreach (var text in texts)
        {
            if (string.IsNullOrEmpty(text)) continue;
            foreach (Match match in WrittenDate().Matches(LatinDigits(text)))
            {
                var day = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
                var month = Array.IndexOf(Months, match.Groups[3].Value) + 1;
                DateTime? date = null;
                foreach (var candidate in new[] { year - 1, year, year + 1 })
                    if (day >= 1 && day <= Persian.GetDaysInMonth(candidate, month) &&
                        Persian.ToDateTime(candidate, month, day, 0, 0, 0, 0) is var value && value >= from)
                    {
                        date = value;
                        break;
                    }
                if (date is null) return true;
                if (match.Groups[1].Success && Weekday(match.Groups[1].Value) != date.Value.DayOfWeek) return true;
            }
        }
        return false;
    }

    private static DayOfWeek Weekday(string name) => name.Replace(" ", "‌").Replace("‌", "") switch
    {
        "یکشنبه" => DayOfWeek.Sunday,
        "دوشنبه" => DayOfWeek.Monday,
        "سهشنبه" => DayOfWeek.Tuesday,
        "چهارشنبه" => DayOfWeek.Wednesday,
        "پنجشنبه" => DayOfWeek.Thursday,
        "جمعه" => DayOfWeek.Friday,
        _ => DayOfWeek.Saturday
    };

    private static string LatinDigits(string text) => string.Concat(text.Select(c => c switch
    {
        >= '۰' and <= '۹' => (char)('0' + (c - '۰')),
        >= '٠' and <= '٩' => (char)('0' + (c - '٠')),
        _ => c
    }));

    /// <summary>Every text of a draft a person reads.</summary>
    public static IEnumerable<string?> Of(PlanningDraftContent draft) =>
        new[] { draft.Summary }
            .Concat(draft.Assumptions.Select(x => x.Text))
            .Concat(draft.UnresolvedQuestions.Select(x => x.Text))
            .Concat(draft.Proposals.SelectMany(x => new[] { x.Title, x.Description, x.DesiredOutcome, x.CompletionMeaning }));

    /// <summary>Every text of a clarification a person reads.</summary>
    public static IEnumerable<string?> Of(PlanningClarification clarification) =>
        new[] { clarification.Message }
            .Concat(clarification.Questions.SelectMany(x => new[] { x.Text, x.Reason }.Concat(x.Options)));
}
