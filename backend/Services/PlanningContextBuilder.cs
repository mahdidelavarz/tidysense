using System.Text;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// Rebuilds the bounded input of one planning generation from current product state: the scope,
/// its confirmed planning details, its active work, the previous window and the local date (023 §15).
/// A continuation (029 §3) plans the week after a planned one, from that week's own evidence.
/// Nothing outside the scope, nothing older, and no conversation is ever supplied.
/// </summary>
public sealed class PlanningContextBuilder(AppDbContext db, ApplicationDateService dates)
{
    public const string Version = "2026-10-16.3";
    public const int MaxUnfinishedTasks = 30;
    public const int MaxRoutines = 20;
    public const int MaxProjects = 20;
    public const int MaxCompletedTitles = 15;
    public const int MaxLeftTitles = 15;

    public async Task<PlanningContext> BuildAsync(Guid owner, Guid? goalId, Guid? projectId,
        CancellationToken cancellationToken, PlanningWindow? continuing = null)
    {
        var today = dates.Today;
        var (windowStart, windowEnd) = continuing is null
            ? (today, today.AddDays(PlanningLimits.HorizonDays - 1))
            : PlanningContinuationRules.NextWindow(continuing, today);
        var scope = await ScopeAsync(db, owner, goalId, projectId, true, cancellationToken);
        if (scope is null)
            return Seal(new PlanningContext(Version, today, dates.TimeZoneId, windowStart, windowEnd, null,
                [], [], [], [], null));

        var facts = await ActiveFactsAsync(db, owner, scope, today, cancellationToken);
        var projects = scope.Type == PlanningContextTypes.Goal
            ? await db.Projects.AsNoTracking()
                .Where(x => x.UserId == owner && x.GoalId == scope.Id && x.Status == ParentStatuses.Active)
                .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Take(MaxProjects).ToListAsync(cancellationToken)
            : [];
        var projectIds = scope.Type == PlanningContextTypes.Goal
            ? projects.Select(x => x.Id).ToArray() : [scope.Id];
        Guid? directGoalId = scope.Type == PlanningContextTypes.Goal ? scope.Id : null;

        var routines = await db.Routines.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == RoutineStatuses.Active &&
                ((x.ProjectId != null && projectIds.Contains(x.ProjectId.Value)) ||
                 (directGoalId != null && x.GoalId == directGoalId)))
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Take(MaxRoutines).ToListAsync(cancellationToken);
        var tasks = db.Tasks.AsNoTracking().Where(x => x.UserId == owner &&
            ((x.ProjectId != null && projectIds.Contains(x.ProjectId.Value)) ||
             (directGoalId != null && x.GoalId == directGoalId)));
        // Dated work first, oldest first, so a cap never hides what is already due.
        var unfinished = await tasks.Where(x => x.Status == TaskStatuses.Active)
            .OrderBy(x => x.PlannedDate == null).ThenBy(x => x.PlannedDate).ThenBy(x => x.CreatedAt)
            .ThenBy(x => x.Id).Take(MaxUnfinishedTasks).ToListAsync(cancellationToken);
        var signals = await TaskHistory.LoadAsync(db, owner, unfinished.Select(x => x.Id).ToArray(),
            cancellationToken);
        // The earlier open steps each unfinished Task still waits for (025): a sequence the next week must respect.
        var sequenceIds = unfinished.Where(x => x.SequenceId != null).Select(x => x.SequenceId!.Value).Distinct().ToArray();
        var sequenceSteps = await db.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && x.SequenceId != null && sequenceIds.Contains(x.SequenceId.Value) &&
                x.Status != TaskStatuses.Completed)
            .Select(x => new { x.SequenceId, x.SequenceOrder, x.Title }).ToListAsync(cancellationToken);
        string[] WaitsFor(TaskItem task) => task.SequenceId is null ? [] : sequenceSteps
            .Where(x => x.SequenceId == task.SequenceId && x.SequenceOrder < task.SequenceOrder)
            .OrderBy(x => x.SequenceOrder).Select(x => x.Title).ToArray();

        var (previousStart, previousEnd) = continuing is null
            ? (today.AddDays(-PlanningLimits.HorizonDays), today.AddDays(-1))
            : PlanningContinuationRules.EvidenceWindow(continuing, today);
        var completed = await tasks.Where(x => x.Status == TaskStatuses.Completed &&
                x.CompletedForLocalDate >= previousStart && x.CompletedForLocalDate <= previousEnd)
            .OrderBy(x => x.CompletedForLocalDate).ThenBy(x => x.Id).Select(x => x.Title)
            .ToListAsync(cancellationToken);
        // The window is local; the instant bounds are padded by a day and narrowed in memory.
        var since = new DateTimeOffset(previousStart.AddDays(-1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var dropped = (await tasks.Where(x => x.Status == TaskStatuses.Dropped && x.TerminalAt >= since)
                .Select(x => x.TerminalAt!.Value).ToListAsync(cancellationToken))
            .Count(x => InWindow(dates.LocalDateOf(x)));
        var scopeTaskIds = tasks.Select(x => x.Id);
        // A Carry taken back in Reconcile (027 §6) is not counted.
        var undoneCarries = db.DomainEvents.Where(x => x.UserId == owner &&
            x.EventType == TaskEventTypes.TaskCarryUndone && x.CausationId != null).Select(x => x.CausationId!.Value);
        var carried = (await db.DomainEvents.AsNoTracking()
                .Where(x => x.UserId == owner && x.AggregateType == "Task" &&
                    x.EventType == TaskEventTypes.TaskCarried && x.OccurredAt >= since &&
                    scopeTaskIds.Contains(x.AggregateId) && !undoneCarries.Contains(x.EventId))
                .Select(x => new { x.AggregateId, x.OccurredAt }).ToListAsync(cancellationToken))
            .Where(x => InWindow(dates.LocalDateOf(x.OccurredAt))).Select(x => x.AggregateId).Distinct().Count();
        var routineIds = routines.Select(x => x.Id).ToArray();
        var occurrences = await db.RoutineOccurrences.AsNoTracking()
            .Where(x => routineIds.Contains(x.RoutineId) && x.ScheduledLocalDate >= previousStart &&
                x.ScheduledLocalDate <= previousEnd && x.Status != OccurrenceStatuses.Pending)
            .GroupBy(x => new { x.RoutineId, x.Status }).Select(x => new { x.Key.RoutineId, x.Key.Status, Count = x.Count() })
            .ToListAsync(cancellationToken);
        int Slots(Guid? routine, string status) => occurrences
            .Where(x => (routine == null || x.RoutineId == routine) && x.Status == status).Sum(x => x.Count);
        // Planned inside the window and still open: what the next week has to absorb or let go.
        var left = await tasks.Where(x => x.Status == TaskStatuses.Active && x.PlannedDate >= previousStart &&
                x.PlannedDate <= previousEnd)
            .OrderBy(x => x.PlannedDate).ThenBy(x => x.Id).Select(x => x.Title).ToListAsync(cancellationToken);
        var refs = projects.Select((x, index) => (x.Id, Ref: $"P{index + 1}")).ToDictionary(x => x.Id, x => x.Ref);

        return Seal(new PlanningContext(Version, today, dates.TimeZoneId, windowStart, windowEnd, scope, facts,
            projects.Select(x => new PlanningContextProject(x.Id, x.Title, x.TargetDate, refs[x.Id])).ToArray(),
            routines.Select(x =>
            {
                var recurrence = RoutineSchedule.Parse(x.RecurrenceDefinition);
                return new PlanningContextRoutine(x.Id, x.Title, x.ProjectId,
                    new PlanningRecurrence(recurrence.Type, recurrence.DaysOfWeek, recurrence.DayOfMonth),
                    Slots(x.Id, OccurrenceStatuses.Done), Slots(x.Id, OccurrenceStatuses.Missed), x.TimesOfDay);
            }).ToArray(),
            unfinished.Select((x, index) => new PlanningContextTask(x.Id, x.Title, x.ProjectId, x.PlannedDate,
                x.Deadline, ReasonCodes(x, signals.GetValueOrDefault(x.Id, TaskSignals.None), today),
                WaitsFor(x), $"T{index + 1}")).ToArray(),
            new PlanningPreviousWindow(previousStart, previousEnd,
                completed.Take(MaxCompletedTitles).ToArray(), completed.Count, carried, dropped,
                Slots(null, OccurrenceStatuses.Done), Slots(null, OccurrenceStatuses.Missed),
                left.Take(MaxLeftTitles).ToArray(), left.Count),
            continuing is null ? null
                : new PlanningContinuationContext(continuing.Id, continuing.Week + 1, previousStart, previousEnd)));

        bool InWindow(DateOnly date) => date >= previousStart && date <= previousEnd;
    }

    /// <summary>
    /// The owned, active Goal or Project a planning flow starts from. Planning details live on the
    /// Goal, or on the Project when it has no Goal: a Project under a Goal uses its Goal's details.
    /// </summary>
    internal static async Task<PlanningScope?> ScopeAsync(AppDbContext context, Guid owner, Guid? goalId,
        Guid? projectId, bool requireActive, CancellationToken cancellationToken)
    {
        if (goalId is { } requestedGoal)
        {
            var goal = await context.Goals.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == requestedGoal && x.UserId == owner, cancellationToken)
                ?? throw new ResourceNotFoundException("Goal", requestedGoal);
            if (requireActive && goal.Status != ParentStatuses.Active)
                throw new DomainRuleException("PARENT_NOT_ACTIVE", "The Goal is not active.");
            return new PlanningScope(PlanningContextTypes.Goal, goal.Id, goal.Title, goal.Version,
                PlanningContextTypes.Goal, goal.Id, NullIfBlank(goal.DesiredOutcome), goal.TargetDate);
        }
        if (projectId is not { } requestedProject) return null;
        var project = await context.Projects.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == requestedProject && x.UserId == owner, cancellationToken)
            ?? throw new ResourceNotFoundException("Project", requestedProject);
        if (requireActive && project.Status != ParentStatuses.Active)
            throw new DomainRuleException("PARENT_NOT_ACTIVE", "The Project is not active.");
        return project.GoalId is { } parentGoal
            ? new PlanningScope(PlanningContextTypes.Project, project.Id, project.Title, project.Version,
                PlanningContextTypes.Goal, parentGoal, NullIfBlank(project.CompletionMeaning), project.TargetDate)
            : new PlanningScope(PlanningContextTypes.Project, project.Id, project.Title, project.Version,
                PlanningContextTypes.Project, project.Id, NullIfBlank(project.CompletionMeaning), project.TargetDate);
    }

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    /// <summary>Confirmed details of the scope that still apply. They are never truncated: HARD details are a correctness floor.</summary>
    internal static async Task<IReadOnlyList<PlanningFactData>> ActiveFactsAsync(AppDbContext context,
        Guid owner, PlanningScope scope, DateOnly today, CancellationToken cancellationToken)
    {
        var query = context.PlanningFacts.AsNoTracking()
            .Where(x => x.UserId == owner && x.Status == PlanningFactStatuses.Active);
        query = scope.FactScopeType == PlanningContextTypes.Goal
            ? query.Where(x => x.GoalId == scope.FactScopeId)
            : query.Where(x => x.ProjectId == scope.FactScopeId);
        var rows = await query.OrderBy(x => x.CapturedAt).ThenBy(x => x.Id).ToListAsync(cancellationToken);
        return rows
            .Select(x => new PlanningFactData(x.FactType, x.Strength,
                PlanningJson.Deserialize<PlanningFactValue>(x.ValueJson)))
            .Where(x => !PlanningFactCatalog.HasPassed(x.FactType, x.Value, today)).ToArray();
    }

    /// <summary>The same deterministic reasons Reconcile reports, limited to this scope's Tasks.</summary>
    private static string[] ReasonCodes(TaskItem task, TaskSignals signals, DateOnly today)
    {
        var codes = new List<string>();
        if (task.PlannedDate < today) codes.Add(ReconcileReasonCodes.ExecutionOverdue);
        if (signals.CarryCount >= ReconcileRules.RepeatedCarryThreshold) codes.Add(ReconcileReasonCodes.RepeatedCarry);
        if (ReconcileRules.IsDeadlineRisk(task.PlannedDate, task.Deadline, today))
            codes.Add(ReconcileReasonCodes.DeadlineRisk);
        return codes.ToArray();
    }

    private static PlanningContext Seal(PlanningContext context) => context with
    {
        Fingerprint = CommandExecutionRequest.HashCanonicalRequest(
            Encoding.UTF8.GetBytes(PlanningJson.Serialize(context with { Fingerprint = string.Empty })))
    };

    /// <summary>Which categories were supplied and how many items each held. It never copies a value or a title.</summary>
    public static string Manifest(PlanningContext context) => PlanningJson.Serialize(new
    {
        builderVersion = context.BuilderVersion,
        scopeType = context.Scope?.Type ?? "NONE",
        horizonDays = PlanningLimits.HorizonDays,
        categories = new Dictionary<string, int>
        {
            [context.Scope?.FactScopeType == PlanningContextTypes.Project
                ? "PROJECT_PLANNING_FACTS" : "GOAL_PLANNING_FACTS"] = context.Facts.Count,
            ["ACTIVE_PROJECTS"] = context.Projects.Count,
            ["ACTIVE_ROUTINES"] = context.Routines.Count,
            ["UNFINISHED_TASKS"] = context.UnfinishedTasks.Count,
            ["PREVIOUS_WINDOW"] = context.PreviousWindow is null ? 0 : 1,
            ["CONTINUATION"] = context.Continuation is null ? 0 : 1
        }
    });
}
