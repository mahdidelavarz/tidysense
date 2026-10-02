namespace TidySense.Models;

public sealed class Routine
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ContinuationOfRoutineId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = RoutineStatuses.Active;
    public string RecurrenceDefinition { get; set; } = "{}";
    public string RecurrenceTimezone { get; set; } = string.Empty;
    public TimeOnly[] TimesOfDay { get; set; } = [];
    public DateOnly EffectiveFromLocalDate { get; set; }
    public DateOnly? EffectiveUntilLocalDate { get; set; }
    // Generation watermark: every eligible slot on or before this local date exists. Not user-visible state.
    public DateOnly? MaterializedThroughLocalDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? StoppedAt { get; set; }
    public string Source { get; set; } = CreationSources.Manual;
    public long Version { get; set; } = 1;
    public User User { get; set; } = null!;
    public Goal? Goal { get; set; }
    public Project? Project { get; set; }
    public Routine? ContinuationOf { get; set; }
    public ICollection<RoutineOccurrence> Occurrences { get; set; } = [];
}

public static class RoutineStatuses
{
    public const string Active = "ACTIVE";
    public const string Stopped = "STOPPED";

    public static bool IsKnown(string value) => value is Active or Stopped;
}
