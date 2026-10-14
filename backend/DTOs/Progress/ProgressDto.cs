namespace TidySense.DTOs.Progress;

/// <summary>
/// How far each Goal and Project has come, for the Goals and Projects screens: counts of the work under it
/// and its next steps. A read model only, derived on every read.
/// </summary>
public sealed record ProgressDto(IReadOnlyList<GoalProgressDto> Goals, IReadOnlyList<ProjectProgressDto> Projects);

/// <summary>A Goal counts its own Tasks and Routines and those of every Project under it, whatever the Project's status.</summary>
public sealed record GoalProgressDto(
    Guid GoalId,
    int ActiveProjectCount,
    WorkProgressDto Work);

public sealed record ProjectProgressDto(
    Guid ProjectId,
    WorkProgressDto Work);

/// <summary>
/// Tasks: <c>TaskCount</c> excludes dropped ones and <c>DoneTaskCount</c> is the completed among them; open
/// Tasks are active, <c>TodayTaskCount</c> of them planned for today and <c>WaitingTaskCount</c> waiting for an
/// earlier step. <c>NextTasks</c> are up to four open Tasks in the order they come (planned date, then
/// sequence, then creation). Routines are the active ones, with up to three titles.
/// </summary>
public sealed record WorkProgressDto(
    int TaskCount,
    int DoneTaskCount,
    int OpenTaskCount,
    int TodayTaskCount,
    int WaitingTaskCount,
    int ActiveRoutineCount,
    IReadOnlyList<string> RoutineTitles,
    IReadOnlyList<NextTaskDto> NextTasks);

public sealed record NextTaskDto(Guid Id, string Title, Guid? ProjectId, DateOnly? PlannedDate, bool IsBlocked, long Version);
