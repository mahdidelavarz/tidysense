namespace TidySense.Services;

public static class PlanningFactStrengths
{
    public const string Hard = "HARD";
    public const string Soft = "SOFT";
    public const string Informational = "INFORMATIONAL";
}

public static class PlanningFactTypes
{
    public const string UnavailableWeekday = "UNAVAILABLE_WEEKDAY";
    public const string UnavailableDate = "UNAVAILABLE_DATE";
    public const string UnavailableDateRange = "UNAVAILABLE_DATE_RANGE";
    public const string AvailableDevice = "AVAILABLE_DEVICE";
    public const string CurrentLevel = "CURRENT_LEVEL";
    public const string LearningFocus = "LEARNING_FOCUS";
    public const string ExcludedPath = "EXCLUDED_PATH";
}

/// <summary>
/// The closed, versioned vocabulary of planning details. Category is derived from the type and is
/// never stored. Only the three availability types can be HARD, because only they can be checked
/// deterministically against a proposed date. None of these types has a canonical field, so none
/// duplicates one; anything with a canonical home (target date, deadline, a Routine's own
/// recurrence) is simply not a fact type.
/// </summary>
public static class PlanningFactCatalog
{
    public const string Version = "2026-10-03.1";
    public const int MaxTextLength = 120;

    private static readonly Dictionary<string, (string Category, bool HardAllowed)> Types =
        new(StringComparer.Ordinal)
        {
            [PlanningFactTypes.UnavailableWeekday] = ("AVAILABILITY", true),
            [PlanningFactTypes.UnavailableDate] = ("AVAILABILITY", true),
            [PlanningFactTypes.UnavailableDateRange] = ("AVAILABILITY", true),
            [PlanningFactTypes.AvailableDevice] = ("RESOURCE", false),
            [PlanningFactTypes.CurrentLevel] = ("STARTING_STATE", false),
            [PlanningFactTypes.LearningFocus] = ("PREFERENCE", false),
            [PlanningFactTypes.ExcludedPath] = ("INTENT", false)
        };

    public static bool IsKnown(string? factType) => factType is not null && Types.ContainsKey(factType);

    public static string Category(string factType) => Types[factType].Category;

    /// <summary>Keeps only the field the type owns, in canonical form. Returns null when the value is not valid for the type.</summary>
    public static PlanningFactValue? Normalize(string factType, PlanningFactValue? value)
    {
        if (value is null) return null;
        switch (factType)
        {
            case PlanningFactTypes.UnavailableWeekday:
                if (value.Weekdays is not { Count: > 0 } days || days.Any(x => x is < 1 or > 7) ||
                    days.Distinct().Count() != days.Count) return null;
                return new PlanningFactValue(days.Order().ToArray(), null, null, null, null);
            case PlanningFactTypes.UnavailableDate:
                return value.LocalDate is { } date ? new PlanningFactValue(null, date, null, null, null) : null;
            case PlanningFactTypes.UnavailableDateRange:
                return value.StartLocalDate is { } start && value.EndLocalDate is { } end && start <= end
                    ? new PlanningFactValue(null, null, start, end, null)
                    : null;
            default:
                var text = value.Text?.Trim();
                return text is { Length: > 0 and <= MaxTextLength }
                    ? new PlanningFactValue(null, null, null, null, text)
                    : null;
        }
    }

    public static bool IsStrengthAllowed(string factType, string? strength) => strength switch
    {
        PlanningFactStrengths.Hard => Types[factType].HardAllowed,
        PlanningFactStrengths.Soft => true,
        PlanningFactStrengths.Informational => !Types[factType].HardAllowed,
        _ => false
    };

    /// <summary>Two facts with the same key say the same thing; the second one is a duplicate.</summary>
    public static string Key(string factType, PlanningFactValue value) =>
        $"{factType}|{PlanningJson.Serialize(value)}";

    /// <summary>A date-bounded fact has run out once its last local date has ended. Other facts never run out by themselves.</summary>
    public static bool HasPassed(string factType, PlanningFactValue value, DateOnly today) => factType switch
    {
        PlanningFactTypes.UnavailableDate => value.LocalDate < today,
        PlanningFactTypes.UnavailableDateRange => value.EndLocalDate < today,
        _ => false
    };
}
