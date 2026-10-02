namespace TidySense.Models;

public sealed class RoutineOccurrence
{
    public Guid Id { get; set; }
    public Guid RoutineId { get; set; }
    public DateOnly ScheduledLocalDate { get; set; }
    public TimeOnly? ScheduledLocalTime { get; set; }
    public string Status { get; set; } = OccurrenceStatuses.Pending;
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public long Version { get; set; } = 1;
    public Routine Routine { get; set; } = null!;
}

public static class OccurrenceStatuses
{
    public const string Pending = "PENDING";
    public const string Done = "DONE";
    public const string Missed = "MISSED";
}
