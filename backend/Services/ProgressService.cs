using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Data;
using TidySense.DTOs.Progress;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// Derives the progress of every Goal and Project of the current user from their Tasks and Routines. A Task
/// waits when an earlier step of its sequence is not completed, as in <see cref="TaskService"/>.
/// </summary>
public sealed class ProgressService(AppDbContext db, ICurrentUser currentUser, ApplicationDateService dates)
{
    private sealed record TaskRow(Guid Id, string Title, Guid? GoalId, Guid? ProjectId, string Status,
        DateOnly? PlannedDate, Guid? SequenceId, int? SequenceOrder, DateTimeOffset CreatedAt, long Version);

    private sealed record RoutineRow(string Title, Guid? GoalId, Guid? ProjectId, DateTimeOffset CreatedAt);

    public async Task<ProgressDto> GetAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId;
        var today = dates.Today;
        var goalIds = await db.Goals.AsNoTracking().Where(x => x.UserId == userId)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => x.Id).ToListAsync(cancellationToken);
        var projects = await db.Projects.AsNoTracking().Where(x => x.UserId == userId)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            .Select(x => new { x.Id, x.GoalId, x.Status }).ToListAsync(cancellationToken);
        var tasks = await db.Tasks.AsNoTracking().Where(x => x.UserId == userId)
            .Select(x => new TaskRow(x.Id, x.Title, x.GoalId, x.ProjectId, x.Status, x.PlannedDate,
                x.SequenceId, x.SequenceOrder, x.CreatedAt, x.Version))
            .ToListAsync(cancellationToken);
        var routines = await db.Routines.AsNoTracking()
            .Where(x => x.UserId == userId && x.Status == RoutineStatuses.Active)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            .Select(x => new RoutineRow(x.Title, x.GoalId, x.ProjectId, x.CreatedAt))
            .ToListAsync(cancellationToken);

        var unresolved = tasks.Where(x => x.SequenceId is not null && x.Status != TaskStatuses.Completed)
            .ToLookup(x => x.SequenceId!.Value);
        bool Waiting(TaskRow task) => task.Status == TaskStatuses.Active && task.SequenceId is { } sequence &&
            task.SequenceOrder is { } order && unresolved[sequence].Any(x => x.SequenceOrder < order);

        WorkProgressDto Work(IReadOnlyCollection<TaskRow> scope, IReadOnlyCollection<RoutineRow> scopeRoutines)
        {
            var open = scope.Where(x => x.Status == TaskStatuses.Active).ToArray();
            var next = open
                .OrderBy(x => x.PlannedDate is null).ThenBy(x => x.PlannedDate)
                .ThenBy(x => x.SequenceOrder ?? int.MaxValue).ThenBy(x => x.CreatedAt).ThenBy(x => x.Id)
                .Take(4)
                .Select(x => new NextTaskDto(x.Id, x.Title, x.ProjectId, x.PlannedDate, Waiting(x), x.Version))
                .ToArray();
            return new WorkProgressDto(
                scope.Count(x => x.Status != TaskStatuses.Dropped),
                scope.Count(x => x.Status == TaskStatuses.Completed),
                open.Length,
                open.Count(x => x.PlannedDate == today),
                open.Count(Waiting),
                scopeRoutines.Count,
                scopeRoutines.Take(3).Select(x => x.Title).ToArray(),
                next);
        }

        var projectProgress = projects.Select(project => new ProjectProgressDto(project.Id, Work(
            tasks.Where(x => x.ProjectId == project.Id).ToArray(),
            routines.Where(x => x.ProjectId == project.Id).ToArray()))).ToArray();
        var goalProgress = goalIds.Select(goalId =>
        {
            var under = projects.Where(x => x.GoalId == goalId).Select(x => x.Id).ToHashSet();
            return new GoalProgressDto(goalId,
                projects.Count(x => x.GoalId == goalId && x.Status == ParentStatuses.Active),
                Work(tasks.Where(x => x.GoalId == goalId || (x.ProjectId is { } p && under.Contains(p))).ToArray(),
                    routines.Where(x => x.GoalId == goalId || (x.ProjectId is { } p && under.Contains(p))).ToArray()));
        }).ToArray();
        return new ProgressDto(goalProgress, projectProgress);
    }
}
