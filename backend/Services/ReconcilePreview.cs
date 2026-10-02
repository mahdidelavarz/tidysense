using System.Text.Json;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.DTOs.Reconcile;
using TidySense.Models;

namespace TidySense.Services;

public static class PreviewClassifications
{
    public const string WillReplan = "WILL_REPLAN";
    public const string WillSchedule = "WILL_SCHEDULE";
    public const string WillDrop = "WILL_DROP";
    public const string WillKeep = "WILL_KEEP";
    public const string WillDetach = "WILL_DETACH";
    public const string WillShiftNormally = "WILL_SHIFT_NORMALLY";
    public const string HasProtectedManualSchedule = "HAS_PROTECTED_MANUAL_SCHEDULE";
    public const string UnscheduledParentOwned = "UNSCHEDULED_PARENT_OWNED";
    public const string HasTemporalConflict = "HAS_TEMPORAL_CONFLICT";
    public const string Protected = "PROTECTED";
    public const string NotActive = "NOT_ACTIVE";
    public const string Unchanged = "UNCHANGED";

    /// <summary>Classifications that change the Task when the confirmation is applied.</summary>
    public static bool Changes(string value) =>
        value is WillReplan or WillSchedule or WillDrop or WillKeep or WillDetach or WillShiftNormally;

    /// <summary>Classifications that make the whole action inapplicable; nothing is applied partially.</summary>
    public static bool Blocks(string value) => value is HasTemporalConflict or Protected or NotActive;
}

public static class PreviewWarningCodes
{
    public const string UndatedTaskScheduled = "UNDATED_TASK_SCHEDULED";
    public const string ParentLeftWithoutActiveTasks = "PARENT_LEFT_WITHOUT_ACTIVE_TASKS";
}

/// <summary>The action a confirmation was created for. Stored, and re-derived from at submit.</summary>
public sealed record ReconcileActionRequest(
    string ActionType,
    IReadOnlyList<Guid> TaskIds,
    Guid? SequenceId,
    DateOnly? PlannedDate,
    IReadOnlyList<Guid> IncludeTaskIds);

public sealed record ReconcilePreviewPlan(
    IReadOnlyList<ReconcilePreviewItemDto> Items,
    IReadOnlyList<ConfirmationWarningDto> Warnings,
    bool CanApply,
    string Hash);

/// <summary>
/// Builds the server-authoritative consequence preview of a Reconcile action. Pure: the preview
/// shown to the user and the one re-derived under locks at submit come from this same function,
/// so any difference in the affected Tasks shows up as a different hash.
/// </summary>
public static class ReconcilePreview
{
    /// <param name="tasks">The requested Tasks, or every member of the requested sequence.</param>
    /// <param name="individuallyRescheduled">Tasks the user moved on their own (Carry or date edit).</param>
    /// <param name="carryCounts">Derived carry count of each requested Task that has one.</param>
    /// <param name="activeTaskCounts">ACTIVE Task count of each Goal or Project that owns a requested Task.</param>
    public static ReconcilePreviewPlan Build(ReconcileActionRequest request, DateOnly today,
        IReadOnlyList<TaskItem> tasks, IReadOnlySet<Guid> individuallyRescheduled,
        IReadOnlyDictionary<Guid, int> carryCounts, IReadOnlyDictionary<Guid, int> activeTaskCounts)
    {
        var items = request.ActionType switch
        {
            ReconcileActionTypes.ReplanTasks => Replan(request, today, tasks),
            ReconcileActionTypes.DropTasks => tasks.OrderBy(x => x.Id).Select(Drop).ToList(),
            ReconcileActionTypes.KeepTasks => tasks.OrderBy(x => x.Id)
                .Select(x => Keep(x, carryCounts.GetValueOrDefault(x.Id), today)).ToList(),
            ReconcileActionTypes.SequenceCarryAll => CarryAll(request, today, tasks, individuallyRescheduled),
            ReconcileActionTypes.SequenceDropAll => Members(tasks).Where(x => x.Status == TaskStatuses.Active)
                .Select(Drop).ToList(),
            ReconcileActionTypes.DetachDroppedPredecessor => Detach(tasks),
            _ => throw new ArgumentException("actionType is not supported.")
        };

        var warnings = new List<ConfirmationWarningDto>();
        var scheduled = items.Where(x => x.Classification == PreviewClassifications.WillSchedule)
            .Select(x => x.TaskId).ToArray();
        if (scheduled.Length > 0) warnings.Add(Warning(PreviewWarningCodes.UndatedTaskScheduled, scheduled));
        var dropped = items.Where(x => x.Classification == PreviewClassifications.WillDrop)
            .Select(x => x.TaskId).ToHashSet();
        var emptied = tasks.Where(x => dropped.Contains(x.Id))
            .GroupBy(x => x.ProjectId ?? x.GoalId)
            .Where(x => x.Key is { } parentId && activeTaskCounts.GetValueOrDefault(parentId) == x.Count())
            .Select(x => x.Key!.Value).ToArray();
        if (emptied.Length > 0)
            warnings.Add(Warning(PreviewWarningCodes.ParentLeftWithoutActiveTasks, emptied));

        var canApply = items.Any(x => PreviewClassifications.Changes(x.Classification)) &&
            !items.Any(x => PreviewClassifications.Blocks(x.Classification));
        return new ReconcilePreviewPlan(items, warnings, canApply, Hash(request.ActionType, items, warnings));
    }

