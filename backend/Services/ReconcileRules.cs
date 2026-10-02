using TidySense.Common.Events;
using TidySense.DTOs.Reconcile;
using TidySense.Models;

namespace TidySense.Services;

public static class ReconcileReasonCodes
{
    public const string ExecutionOverdue = "EXECUTION_OVERDUE";
    public const string RepeatedCarry = "REPEATED_CARRY";
    public const string DeadlineRisk = "DEADLINE_RISK";
    public const string DroppedPredecessor = "DROPPED_PREDECESSOR";
    public const string ReviewDue = "REVIEW_DUE";
}

public static class ReconcileOwnerTypes
{
    public const string Project = "PROJECT";
    public const string Goal = "GOAL";
    public const string Standalone = "STANDALONE";
}

/// <summary>
/// A non-completed Task as Reconcile sees it. <paramref name="KeptToday"/> and
/// <paramref name="KeptSinceLastCarry"/> come from the Task's KEEP_UNCHANGED history.
/// </summary>
public sealed record ReconcileTaskInput(
    Guid Id,
    string Title,
    long Version,
    string Status,
    Guid? GoalId,
    Guid? ProjectId,
    DateOnly? PlannedDate,
    DateOnly? Deadline,
    Guid? SequenceId,
    int? SequenceOrder,
    bool IsProtected,
    int CarryCount,
    bool KeptToday,
    bool KeptSinceLastCarry);

/// <summary>An ACTIVE Goal or Project. <paramref name="LastDecisionLocalDate"/> applies to Goals only.</summary>
public sealed record ReconcileParentInput(
    string EntityType,
    Guid Id,
    string Title,
    long Version,
    DateOnly ReviewDate,
    DateOnly? TargetDate,
    DateOnly? LastDecisionLocalDate);

public sealed record ReconcileEvaluation(
    string Severity,
    IReadOnlyList<string> TriggerReasons,
    ReconcileCountsDto Counts,
    IReadOnlyList<ReconcileOwnerGroupDto> ExecutionGroups,
    IReadOnlyList<ReconcileReviewItemDto> Reviews,
    IReadOnlyList<ReconcileRuleMatchDto> RuleMatches)
{
    /// <summary>Captures are surfaced in Reconcile but never make it eligible on their own.</summary>
    public bool Eligible => Counts.ActionableBacklogCount > 0 || Counts.ReviewDueCount > 0;
}

/// <summary>
/// Deterministic Reconcile facts, severity, rule matches and grouping. Pure: the same canonical
/// state and local date always produce the same result, and nothing here reads free text.
/// </summary>
public static class ReconcileRules
{
    public const string CatalogVersion = "2026-10-02.1";
    public const string CompleteTask = "COMPLETE_TASK";
    public const int RepeatedCarryThreshold = 2;
    public const int StaleExecutionAgeDays = 7;
    public const int DeadlineRiskWindowDays = 2;
    public const int GoalContinuationCadenceDays = 30;

