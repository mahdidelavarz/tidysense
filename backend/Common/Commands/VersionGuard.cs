namespace TidySense.Common.Commands;

public static class VersionGuard
{
    public static void RequireMatch(Guid entityId, long expectedVersion, long currentVersion)
    {
        if (expectedVersion < 1) throw new ArgumentOutOfRangeException(nameof(expectedVersion));
        if (currentVersion != expectedVersion)
            throw new VersionConflictException(entityId, expectedVersion, currentVersion);
    }
}
