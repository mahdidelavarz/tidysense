namespace TidySense.Common.Commands;

public sealed class VersionConflictException(Guid entityId, long expectedVersion, long currentVersion)
    : Exception("The resource changed. Refresh before retrying.")
{
    public Guid EntityId { get; } = entityId;
    public long ExpectedVersion { get; } = expectedVersion;
    public long CurrentVersion { get; } = currentVersion;
}
