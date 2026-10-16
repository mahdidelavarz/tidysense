using TidySense.Common.Commands;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

/// <summary>The pure rules of changing a sequence by hand (025 §2–§4, §16; 029 §9.2).</summary>
public sealed class TaskSequencePlannerTests
{
    private static readonly Guid Project = Guid.NewGuid();
    private static readonly Guid Sequence = Guid.NewGuid();
    private static readonly Guid Fresh = Guid.NewGuid();

    private static TaskSequenceMember Task(string title, int? order = null, string status = TaskStatuses.Active,
        Guid? project = null, Guid? sequence = null) =>
        new(Guid.NewGuid(), title, status, null, project ?? Project, order is null ? sequence : sequence ?? Sequence, order, 1);

    private static TaskSequencePlan Plan(string action, TaskSequenceMember target, TaskSequenceMember? predecessor,
        params TaskSequenceMember[] members) => TaskSequencePlanner.Plan(action, target, predecessor, members, () => Fresh);

    private static string Code(Action act) => Assert.Throws<CommandRejectedException>(act).ErrorCode;

    [Fact]
    public void Following_a_task_without_a_sequence_starts_one_for_both()
    {
        var first = Task("الف");
        var second = Task("ب");
        var plan = Plan(TaskSequenceActions.Follow, second, first);
        Assert.Equal(Fresh, plan.SequenceId);
        Assert.Equal(["الف", "ب"], plan.Steps.Select(x => x.Member.Title));
        Assert.Equal([10, 20], plan.Steps.Select(x => x.Order));
        Assert.Equal(2, plan.Changes.Count);
    }

    [Fact]
    public void Following_a_middle_step_inserts_after_it_and_moves_as_few_tasks_as_possible()
    {
        var a = Task("الف", 10);
        var b = Task("ب", 20);
        var c = Task("ج", 21);
        var joining = Task("د");
        var plan = Plan(TaskSequenceActions.Follow, joining, a, a, b, c);
        Assert.Equal(["الف", "د", "ب", "ج"], plan.Steps.Select(x => x.Member.Title));
        // New values never repeat one held now, so the rows can be written in any order.
        Assert.Equal([10, 22, 32, 42], plan.Steps.Select(x => x.Order));
        // «الف» keeps its order; the rest shift to stay after the newcomer.
        Assert.DoesNotContain(plan.Changes, x => x.TaskId == a.Id);
    }

    [Fact]
    public void A_step_moves_within_the_unresolved_part_and_never_past_a_completed_one()
    {
        var done = Task("انجام‌شده", 10, TaskStatuses.Completed);
        var a = Task("الف", 20);
        var b = Task("ب", 30);
        var plan = Plan(TaskSequenceActions.MoveEarlier, b, null, done, a, b);
        Assert.Equal(["انجام‌شده", "ب", "الف"], plan.Steps.Select(x => x.Member.Title));
        Assert.Equal([10, 21, 31], plan.Steps.Select(x => x.Order));
        Assert.DoesNotContain(plan.Changes, x => x.TaskId == done.Id);

        Assert.Equal("SEQUENCE_MOVE_UNAVAILABLE", Code(() => Plan(TaskSequenceActions.MoveEarlier, a, null, done, a, b)));
        Assert.Equal("SEQUENCE_MOVE_UNAVAILABLE", Code(() => Plan(TaskSequenceActions.MoveLater, b, null, done, a, b)));
    }

    [Fact]
    public void Leaving_takes_the_task_out_and_one_task_left_is_no_sequence()
    {
        var a = Task("الف", 10);
        var b = Task("ب", 20);
        var c = Task("ج", 30);
        var plan = Plan(TaskSequenceActions.Leave, b, null, a, b, c);
        Assert.Equal(["الف", "ج"], plan.Steps.Select(x => x.Member.Title));
        Assert.Equal(new TaskSequenceChange(b.Id, null, null), Assert.Single(plan.Changes));

        var pair = Plan(TaskSequenceActions.Leave, b, null, a, b);
        Assert.Empty(pair.Steps);
        Assert.Equal([b.Id, a.Id], pair.Changes.Select(x => x.TaskId));
        Assert.All(pair.Changes, x => Assert.Null(x.SequenceId));
    }

    [Fact]
    public void Only_an_active_task_of_the_same_owner_without_a_sequence_follows_and_a_dropped_step_waits_for_reconcile()
    {
        var a = Task("الف", 10);
        var loose = Task("ب");
        Assert.Equal("SEQUENCE_SELF", Code(() => Plan(TaskSequenceActions.Follow, loose, loose)));
        Assert.Equal("SEQUENCE_ALREADY_SET", Code(() => Plan(TaskSequenceActions.Follow, a, loose, a)));
        Assert.Equal("SEQUENCE_SCOPE_MISMATCH", Code(() => Plan(TaskSequenceActions.Follow, loose,
            Task("دیگر", project: Guid.NewGuid()))));
        Assert.Equal("PREDECESSOR_NOT_AVAILABLE", Code(() => Plan(TaskSequenceActions.Follow, loose,
            Task("کنار", status: TaskStatuses.Dropped))));
        Assert.Equal("RESOURCE_NOT_ACTIVE", Code(() => Plan(TaskSequenceActions.Follow,
            Task("تمام", status: TaskStatuses.Completed), a, a)));
        Assert.Equal("NOT_IN_SEQUENCE", Code(() => Plan(TaskSequenceActions.Leave, loose, null)));

        var dropped = Task("کنار", 20, TaskStatuses.Dropped);
        var b = Task("ج", 30);
        Assert.Equal("SEQUENCE_NEEDS_RECONCILE", Code(() => Plan(TaskSequenceActions.MoveEarlier, b, null, a, dropped, b)));
        Assert.Equal("SEQUENCE_NEEDS_RECONCILE", Code(() => Plan(TaskSequenceActions.Follow, loose, a, a, dropped, b)));
        // Leaving is how a person takes a Task out of such a sequence themselves.
        Assert.Single(Plan(TaskSequenceActions.Leave, b, null, a, dropped, b).Changes);
    }
}