    public static ReconcileEvaluation Evaluate(DateOnly today, IReadOnlyList<ReconcileTaskInput> tasks,
        IReadOnlyList<ReconcileParentInput> parents, int unresolvedCaptureCount)
    {
        var sequences = tasks.Where(x => x.SequenceId is not null)
            .GroupBy(x => x.SequenceId!.Value)
            .ToDictionary(x => x.Key, x => x.OrderBy(m => m.SequenceOrder).ThenBy(m => m.Id).ToArray());
        var active = tasks.Where(x => x.Status == TaskStatuses.Active).ToArray();

        var items = new Dictionary<Guid, ReconcileTaskItemDto>();
        foreach (var task in active)
        {
            // Only non-completed members are supplied, so any earlier member is an unresolved predecessor.
            var blocked = task.SequenceId is { } sequenceId &&
                sequences[sequenceId].Any(x => x.SequenceOrder < task.SequenceOrder);
            var item = Classify(task, blocked, today);
            if (item is not null) items[task.Id] = item;
        }

        var consumed = new HashSet<Guid>();
        var sequenceGroups = new List<(ReconcileTaskInput Owner, ReconcileSequenceGroupDto Group)>();
        foreach (var (sequenceId, members) in sequences.OrderBy(x => x.Key))
        {
            var relevant = members.Where(x => items.ContainsKey(x.Id)).ToArray();
            var first = members[0];
            var dropped = first.Status == TaskStatuses.Dropped &&
                members.Any(x => x.Status == TaskStatuses.Active && x.PlannedDate < today);
            if (!dropped && relevant.Length < 2) continue;
            foreach (var member in relevant) consumed.Add(member.Id);
            sequenceGroups.Add((members.First(x => x.Status == TaskStatuses.Active),
                SequenceGroup(sequenceId, relevant.Select(x => items[x.Id]).ToArray(),
                    dropped ? first : null, today)));
        }

        var looseTasks = active.Where(x => items.TryGetValue(x.Id, out var item) && item.Actionable &&
            !consumed.Contains(x.Id)).ToArray();
        var actionable = active.Where(x => items.TryGetValue(x.Id, out var item) && item.Actionable)
            .Select(x => (Task: x, Item: items[x.Id])).ToArray();
        var droppedSequences = sequenceGroups.Where(x => x.Group.DroppedPredecessor is not null).ToArray();

        var parentTitles = parents.ToDictionary(x => (x.EntityType, x.Id), x => x.Title);
        var groups = looseTasks.Select(x => (Key: OwnerKey(x), Sequence: (ReconcileSequenceGroupDto?)null,
                Item: (ReconcileTaskItemDto?)items[x.Id]))
            .Concat(sequenceGroups.Select(x => (Key: OwnerKey(x.Owner),
                Sequence: (ReconcileSequenceGroupDto?)x.Group, Item: (ReconcileTaskItemDto?)null)))
            .GroupBy(x => x.Key)
            .Select(group => new ReconcileOwnerGroupDto(group.Key.Type, group.Key.Id,
                group.Key.Id is { } ownerId
                    ? parentTitles.GetValueOrDefault((ParentEntityType(group.Key.Type), ownerId)) : null,
                group.Where(x => x.Sequence is not null).Select(x => x.Sequence!).ToArray(),
                group.Where(x => x.Item is not null).Select(x => x.Item!)
                    .OrderBy(x => x.PlannedDate ?? DateOnly.MaxValue).ThenBy(x => x.TaskId).ToArray()))
            .OrderBy(x => OwnerRank(x.OwnerType)).ThenBy(x => x.OwnerTitle, StringComparer.Ordinal)
            .ThenBy(x => x.OwnerId)
            .ToArray();

        var reviews = Reviews(today, parents, active);
        var count = actionable.Length + droppedSequences.Length;
        var ages = actionable.Where(x => x.Item.AgeDays is not null).Select(x => x.Item.AgeDays!.Value).ToArray();
        int? oldest = ages.Length == 0 ? null : ages.Max();
        var repeatedCarry = actionable.Count(x => x.Item.ReasonCodes.Contains(ReconcileReasonCodes.RepeatedCarry));
        var deadlineRisk = actionable.Count(x => x.Item.ReasonCodes.Contains(ReconcileReasonCodes.DeadlineRisk));
        var affectedParents = actionable.Select(x => OwnerKey(x.Task))
            .Concat(droppedSequences.Select(x => OwnerKey(x.Owner)))
            .Where(x => x.Id is not null).Distinct().Count();

        var reasons = actionable.SelectMany(x => x.Item.ReasonCodes)
            .Concat(droppedSequences.Select(_ => ReconcileReasonCodes.DroppedPredecessor))
            .Concat(reviews.Count > 0 ? [ReconcileReasonCodes.ReviewDue] : Array.Empty<string>())
            .Distinct().Order(StringComparer.Ordinal).ToArray();

        return new ReconcileEvaluation(
            Severity(count, oldest, repeatedCarry, deadlineRisk, affectedParents), reasons,
            new ReconcileCountsDto(count, oldest, repeatedCarry, deadlineRisk, affectedParents,
                reviews.Count, unresolvedCaptureCount),
            groups, reviews,
            RuleMatches(actionable.Select(x => x.Item).ToArray(),
                droppedSequences.Select(x => x.Group).ToArray()));
    }

