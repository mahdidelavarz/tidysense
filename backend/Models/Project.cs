namespace TidySense.Models;

public sealed class Project
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? GoalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CompletionMeaning { get; set; }
    public string Status { get; set; } = ParentStatuses.Active;
    public DateOnly? TargetDate { get; set; }
    public DateOnly ReviewDate { get; set; }
    public string ReviewDateSource { get; set; } = ReviewDateSources.SystemDefault;
    public long Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? TerminalAt { get; set; }
    public string Source { get; set; } = CreationSources.Manual;
    public User User { get; set; } = null!;
    public Goal? Goal { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = [];
}
