namespace TidySense.Models;

public sealed class TaskItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = TaskStatuses.Active;
    public DateOnly? PlannedDate { get; set; }
    public DateOnly? Deadline { get; set; }
    public Guid? SequenceId { get; set; }
    public int? SequenceOrder { get; set; }
    public DateOnly? CompletedForLocalDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? TerminalAt { get; set; }
    public string Source { get; set; } = CreationSources.Manual;
    public long Version { get; set; } = 1;
    public User User { get; set; } = null!;
    public Goal? Goal { get; set; }
    public Project? Project { get; set; }
}

public static class TaskStatuses
{
    public const string Active = "ACTIVE";
    public const string Completed = "COMPLETED";
    public const string Dropped = "DROPPED";

    public static bool IsKnown(string value) => value is Active or Completed or Dropped;
}