    /// <summary>
    /// Presentation severity of the actionable execution backlog (Discussion 016 §7). Age alone
    /// never produces RECOVERY: it also needs at least three actionable items.
    /// </summary>
    public static string Severity(int actionableCount, int? oldestAgeDays, int repeatedCarryCount,
        int deadlineRiskCount, int affectedParentCount)
    {
        if (actionableCount <= 0) return ReconcileSeverities.None;
        if (actionableCount >= 8 || (oldestAgeDays > 7 && actionableCount >= 3) || affectedParentCount >= 3)
            return ReconcileSeverities.Recovery;
        if (actionableCount >= 3 || oldestAgeDays >= 3 || repeatedCarryCount > 0 ||
            deadlineRiskCount > 0 || affectedParentCount > 1)
            return ReconcileSeverities.Medium;
        return ReconcileSeverities.Light;
    }

    public static bool IsEffectivelyProtected(bool isProtected, DateOnly? deadline) =>
        isProtected || deadline is not null;

    public static bool IsDeadlineRisk(DateOnly? plannedDate, DateOnly? deadline, DateOnly today) =>
        deadline is { } value && value <= today.AddDays(DeadlineRiskWindowDays) &&
        (plannedDate is null || plannedDate < today);

    /// <summary>Null when the Task carries no Reconcile fact, actionable or contextual.</summary>
    private static ReconcileTaskItemDto? Classify(ReconcileTaskInput task, bool blocked, DateOnly today)
    {
        var overdue = task.PlannedDate < today;
        int? age = overdue ? today.DayNumber - task.PlannedDate!.Value.DayNumber : null;
        var isProtected = IsEffectivelyProtected(task.IsProtected, task.Deadline);
        var deadlineRisk = IsDeadlineRisk(task.PlannedDate, task.Deadline, today);
        if (blocked)
        {
            // A blocked descendant keeps its overdue evidence but is not an independent decision.
            if (!overdue) return null;
            var contextActions = new List<string> { ReconcileActionTypes.ReplanTasks };
            if (!isProtected) contextActions.Add(ReconcileActionTypes.DropTasks);
            return new ReconcileTaskItemDto(task.Id, task.Title, task.Version, task.PlannedDate,
                task.Deadline, age, task.CarryCount, isProtected, true, false,
                [ReconcileReasonCodes.ExecutionOverdue], [], contextActions);
        }

        var reasons = new List<string>();
        if (overdue && !task.KeptToday) reasons.Add(ReconcileReasonCodes.ExecutionOverdue);
        if (task.CarryCount >= RepeatedCarryThreshold && !task.KeptSinceLastCarry)
            reasons.Add(ReconcileReasonCodes.RepeatedCarry);
        if (deadlineRisk && !task.KeptToday) reasons.Add(ReconcileReasonCodes.DeadlineRisk);
        if (reasons.Count == 0) return null;

        var rules = new List<string>();
        if (reasons.Contains(ReconcileReasonCodes.RepeatedCarry)) rules.Add("R1");
        if (reasons.Contains(ReconcileReasonCodes.ExecutionOverdue) && age >= StaleExecutionAgeDays) rules.Add("R2");
        if (reasons.Contains(ReconcileReasonCodes.DeadlineRisk)) rules.Add("R3");

        var actions = new List<string> { CompleteTask, ReconcileActionTypes.ReplanTasks };
        // No Drop is offered for a protected Task or while a deadline is at risk.
        if (!isProtected && !deadlineRisk) actions.Add(ReconcileActionTypes.DropTasks);
        actions.Add(ReconcileActionTypes.KeepTasks);
        return new ReconcileTaskItemDto(task.Id, task.Title, task.Version, task.PlannedDate,
            task.Deadline, overdue ? age : null, task.CarryCount, isProtected, false, true, reasons, rules,
            actions);
    }

