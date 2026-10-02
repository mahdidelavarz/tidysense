namespace TidySense.Models;

/// <summary>
/// A quick capture that is not yet a commitment. It is a supporting record, not a work entity:
/// resolving it creates a new Task or Routine with its own identity.
/// </summary>
public sealed class CaptureItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = CaptureStatuses.Unresolved;
    public string Source { get; set; } = CaptureSources.Manual;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public long Version { get; set; } = 1;
    public User User { get; set; } = null!;
}

public static class CaptureStatuses
{
    public const string Unresolved = "UNRESOLVED";
    public const string Resolved = "RESOLVED";
    public const string Discarded = "DISCARDED";

    public static bool IsKnown(string value) => value is Unresolved or Resolved or Discarded;
}

public static class CaptureSources
{
    public const string Manual = "MANUAL";
    public const string SystemMigrated = "SYSTEM_MIGRATED";
}
