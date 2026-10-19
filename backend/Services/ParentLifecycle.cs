using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// What ending a Goal or Project does to the work under it, and a Project's state following its Tasks
/// (owner decisions 2026-10-19; Mind Map notes in 012 and 015):
/// <list type="bullet">
/// <item>Stopping a Goal or Project ends everything open under it: its Projects stop, its open Tasks are
/// dropped and its Routines stop. Done work stays done. The preview lists exactly this.</item>
/// <item>A Project is never completed by hand. With no open Task and at least one done, it completes
/// itself and its Routines stop; with an open Task again, it is active again. A stopped Project stays stopped.</item>
/// </list>
/// </summary>
internal static class ParentLifecycle
{
    /// <summary>
    /// The open work a stop of this Goal or Project ends, in a stable order. The preview shows exactly
    /// this, and the command reads it again under locks, so a change in between makes the preview stale.
    /// </summary>
    internal static async Task<List<TerminalCascadeDto>> StopCascadesAsync(AppDbContext context, Guid owner,
        Guid? goalId, Guid? projectId, CancellationToken cancellationToken)
    {
        var projects = goalId is { } goal
            ? await context.Projects.AsNoTracking()
                .Where(x => x.UserId == owner && x.GoalId == goal && x.Status == ParentStatuses.Active)
                .OrderBy(x => x.Id).ToListAsync(cancellationToken)
            : [];
        var projectIds = projectId is { } project ? [project] : projects.Select(x => x.Id).ToArray();
        var tasks = await context.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == TaskStatuses.Active &&
                ((x.ProjectId != null && projectIds.Contains(x.ProjectId.Value)) || (goalId != null && x.GoalId == goalId)))
            .OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var routines = await context.Routines.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == RoutineStatuses.Active &&
                ((x.ProjectId != null && projectIds.Contains(x.ProjectId.Value)) || (goalId != null && x.GoalId == goalId)))
            .OrderBy(x => x.Id).ToListAsync(cancellationToken);
        return
        [
            ..projects.Select(x => new TerminalCascadeDto("Project", x.Id, x.Title, ParentStatuses.Stopped, x.Version)),
            ..tasks.Select(x => new TerminalCascadeDto("Task", x.Id, x.Title, TaskStatuses.Dropped, x.Version)),
            ..routines.Select(x => new TerminalCascadeDto("Routine", x.Id, x.Title, RoutineStatuses.Stopped, x.Version))
        ];
    }

    /// <summary>
    /// Applies a confirmed stop's cascades, each row locked in the order every command locks them:
    /// Projects, then Tasks, then Routines. Returns one user event per changed child.
    /// </summary>
    internal static async Task<List<CascadeEvent>> ApplyStopAsync(AppDbContext context, Guid owner,
        IReadOnlyList<TerminalCascadeDto> cascades, DateOnly today, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var events = new List<CascadeEvent>();
        foreach (var item in cascades.Where(x => x.ResourceType == "Project"))
        {
            var project = await ProjectService.LockOwnedAsync(context, item.ResourceId, owner, cancellationToken);
            Unchanged(project.Version, project.Status == ParentStatuses.Active, item);
            project.Status = ParentStatuses.Stopped;
            project.TerminalAt = now;
            project.UpdatedAt = now;
            project.Version++;
            events.Add(new CascadeEvent("Project", project.Id, project.Version, ParentEventTypes.ProjectStopped, 2,
                JsonSerializer.Serialize(new { cause = ParentEndCauses.GoalStopped })));
        }
        foreach (var item in cascades.Where(x => x.ResourceType == "Task"))
        {
            var task = await TaskService.LockOwnedAsync(context, item.ResourceId, owner, cancellationToken);
            Unchanged(task.Version, task.Status == TaskStatuses.Active, item);
            TaskService.Drop(task, now);
            events.Add(new CascadeEvent("Task", task.Id, task.Version, TaskEventTypes.TaskDropped, 1, "{}"));
        }
        foreach (var item in cascades.Where(x => x.ResourceType == "Routine"))
        {
            var routine = await context.Routines.FromSqlInterpolated(
                    $"SELECT * FROM \"Routines\" WHERE \"Id\" = {item.ResourceId} AND \"UserId\" = {owner} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Routine", item.ResourceId);
            Unchanged(routine.Version, routine.Status == RoutineStatuses.Active, item);
            await RoutineService.StopAsync(context, routine, today, now, cancellationToken);
            events.Add(new CascadeEvent("Routine", routine.Id, routine.Version, RoutineEventTypes.RoutineStopped, 1,
                RoutineService.StoppedPayload(routine.ProjectId is null
                    ? RoutineStopCauses.GoalTerminal : RoutineStopCauses.ProjectTerminal)));
        }
        return events;
    }

    /// <summary>A child that changed after the preview was read makes the stop stale; nothing is applied.</summary>
    private static void Unchanged(long version, bool active, TerminalCascadeDto item)
    {
        if (!active || version != item.Version)
            throw new CommandConflictException("CONFIRMATION_STALE", "The terminal preview changed.");
    }

    /// <summary>
    /// After a command changed the Tasks of these Projects: a Project with no open Task and at least one
    /// done completes itself and its Routines stop; a completed one with an open Task is active again.
    /// The command's own changes are saved first, inside its transaction, so they count. The Projects
    /// must already be locked by the command (parents first).
    /// </summary>
    internal static async Task<List<CascadeEvent>> SettleProjectsAsync(AppDbContext context, Guid owner,
        IEnumerable<Guid?> projectIds, DateOnly today, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var events = new List<CascadeEvent>();
        var ids = projectIds.OfType<Guid>().Distinct().Order().ToArray();
        if (ids.Length == 0) return events;
        await context.SaveChangesAsync(cancellationToken);
        foreach (var id in ids)
        {
            var project = await ProjectService.LockOwnedAsync(context, id, owner, cancellationToken);
            var counts = await context.Tasks.AsNoTracking()
                .Where(x => x.UserId == owner && x.ProjectId == id && x.Status != TaskStatuses.Dropped)
                .GroupBy(x => x.Status).Select(x => new { Status = x.Key, Count = x.Count() })
                .ToListAsync(cancellationToken);
            var open = counts.Where(x => x.Status == TaskStatuses.Active).Sum(x => x.Count);
            var done = counts.Where(x => x.Status == TaskStatuses.Completed).Sum(x => x.Count);
            if (project.Status == ParentStatuses.Active && open == 0 && done > 0)
            {
                project.Status = ParentStatuses.Completed;
                project.TerminalAt = now;
                project.UpdatedAt = now;
                project.Version++;
                events.Add(new CascadeEvent("Project", id, project.Version, ParentEventTypes.ProjectCompleted, 2,
                    JsonSerializer.Serialize(new { cause = ParentEndCauses.Progress })));
                var routines = await context.Routines.FromSqlInterpolated(
                        $"SELECT * FROM \"Routines\" WHERE \"ProjectId\" = {id} AND \"UserId\" = {owner} AND \"Status\" = 'ACTIVE' ORDER BY \"Id\" FOR UPDATE")
                    .ToListAsync(cancellationToken);
                foreach (var routine in routines)
                {
                    await RoutineService.StopAsync(context, routine, today, now, cancellationToken);
                    events.Add(new CascadeEvent("Routine", routine.Id, routine.Version, RoutineEventTypes.RoutineStopped,
                        1, RoutineService.StoppedPayload(RoutineStopCauses.ProjectTerminal)));
                }
            }
            else if (project.Status == ParentStatuses.Completed && open > 0)
            {
                // Its Routines stopped with the completion and stay stopped; the user starts one again by hand.
                project.Status = ParentStatuses.Active;
                project.TerminalAt = null;
                project.UpdatedAt = now;
                project.Version++;
                events.Add(new CascadeEvent("Project", id, project.Version, ParentEventTypes.ProjectReopened, 1, "{}"));
            }
        }
        return events;
    }

    /// <summary>A Project's progress: its done Tasks of all that are not dropped. Routines do not count (owner decision).</summary>
    internal static async Task<Dictionary<Guid, (int Done, int Open)>> TaskProgressAsync(AppDbContext context,
        Guid owner, IReadOnlyCollection<Guid> projectIds, CancellationToken cancellationToken)
    {
        var rows = await context.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && x.ProjectId != null && projectIds.Contains(x.ProjectId.Value) &&
                x.Status != TaskStatuses.Dropped)
            .GroupBy(x => new { x.ProjectId, x.Status }).Select(x => new { x.Key.ProjectId, x.Key.Status, Count = x.Count() })
            .ToListAsync(cancellationToken);
        return projectIds.ToDictionary(id => id, id => (
            rows.Where(x => x.ProjectId == id && x.Status == TaskStatuses.Completed).Sum(x => x.Count),
            rows.Where(x => x.ProjectId == id && x.Status == TaskStatuses.Active).Sum(x => x.Count)));
    }
}