    /// <summary>The reason codes a KEEP_UNCHANGED acknowledges for one Task; empty when there is nothing to keep.</summary>
    public static string[] KeepReasons(TaskItem task, int carryCount, DateOnly today)
    {
        var reasons = new List<string>();
        if (task.PlannedDate < today) reasons.Add(ReconcileReasonCodes.ExecutionOverdue);
        if (carryCount >= ReconcileRules.RepeatedCarryThreshold) reasons.Add(ReconcileReasonCodes.RepeatedCarry);
        if (ReconcileRules.IsDeadlineRisk(task.PlannedDate, task.Deadline, today))
            reasons.Add(ReconcileReasonCodes.DeadlineRisk);
        return reasons.ToArray();
    }

    private static List<ReconcilePreviewItemDto> Replan(ReconcileActionRequest request, DateOnly today,
        IReadOnlyList<TaskItem> tasks)
    {
        var date = request.PlannedDate ?? throw new ArgumentException("plannedDate is required.");
        if (date < today) throw new ArgumentException("plannedDate cannot be in the past.");
        return tasks.OrderBy(x => x.Id).Select(task =>
        {
            var classification = task.Status != TaskStatuses.Active ? PreviewClassifications.NotActive
                : task.Deadline is { } deadline && date > deadline ? PreviewClassifications.HasTemporalConflict
                : task.PlannedDate == date ? PreviewClassifications.Unchanged
                : task.PlannedDate is null ? PreviewClassifications.WillSchedule
                : PreviewClassifications.WillReplan;
            return Item(task, classification,
                PreviewClassifications.Changes(classification) ? date : task.PlannedDate, task.Status);
        }).ToList();
    }

    private static ReconcilePreviewItemDto Drop(TaskItem task) =>
        task.Status != TaskStatuses.Active ? Item(task, PreviewClassifications.NotActive, task.PlannedDate, task.Status)
        : ReconcileRules.IsEffectivelyProtected(task.IsProtected, task.Deadline)
            ? Item(task, PreviewClassifications.Protected, task.PlannedDate, task.Status)
            : Item(task, PreviewClassifications.WillDrop, task.PlannedDate, TaskStatuses.Dropped);

    private static ReconcilePreviewItemDto Keep(TaskItem task, int carryCount, DateOnly today) =>
        Item(task, task.Status != TaskStatuses.Active ? PreviewClassifications.NotActive
            : KeepReasons(task, carryCount, today).Length == 0 ? PreviewClassifications.Unchanged
            : PreviewClassifications.WillKeep, task.PlannedDate, task.Status);

    /// <summary>
    /// Anchors the first overdue remaining member on the chosen date and moves every other dated
    /// remaining member by the same number of days, so relative spacing is preserved.
    /// </summary>
    private static List<ReconcilePreviewItemDto> CarryAll(ReconcileActionRequest request, DateOnly today,
        IReadOnlyList<TaskItem> tasks, IReadOnlySet<Guid> individuallyRescheduled)
    {
        var date = request.PlannedDate ?? throw new ArgumentException("plannedDate is required.");
        if (date < today) throw new ArgumentException("plannedDate cannot be in the past.");
        var remaining = Members(tasks).Where(x => x.Status == TaskStatuses.Active).ToArray();
        var anchor = remaining.FirstOrDefault(x => x.PlannedDate < today);
        if (anchor is null) return [];
        var shift = date.DayNumber - anchor.PlannedDate!.Value.DayNumber;
        return remaining.Select(task =>
        {
            if (task.PlannedDate is not { } planned)
                return Item(task, PreviewClassifications.UnscheduledParentOwned, null, task.Status);
            if (planned >= today && individuallyRescheduled.Contains(task.Id) &&
                !request.IncludeTaskIds.Contains(task.Id))
                return Item(task, PreviewClassifications.HasProtectedManualSchedule, planned, task.Status);
            var resulting = planned.AddDays(shift);
            return task.Deadline is { } deadline && resulting > deadline
                ? Item(task, PreviewClassifications.HasTemporalConflict, planned, task.Status)
                : Item(task, PreviewClassifications.WillShiftNormally, resulting, task.Status);
        }).ToList();
    }

    private static List<ReconcilePreviewItemDto> Detach(IReadOnlyList<TaskItem> tasks)
    {
        var first = Members(tasks).FirstOrDefault(x => x.Status != TaskStatuses.Completed);
        return first is null ? []
            : [Item(first, first.Status == TaskStatuses.Dropped
                ? PreviewClassifications.WillDetach : PreviewClassifications.Unchanged,
                first.PlannedDate, first.Status)];
    }

    private static IEnumerable<TaskItem> Members(IReadOnlyList<TaskItem> tasks) =>
        tasks.OrderBy(x => x.SequenceOrder).ThenBy(x => x.Id);

    private static ReconcilePreviewItemDto Item(TaskItem task, string classification,
        DateOnly? resultingPlannedDate, string resultingStatus) => new(task.Id, task.Title, task.Version,
        classification, task.PlannedDate, resultingPlannedDate, resultingStatus);

    private static ConfirmationWarningDto Warning(string code, IReadOnlyList<Guid> affected)
    {
        var ids = affected.Order().ToArray();
        return new ConfirmationWarningDto(code, code, ids,
            CommandExecutionRequest.HashCanonicalRequest(
                JsonSerializer.SerializeToUtf8Bytes(new { code, affectedEntityIds = ids })));
    }

    private static string Hash(string actionType, IReadOnlyList<ReconcilePreviewItemDto> items,
        IReadOnlyList<ConfirmationWarningDto> warnings) =>
        CommandExecutionRequest.HashCanonicalRequest(JsonSerializer.SerializeToUtf8Bytes(new
        {
            actionType,
            // Titles are display text; the hash covers identity, version and consequence only.
            items = items.Select(x => new
            {
                x.TaskId, x.ExpectedVersion, x.Classification, x.CurrentPlannedDate,
                x.ResultingPlannedDate, x.ResultingStatus
            }),
            warnings = warnings.Select(x => x.WarningHash)
        }));
}
