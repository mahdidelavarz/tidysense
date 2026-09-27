namespace TidySense.Models;

public sealed class Goal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string DesiredOutcome { get; set; } = string.Empty;
    public string Status { get; set; } = ParentStatuses.Active;
    public DateOnly? TargetDate { get; set; }
    public DateOnly ReviewDate { get; set; }
    public string ReviewDateSource { get; set; } = ReviewDateSources.SystemDefault;
    public DateTimeOffset? LastContinuationDecisionAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? TerminalAt { get; set; }
    public string Source { get; set; } = CreationSources.Manual;
    public long Version { get; set; } = 1;
    public User User { get; set; } = null!;
    public ICollection<Project> Projects { get; set; } = [];
}
