namespace TidySense.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
    public int SessionEpoch { get; set; }
    public bool SetupComplete { get; set; }
    // The AI provider and notice version the user agreed to send their planning text to. Null: not agreed, or withdrawn.
    public string? AiConsentProvider { get; set; }
    public string? AiConsentNoticeVersion { get; set; }
    public DateTimeOffset? AiConsentAt { get; set; }
    public long AiConsentRevision { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public ICollection<Goal> Goals { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];
    public ICollection<TaskItem> Tasks { get; set; } = [];
    public ICollection<Routine> Routines { get; set; } = [];
    public ICollection<CaptureItem> Captures { get; set; } = [];
}
