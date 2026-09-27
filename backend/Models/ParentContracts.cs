namespace TidySense.Models;

public static class ParentStatuses
{
    public const string Active = "ACTIVE";
    public const string Achieved = "ACHIEVED";
    public const string Abandoned = "ABANDONED";
    public const string Completed = "COMPLETED";
    public const string Stopped = "STOPPED";

    public static bool IsGoalTerminal(string value) => value is Achieved or Abandoned;
    public static bool IsProjectTerminal(string value) => value is Completed or Stopped;
}

public static class ReviewDateSources
{
    public const string User = "USER";
    public const string SystemDefault = "SYSTEM_DEFAULT";
    public const string MigratedDefault = "MIGRATED_DEFAULT";
}

public static class CreationSources
{
    public const string Manual = "MANUAL";
    public const string AiAssisted = "AI_ASSISTED";
    public const string SystemMigrated = "SYSTEM_MIGRATED";
}
