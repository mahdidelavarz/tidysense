using TidySense.Common.Commands;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>What a person can do to a Task's place in a sequence by hand (029 §9.2).</summary>
public static class TaskSequenceActions
{
    /// <summary>«بعد از…»: a Task without a sequence follows another of the same owner.</summary>
    public const string Follow = "FOLLOW";
    public const string MoveEarlier = "MOVE_EARLIER";
    public const string MoveLater = "MOVE_LATER";
    /// <summary>The Task leaves its order and stands on its own.</summary>
    public const string Leave = "LEAVE";

    public static bool IsKnown(string? value) => value is Follow or MoveEarlier or MoveLater or Leave;
}

/// <summary>One Task as the planner sees it.</summary>
public sealed record TaskSequenceMember(
    Guid Id,
    string Title,
    string Status,
    Guid? GoalId,
    Guid? ProjectId,
    Guid? SequenceId,
    int? SequenceOrder,
    long Version);

public sealed record TaskSequenceChange(Guid TaskId, Guid? SequenceId, int? SequenceOrder);

/// <summary>The sequence after the action, in order, and every Task whose place changes.</summary>
public sealed record TaskSequencePlan(
    Guid? SequenceId,
    IReadOnlyList<(TaskSequenceMember Member, int Order)> Steps,
    IReadOnlyList<TaskSequenceChange> Changes);

/// <summary>
/// Pure rules for changing a sequence by hand (025 §2–§4, §16; 029 §9.2). A sequence stays linear,
/// same-owner and gap-tolerant; the completed part keeps its order; a sequence with a dropped
/// member is resolved in Reconcile, not here. Only the Task acted on is always re-placed; others
/// keep their order values when they still fit, so as few Tasks as possible change.
/// </summary>
public static class TaskSequencePlanner
{
    private const int Step = 10;

    public static TaskSequencePlan Plan(string action, TaskSequenceMember target, TaskSequenceMember? predecessor,
        IReadOnlyList<TaskSequenceMember> members, Func<Guid> newSequenceId)
    {
        if (!TaskSequenceActions.IsKnown(action)) throw new ArgumentException("action is invalid.");
        if (target.Status != TaskStatuses.Active) throw Rejected("RESOURCE_NOT_ACTIVE");
        Guid sequenceId;
        List<TaskSequenceMember> chain;
        switch (action)
        {
            case TaskSequenceActions.Follow:
                if (predecessor is null) throw new ArgumentException("predecessorId is required.");
                if (predecessor.Id == target.Id) throw Rejected("SEQUENCE_SELF");
                if (target.SequenceId is not null) throw Rejected("SEQUENCE_ALREADY_SET");
                if (predecessor.Status == TaskStatuses.Dropped) throw Rejected("PREDECESSOR_NOT_AVAILABLE");
                if (predecessor.GoalId != target.GoalId || predecessor.ProjectId != target.ProjectId)
                    throw Rejected("SEQUENCE_SCOPE_MISMATCH");
                sequenceId = predecessor.SequenceId ?? newSequenceId();
                chain = predecessor.SequenceId is { } existing ? Ordered(members, existing) : [predecessor];
                RequireNoDropped(chain);
                chain.Insert(chain.FindIndex(x => x.Id == predecessor.Id) + 1, target);
                break;
            case TaskSequenceActions.MoveEarlier or TaskSequenceActions.MoveLater:
                sequenceId = target.SequenceId ?? throw Rejected("NOT_IN_SEQUENCE");
                chain = Ordered(members, sequenceId);
                RequireNoDropped(chain);
                var from = chain.FindIndex(x => x.Id == target.Id);
                var to = action == TaskSequenceActions.MoveEarlier ? from - 1 : from + 1;
                // Only the unresolved part moves: never past a completed step (025 §16).
                if (to < 0 || to >= chain.Count || chain[to].Status != TaskStatuses.Active)
                    throw Rejected("SEQUENCE_MOVE_UNAVAILABLE");
                (chain[from], chain[to]) = (chain[to], chain[from]);
                break;
            default:
                sequenceId = target.SequenceId ?? throw Rejected("NOT_IN_SEQUENCE");
                chain = Ordered(members, sequenceId).Where(x => x.Id != target.Id).ToList();
                break;
        }

        var changes = new List<TaskSequenceChange>();
        if (action == TaskSequenceActions.Leave)
        {
            changes.Add(new TaskSequenceChange(target.Id, null, null));
            // One Task left is no sequence: it stands on its own too.
            if (chain.Count < 2)
            {
                changes.AddRange(chain.Select(x => new TaskSequenceChange(x.Id, null, null)));
                return new TaskSequencePlan(null, [], changes);
            }
        }

        var steps = Assign(chain, sequenceId, action == TaskSequenceActions.Leave ? null : target.Id);
        changes.AddRange(steps.Where(x => x.Member.SequenceId != sequenceId || x.Member.SequenceOrder != x.Order)
            .Select(x => new TaskSequenceChange(x.Member.Id, sequenceId, x.Order)));
        return new TaskSequencePlan(sequenceId, steps, changes);
    }

    /// <summary>
    /// Increasing order values for the chain. A Task keeps its value while it still fits between the
    /// one before and the next completed step; the Task acted on is always placed anew. A new value is
    /// never one another member holds now, so the rows can be written in any order without two of
    /// them ever sharing an order (the database's unique index).
    /// </summary>
    private static List<(TaskSequenceMember Member, int Order)> Assign(List<TaskSequenceMember> chain, Guid sequenceId, Guid? moved)
    {
        var steps = new List<(TaskSequenceMember Member, int Order)>();
        var held = chain.Where(x => x.SequenceId == sequenceId && x.SequenceOrder is not null)
            .Select(x => x.SequenceOrder!.Value).ToHashSet();
        int? Free(int from, int ceiling)
        {
            for (var candidate = from; candidate < ceiling; candidate++)
                if (!held.Contains(candidate)) return candidate;
            return null;
        }
        var previous = 0;
        for (var index = 0; index < chain.Count; index++)
        {
            var member = chain[index];
            var ceiling = chain.Skip(index + 1)
                .Where(x => x.Status == TaskStatuses.Completed && x.SequenceId == sequenceId && x.SequenceOrder is not null)
                .Select(x => x.SequenceOrder!.Value).DefaultIfEmpty(int.MaxValue).Min();
            int order;
            if (member.Id != moved && member.SequenceId == sequenceId && member.SequenceOrder is { } kept &&
                kept > previous && kept < ceiling) order = kept;
            else
            {
                var chosen = (previous + Step < ceiling ? Free(previous + Step, ceiling) : null) ?? Free(previous + 1, ceiling);
                order = chosen ?? throw Rejected("SEQUENCE_ORDER_FULL");
                held.Add(order);
            }
            steps.Add((member, order));
            previous = order;
        }
        return steps;
    }

    private static List<TaskSequenceMember> Ordered(IEnumerable<TaskSequenceMember> members, Guid sequenceId) =>
        members.Where(x => x.SequenceId == sequenceId)
            .OrderBy(x => x.SequenceOrder).ThenBy(x => x.Id).ToList();

    private static void RequireNoDropped(IEnumerable<TaskSequenceMember> chain)
    {
        // A dropped step keeps the rest waiting until it is resolved explicitly in Reconcile (025 §4).
        if (chain.Any(x => x.Status == TaskStatuses.Dropped)) throw Rejected("SEQUENCE_NEEDS_RECONCILE");
    }

    private static CommandRejectedException Rejected(string code) => new(code);
}
