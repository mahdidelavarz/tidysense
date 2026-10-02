using TidySense.DTOs.Today;

namespace TidySense.Services;

/// <summary>
/// Assembles the derived Today view. The local date and time are read once so Tasks and
/// Routine occurrences are always evaluated against the same local day.
/// </summary>
public sealed class TodayService(
    TaskService tasks,
    RoutineService routines,
    ApplicationDateService dates)
{
    public async Task<TodayDto> GetAsync(CancellationToken cancellationToken)
    {
        var localNow = dates.LocalNow;
        await routines.EvaluateAsync(localNow, cancellationToken);
        return new TodayDto(localNow.Date,
            await tasks.TodayTasksAsync(localNow.Date, cancellationToken),
            await routines.TodayOccurrencesAsync(localNow.Date, cancellationToken));
    }
}
