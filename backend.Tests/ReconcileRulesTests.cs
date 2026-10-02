using TidySense.Common.Events;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class ReconcileRulesTests
{
    private static readonly DateOnly Today = new(2026, 10, 15);

    [Fact]
    public void One_task_from_yesterday_is_eligible_and_light()
    {
        var evaluation = Evaluate([Task(plannedDaysAgo: 1)]);

        Assert.True(evaluation.Eligible);
        Assert.Equal("LIGHT", evaluation.Severity);
        Assert.Equal(1, evaluation.Counts.ActionableBacklogCount);
        Assert.Equal(1, evaluation.Counts.OldestUnresolvedAgeDays);
        Assert.Equal(["EXECUTION_OVERDUE"], evaluation.TriggerReasons);
        Assert.Empty(evaluation.RuleMatches);
        var item = Assert.Single(Assert.Single(evaluation.ExecutionGroups).Tasks);
        Assert.Equal(["COMPLETE_TASK", "REPLAN_TASKS", "DROP_TASKS", "KEEP_TASKS"], item.AllowedActions);
    }

    [Fact]
    public void One_or_two_old_tasks_are_medium_and_three_are_recovery()
    {
        var one = Evaluate([Task(plannedDaysAgo: 9)]);
        Assert.Equal("MEDIUM", one.Severity);
        Assert.Equal("R2", Assert.Single(one.RuleMatches).RuleId);

        Assert.Equal("MEDIUM", Evaluate([Task(plannedDaysAgo: 9), Task(plannedDaysAgo: 30)]).Severity);
        Assert.Equal("RECOVERY",
            Evaluate([Task(plannedDaysAgo: 9), Task(plannedDaysAgo: 1), Task(plannedDaysAgo: 1)]).Severity);
    }

    [Fact]
    public void Breadth_alone_escalates_without_age()
    {
        Assert.Equal("MEDIUM", Evaluate(Enumerable.Range(0, 3).Select(_ => Task(plannedDaysAgo: 1)).ToArray()).Severity);
        Assert.Equal("MEDIUM", Evaluate(Enumerable.Range(0, 7).Select(_ => Task(plannedDaysAgo: 1)).ToArray()).Severity);
        Assert.Equal("RECOVERY", Evaluate(Enumerable.Range(0, 8).Select(_ => Task(plannedDaysAgo: 1)).ToArray()).Severity);
    }

    [Fact]
    public void Affected_parents_escalate_but_standalone_work_is_not_a_parent()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var third = Guid.NewGuid();

        var two = Evaluate([Task(plannedDaysAgo: 1, projectId: first), Task(plannedDaysAgo: 1, goalId: second)]);
        Assert.Equal("MEDIUM", two.Severity);
        Assert.Equal(2, two.Counts.AffectedParentCount);

        var three = Evaluate([
            Task(plannedDaysAgo: 1, projectId: first), Task(plannedDaysAgo: 1, goalId: second),
            Task(plannedDaysAgo: 1, projectId: third)
        ]);
        Assert.Equal("RECOVERY", three.Severity);

        var standalone = Evaluate([Task(plannedDaysAgo: 1), Task(plannedDaysAgo: 1)]);
        Assert.Equal("LIGHT", standalone.Severity);
        Assert.Equal(0, standalone.Counts.AffectedParentCount);
    }

    [Fact]
    public void Nothing_actionable_means_no_reconcile_and_captures_never_make_it_eligible()
    {
        var evaluation = ReconcileRules.Evaluate(Today,
            [Task(plannedDaysAgo: -1), Task(plannedDaysAgo: 0)], [], unresolvedCaptureCount: 12);

        Assert.False(evaluation.Eligible);
        Assert.Equal("NONE", evaluation.Severity);
        Assert.Equal(0, evaluation.Counts.ActionableBacklogCount);
        Assert.Null(evaluation.Counts.OldestUnresolvedAgeDays);
        Assert.Equal(12, evaluation.Counts.UnresolvedCaptureCount);
        Assert.Empty(evaluation.ExecutionGroups);
    }

    [Fact]
    public void Repeated_carry_starts_at_the_second_carry_and_is_suppressed_by_a_later_keep()
    {
        Assert.False(Evaluate([Task(plannedDaysAgo: -3, carryCount: 1)]).Eligible);

        var carriedTwice = Evaluate([Task(plannedDaysAgo: -3, carryCount: 2)]);
        Assert.True(carriedTwice.Eligible);
        Assert.Equal("MEDIUM", carriedTwice.Severity);
        Assert.Equal(1, carriedTwice.Counts.RepeatedCarryTaskCount);
        Assert.Null(carriedTwice.Counts.OldestUnresolvedAgeDays);
        Assert.Equal("R1", Assert.Single(carriedTwice.RuleMatches).RuleId);

        Assert.False(Evaluate([Task(plannedDaysAgo: -3, carryCount: 2, keptSinceLastCarry: true)]).Eligible);
    }

    [Fact]
    public void Keep_suppresses_an_overdue_fact_for_the_evaluated_day_only()
    {
        Assert.False(Evaluate([Task(plannedDaysAgo: 2, keptToday: true)]).Eligible);
        Assert.True(Evaluate([Task(plannedDaysAgo: 2, keptToday: false, keptSinceLastCarry: true)]).Eligible);
    }

    [Fact]
    public void Blocked_descendants_are_context_and_do_not_inflate_count_or_age()
    {
        var sequence = Guid.NewGuid();
        var project = Guid.NewGuid();
        var tasks = new[]
        {
            Task(plannedDaysAgo: 2, projectId: project, sequenceId: sequence, order: 40),
            Task(plannedDaysAgo: 9, projectId: project, sequenceId: sequence, order: 50),
            Task(plannedDaysAgo: 8, projectId: project, sequenceId: sequence, order: 60),
            Task(plannedDaysAgo: -1, projectId: project, sequenceId: sequence, order: 70)
        };

        var evaluation = Evaluate(tasks);

        Assert.Equal(1, evaluation.Counts.ActionableBacklogCount);
        Assert.Equal(2, evaluation.Counts.OldestUnresolvedAgeDays);
        Assert.Equal("LIGHT", evaluation.Severity);
        var group = Assert.Single(evaluation.ExecutionGroups);
        Assert.Equal("PROJECT", group.OwnerType);
        Assert.Empty(group.Tasks);
        var unit = Assert.Single(group.Sequences);
        Assert.Equal(3, unit.Items.Count);
        Assert.Single(unit.Items, x => x.Actionable);
        Assert.All(unit.Items.Where(x => !x.Actionable), x => Assert.True(x.IsBlocked));
        Assert.Contains(ReconcileActionTypes.SequenceCarryAll, unit.AllowedActions);
        Assert.Contains(ReconcileActionTypes.SequenceDropAll, unit.AllowedActions);
    }

    [Fact]
    public void One_relevant_sequence_member_falls_back_to_a_task_decision()
    {
        var sequence = Guid.NewGuid();
        var evaluation = Evaluate([
            Task(plannedDaysAgo: 1, sequenceId: sequence, order: 10),
            Task(plannedDaysAgo: -2, sequenceId: sequence, order: 20)
        ]);

        var group = Assert.Single(evaluation.ExecutionGroups);
        Assert.Empty(group.Sequences);
        Assert.Single(group.Tasks);
    }

    [Fact]
    public void A_dropped_predecessor_is_one_structural_unit_with_explicit_resolution()
    {
        var sequence = Guid.NewGuid();
        var dropped = Task(plannedDaysAgo: 5, sequenceId: sequence, order: 10, status: TaskStatuses.Dropped);
        var evaluation = Evaluate([
            dropped,
            Task(plannedDaysAgo: 3, sequenceId: sequence, order: 20),
            Task(plannedDaysAgo: 2, sequenceId: sequence, order: 30)
        ]);

        Assert.Equal(1, evaluation.Counts.ActionableBacklogCount);
        Assert.Null(evaluation.Counts.OldestUnresolvedAgeDays);
        Assert.Contains("DROPPED_PREDECESSOR", evaluation.TriggerReasons);
        var unit = Assert.Single(Assert.Single(evaluation.ExecutionGroups).Sequences);
        Assert.Equal(dropped.Id, unit.DroppedPredecessor!.Id);
        Assert.Equal([ReconcileActionTypes.DetachDroppedPredecessor, ReconcileActionTypes.SequenceDropAll],
            unit.AllowedActions);
        var rule = Assert.Single(evaluation.RuleMatches);
        Assert.Equal("R6", rule.RuleId);
        Assert.Equal(ReconcileRules.CatalogVersion, rule.RuleVersion);
    }

    [Fact]
    public void Deadline_risk_and_protection_remove_the_drop_action()
    {
        var goal = Guid.NewGuid();
        var atRisk = Evaluate([Task(plannedDaysAgo: null, goalId: goal, deadlineInDays: 1)]);
        Assert.Equal("MEDIUM", atRisk.Severity);
        Assert.Equal(1, atRisk.Counts.DeadlineRiskCount);
        Assert.Equal("R3", Assert.Single(atRisk.RuleMatches).RuleId);
        var riskItem = Assert.Single(Assert.Single(atRisk.ExecutionGroups).Tasks);
        Assert.DoesNotContain(ReconcileActionTypes.DropTasks, riskItem.AllowedActions);
        Assert.Null(riskItem.AgeDays);

        Assert.False(Evaluate([Task(plannedDaysAgo: null, goalId: goal, deadlineInDays: 3)]).Eligible);
        Assert.False(Evaluate([Task(plannedDaysAgo: 0, deadlineInDays: 1)]).Eligible);

        var flagged = Assert.Single(Assert.Single(
            Evaluate([Task(plannedDaysAgo: 1, isProtected: true)]).ExecutionGroups).Tasks);
        Assert.True(flagged.IsProtected);
        Assert.DoesNotContain(ReconcileActionTypes.DropTasks, flagged.AllowedActions);

        var withDeadline = Assert.Single(Assert.Single(
            Evaluate([Task(plannedDaysAgo: 1, deadlineInDays: 40)]).ExecutionGroups).Tasks);
        Assert.True(withDeadline.IsProtected);
        Assert.DoesNotContain(ReconcileActionTypes.DropTasks, withDeadline.AllowedActions);
    }

    [Fact]
    public void Review_due_items_use_their_own_lane_and_never_change_execution_severity()
    {
        var parents = Enumerable.Range(0, 10)
            .Select(_ => Parent("Project", reviewDaysAgo: 0)).ToArray();

        var reviewOnly = ReconcileRules.Evaluate(Today, [], parents, 0);
        Assert.True(reviewOnly.Eligible);
        Assert.Equal("NONE", reviewOnly.Severity);
        Assert.Equal(10, reviewOnly.Counts.ReviewDueCount);
        Assert.Equal(0, reviewOnly.Counts.ActionableBacklogCount);
        Assert.Equal(["REVIEW_DUE"], reviewOnly.TriggerReasons);

        var mixed = ReconcileRules.Evaluate(Today, [Task(plannedDaysAgo: 1)], parents, 0);
        Assert.Equal("LIGHT", mixed.Severity);
        Assert.Equal(1, mixed.Counts.ActionableBacklogCount);
    }

    [Fact]
    public void Goal_continuation_obeys_its_cadence_and_undated_tasks_follow_direct_ownership()
    {
        var goal = Parent("Goal", reviewDaysAgo: 1);
        var recentlyDecided = Parent("Goal", reviewDaysAgo: 1, lastDecisionDaysAgo: 29);
        var decidedLongAgo = Parent("Goal", reviewDaysAgo: 1, lastDecisionDaysAgo: 30);
        var project = Parent("Project", reviewDaysAgo: 0);
        var notDue = Parent("Project", reviewDaysAgo: -1);
        var direct = Task(plannedDaysAgo: null, goalId: goal.Id);
        var projectOwned = Task(plannedDaysAgo: null, projectId: project.Id);
        var dated = Task(plannedDaysAgo: -4, projectId: project.Id);

        var evaluation = ReconcileRules.Evaluate(Today, [direct, projectOwned, dated],
            [goal, recentlyDecided, decidedLongAgo, project, notDue], 0);

        Assert.Equal(3, evaluation.Counts.ReviewDueCount);
        Assert.DoesNotContain(evaluation.Reviews, x => x.Id == recentlyDecided.Id || x.Id == notDue.Id);
        var goalReview = evaluation.Reviews.Single(x => x.Id == goal.Id);
        Assert.Equal("GOAL", goalReview.EntityType);
        Assert.Equal(["CONTINUE", "REVIEW_LATER", "ABANDON_GOAL"], goalReview.AllowedActions);
        Assert.Equal(direct.Id, Assert.Single(goalReview.UndatedTasks).Id);
        var projectReview = evaluation.Reviews.Single(x => x.Id == project.Id);
        Assert.Equal(projectOwned.Id, Assert.Single(projectReview.UndatedTasks).Id);
        Assert.Contains("KEEP_WITH_NEW_REVIEW_DATE", projectReview.AllowedActions);
    }

    [Fact]
    public void Carry_all_preserves_relative_offsets_and_classifies_every_remaining_member()
    {
        var sequence = Guid.NewGuid();
        var project = Guid.NewGuid();
        var anchor = Item(sequence, 40, Today.AddDays(-9), project);
        var sameDay = Item(sequence, 50, Today.AddDays(-9), project);
        var later = Item(sequence, 60, Today.AddDays(-6), project);
        var manual = Item(sequence, 70, Today.AddDays(2), project);
        var undated = Item(sequence, 80, null, project);
        var deadline = Item(sequence, 90, Today.AddDays(-2), project, deadline: Today.AddDays(3));
        var completed = Item(sequence, 10, Today.AddDays(-20), project, status: TaskStatuses.Completed);
        var tasks = new[] { anchor, sameDay, later, manual, undated, deadline, completed };
        var request = new ReconcileActionRequest(ReconcileActionTypes.SequenceCarryAll, [], sequence,
            Today.AddDays(1), []);

        var plan = ReconcilePreview.Build(request, Today, tasks, new HashSet<Guid> { manual.Id },
            new Dictionary<Guid, int>(), new Dictionary<Guid, int>());

        Assert.Equal(6, plan.Items.Count);
        Assert.DoesNotContain(plan.Items, x => x.TaskId == completed.Id);
        Assert.Equal(Today.AddDays(1), plan.Items.Single(x => x.TaskId == anchor.Id).ResultingPlannedDate);
        Assert.Equal(Today.AddDays(1), plan.Items.Single(x => x.TaskId == sameDay.Id).ResultingPlannedDate);
        Assert.Equal(Today.AddDays(4), plan.Items.Single(x => x.TaskId == later.Id).ResultingPlannedDate);
        Assert.Equal("HAS_PROTECTED_MANUAL_SCHEDULE", plan.Items.Single(x => x.TaskId == manual.Id).Classification);
        Assert.Equal(Today.AddDays(2), plan.Items.Single(x => x.TaskId == manual.Id).ResultingPlannedDate);
        Assert.Equal("UNSCHEDULED_PARENT_OWNED", plan.Items.Single(x => x.TaskId == undated.Id).Classification);
        Assert.Equal("HAS_TEMPORAL_CONFLICT", plan.Items.Single(x => x.TaskId == deadline.Id).Classification);
        Assert.False(plan.CanApply);

        var withoutConflict = ReconcilePreview.Build(request with { IncludeTaskIds = [manual.Id] }, Today,
            tasks.Where(x => x.Id != deadline.Id).ToArray(), new HashSet<Guid> { manual.Id },
            new Dictionary<Guid, int>(), new Dictionary<Guid, int>());
        Assert.True(withoutConflict.CanApply);
        Assert.Equal("WILL_SHIFT_NORMALLY",
            withoutConflict.Items.Single(x => x.TaskId == manual.Id).Classification);
        Assert.Equal(Today.AddDays(12),
            withoutConflict.Items.Single(x => x.TaskId == manual.Id).ResultingPlannedDate);
        Assert.NotEqual(plan.Hash, withoutConflict.Hash);
    }

    [Fact]
    public void Drop_rejects_protected_tasks_and_warns_when_a_parent_is_left_empty()
    {
        var project = Guid.NewGuid();
        var first = Item(null, null, Today.AddDays(-1), project);
        var second = Item(null, null, Today.AddDays(-2), project);
        var guarded = Item(null, null, Today.AddDays(-1), project, isProtected: true);
        var request = new ReconcileActionRequest(ReconcileActionTypes.DropTasks, [first.Id, second.Id], null,
            null, []);

        var partial = ReconcilePreview.Build(request, Today, [first, second], new HashSet<Guid>(),
            new Dictionary<Guid, int>(), new Dictionary<Guid, int> { [project] = 3 });
        Assert.True(partial.CanApply);
        Assert.Empty(partial.Warnings);

        var emptying = ReconcilePreview.Build(request, Today, [first, second], new HashSet<Guid>(),
            new Dictionary<Guid, int>(), new Dictionary<Guid, int> { [project] = 2 });
        var warning = Assert.Single(emptying.Warnings);
        Assert.Equal("PARENT_LEFT_WITHOUT_ACTIVE_TASKS", warning.Code);
        Assert.Equal([project], warning.AffectedEntityIds);
        Assert.NotEqual(partial.Hash, emptying.Hash);

        var blocked = ReconcilePreview.Build(request with { TaskIds = [first.Id, guarded.Id] }, Today,
            [first, guarded], new HashSet<Guid>(), new Dictionary<Guid, int>(), new Dictionary<Guid, int>());
        Assert.False(blocked.CanApply);
        Assert.Equal("PROTECTED", blocked.Items.Single(x => x.TaskId == guarded.Id).Classification);
    }

    [Fact]
    public void Replan_schedules_an_undated_task_only_with_a_warning_and_the_hash_tracks_versions()
    {
        var goal = Guid.NewGuid();
        var dated = Item(null, null, Today.AddDays(-3), goal);
        var undated = Item(null, null, null, goal);
        var request = new ReconcileActionRequest(ReconcileActionTypes.ReplanTasks, [dated.Id, undated.Id],
            null, Today.AddDays(2), []);

        var plan = ReconcilePreview.Build(request, Today, [dated, undated], new HashSet<Guid>(),
            new Dictionary<Guid, int>(), new Dictionary<Guid, int>());

        Assert.True(plan.CanApply);
        Assert.Equal("WILL_REPLAN", plan.Items.Single(x => x.TaskId == dated.Id).Classification);
        Assert.Equal("WILL_SCHEDULE", plan.Items.Single(x => x.TaskId == undated.Id).Classification);
        Assert.Equal("UNDATED_TASK_SCHEDULED", Assert.Single(plan.Warnings).Code);

        dated.Version++;
        var changed = ReconcilePreview.Build(request, Today, [dated, undated], new HashSet<Guid>(),
            new Dictionary<Guid, int>(), new Dictionary<Guid, int>());
        Assert.NotEqual(plan.Hash, changed.Hash);

        dated.Title = "متن دیگر";
        var renamed = ReconcilePreview.Build(request, Today, [dated, undated], new HashSet<Guid>(),
            new Dictionary<Guid, int>(), new Dictionary<Guid, int>());
        Assert.Equal(changed.Hash, renamed.Hash);
    }

    private static ReconcileEvaluation Evaluate(IReadOnlyList<ReconcileTaskInput> tasks) =>
        ReconcileRules.Evaluate(Today, tasks, [], 0);

    private static ReconcileTaskInput Task(int? plannedDaysAgo, Guid? goalId = null, Guid? projectId = null,
        Guid? sequenceId = null, int? order = null, int carryCount = 0, int? deadlineInDays = null,
        bool isProtected = false, bool keptToday = false, bool keptSinceLastCarry = false,
        string status = TaskStatuses.Active) => new(Guid.NewGuid(), "کار", 1, status, goalId, projectId,
        plannedDaysAgo is { } days ? Today.AddDays(-days) : null,
        deadlineInDays is { } deadline ? Today.AddDays(deadline) : null, sequenceId, order, isProtected,
        carryCount, keptToday, keptSinceLastCarry);

    private static ReconcileParentInput Parent(string type, int reviewDaysAgo, int? lastDecisionDaysAgo = null) =>
        new(type, Guid.NewGuid(), "والد", 1, Today.AddDays(-reviewDaysAgo), null,
            lastDecisionDaysAgo is { } days ? Today.AddDays(-days) : null);

    private static TaskItem Item(Guid? sequenceId, int? order, DateOnly? plannedDate, Guid? projectId,
        DateOnly? deadline = null, bool isProtected = false, string status = TaskStatuses.Active) => new()
    {
        Id = Guid.NewGuid(), UserId = Guid.NewGuid(), ProjectId = projectId, Title = "کار",
        Status = status, PlannedDate = plannedDate, Deadline = deadline, SequenceId = sequenceId,
        SequenceOrder = order, IsProtected = isProtected
    };
}