    private static ReconcileSequenceGroupDto SequenceGroup(Guid sequenceId,
        IReadOnlyList<ReconcileTaskItemDto> items, ReconcileTaskInput? droppedPredecessor, DateOnly today)
    {
        var anyProtected = items.Any(x => x.IsProtected);
        var actions = new List<string>();
        if (droppedPredecessor is not null) actions.Add(ReconcileActionTypes.DetachDroppedPredecessor);
        else if (items.Any(x => x.PlannedDate < today)) actions.Add(ReconcileActionTypes.SequenceCarryAll);
        if (!anyProtected) actions.Add(ReconcileActionTypes.SequenceDropAll);
        var reasons = items.SelectMany(x => x.ReasonCodes)
            .Concat(droppedPredecessor is null ? [] : new[] { ReconcileReasonCodes.DroppedPredecessor })
            .Distinct().Order(StringComparer.Ordinal).ToArray();
        return new ReconcileSequenceGroupDto(sequenceId, reasons,
            droppedPredecessor is null ? [] : ["R6"], actions,
            droppedPredecessor is null ? null : new ReconcileTaskRefDto(droppedPredecessor.Id,
                droppedPredecessor.Title, droppedPredecessor.Version, droppedPredecessor.Deadline),
            items);
    }

    private static List<ReconcileReviewItemDto> Reviews(DateOnly today,
        IReadOnlyList<ReconcileParentInput> parents, IReadOnlyList<ReconcileTaskInput> active)
    {
        // An undated Task is resurfaced only by its direct owner: its Project, else its Goal.
        var undated = active.Where(x => x.PlannedDate is null).ToArray();
        return parents
            .Where(x => x.ReviewDate <= today && (x.LastDecisionLocalDate is not { } last ||
                last.AddDays(GoalContinuationCadenceDays) <= today))
            .OrderBy(x => x.TargetDate ?? x.ReviewDate).ThenBy(x => x.ReviewDate).ThenBy(x => x.Id)
            .Select(parent =>
            {
                var isGoal = parent.EntityType == "Goal";
                var children = undated
                    .Where(x => isGoal ? x.GoalId == parent.Id : x.ProjectId == parent.Id)
                    .OrderBy(x => x.Id)
                    .Select(x => new ReconcileTaskRefDto(x.Id, x.Title, x.Version, x.Deadline)).ToArray();
                IReadOnlyList<string> actions = isGoal
                    ? [ReviewDecisions.Continue, ReviewDecisions.ReviewLater, "ABANDON_GOAL"]
                    : [ReviewDecisions.KeepWithNewReviewDate, "ADJUST_CHILD_EXECUTION", "COMPLETE_PROJECT", "STOP_PROJECT"];
                return new ReconcileReviewItemDto(isGoal ? ReconcileOwnerTypes.Goal : ReconcileOwnerTypes.Project,
                    parent.Id, parent.Title, parent.Version, parent.ReviewDate, parent.TargetDate, actions, children);
            }).ToList();
    }

    private static IReadOnlyList<ReconcileRuleMatchDto> RuleMatches(
        IReadOnlyList<ReconcileTaskItemDto> actionable, IReadOnlyList<ReconcileSequenceGroupDto> droppedSequences)
    {
        var matches = new List<ReconcileRuleMatchDto>();
        foreach (var ruleId in new[] { "R1", "R2", "R3" })
        {
            var matched = actionable.Where(x => x.RuleIds.Contains(ruleId)).ToArray();
            if (matched.Length == 0) continue;
            matches.Add(new ReconcileRuleMatchDto(ruleId, CatalogVersion,
                matched.Select(x => x.TaskId).Order().ToArray(),
                matched.SelectMany(x => x.AllowedActions).Distinct().Order(StringComparer.Ordinal).ToArray()));
        }
        if (droppedSequences.Count > 0)
            matches.Add(new ReconcileRuleMatchDto("R6", CatalogVersion,
                droppedSequences.Select(x => x.DroppedPredecessor!.Id).Order().ToArray(),
                droppedSequences.SelectMany(x => x.AllowedActions).Distinct().Order(StringComparer.Ordinal).ToArray()));
        return matches;
    }

    private static (string Type, Guid? Id) OwnerKey(ReconcileTaskInput task) =>
        task.ProjectId is { } projectId ? (ReconcileOwnerTypes.Project, projectId)
        : task.GoalId is { } goalId ? (ReconcileOwnerTypes.Goal, goalId)
        : (ReconcileOwnerTypes.Standalone, null);

    private static string ParentEntityType(string ownerType) =>
        ownerType == ReconcileOwnerTypes.Project ? "Project" : "Goal";

    private static int OwnerRank(string ownerType) => ownerType switch
    {
        ReconcileOwnerTypes.Project => 0,
        ReconcileOwnerTypes.Goal => 1,
        _ => 2
    };
}
