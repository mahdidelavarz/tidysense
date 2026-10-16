using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Tasks;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// A person's own changes to a sequence (029 §9.2): follow another Task, move within the unresolved
/// part, or leave the order. The server builds the preview and stores nothing; the change is one
/// command on the Task acted on, refused when any Task the preview named has changed since, and
/// every other Task it re-places is a cascade the person saw in the preview.
/// </summary>
public sealed class TaskSequenceService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands,
    TaskService tasks)
{
    public async Task<TaskSequencePreviewDto> PreviewAsync(Guid id, TaskSequenceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (plan, involved) = await PlanAsync(db, currentUser.UserId, id, request.Action, request.PredecessorId,
                Guid.NewGuid, cancellationToken);
            return ToPreview(request.Action, id, plan, involved);
        }
        catch (CommandRejectedException rejected)
        {
            // Outside a command a refusal is reported with its own code, as a command's is.
            throw new DomainRuleException(rejected.ErrorCode, "The sequence change is not possible.");
        }
    }

    public async Task<TaskDto> ChangeAsync(Guid id, ChangeTaskSequenceRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CHANGE_TASK_SEQUENCE",
            new
            {
                id, request.Action, request.PredecessorId,
                expected = request.ExpectedMembers.OrderBy(x => x.TaskId).Select(x => $"{x.TaskId}:{x.Version}")
            }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            // The sequences involved are serialised as every sequence write is; then their Tasks are locked.
            var snapshot = await context.Tasks.AsNoTracking()
                .Where(x => x.UserId == owner && (x.Id == id || x.Id == request.PredecessorId))
                .Select(x => x.SequenceId).ToListAsync(ct);
            await TaskService.LockSequencesAsync(context, snapshot.OfType<Guid>(), ct);
            var (plan, involved) = await PlanAsync(context, owner, id, request.Action, request.PredecessorId,
                Guid.NewGuid, ct);

            // Applied only to exactly what was previewed (025 §16).
            var expected = request.ExpectedMembers.ToDictionary(x => x.TaskId, x => x.Version);
            if (expected.Count != request.ExpectedMembers.Count || expected.Count != involved.Count ||
                involved.Any(x => !expected.ContainsKey(x.Id)))
                throw new CommandRejectedException("SEQUENCE_PREVIEW_STALE");
            var locked = new Dictionary<Guid, TaskItem>();
            foreach (var member in involved.OrderBy(x => x.Id))
            {
                var item = await TaskService.LockOwnedAsync(context, member.Id, owner, ct);
                VersionGuard.RequireMatch(item.Id, expected[item.Id], item.Version);
                locked[item.Id] = item;
            }

            CommandMutation? main = null;
            var cascades = new List<CascadeEvent>();
            foreach (var change in plan.Changes)
            {
                var item = locked[change.TaskId];
                var changed = new List<string>();
                if (item.SequenceId != change.SequenceId) { item.SequenceId = change.SequenceId; changed.Add("sequenceId"); }
                if (item.SequenceOrder != change.SequenceOrder) { item.SequenceOrder = change.SequenceOrder; changed.Add("sequenceOrder"); }
                item.Version++;
                item.UpdatedAt = now;
                var payload = JsonSerializer.Serialize(new { changedFields = changed });
                if (item.Id == id)
                    main = new CommandMutation("Task", id, item.Version, TaskEventTypes.TaskUpdated, 1, payload, now);
                else
                    // The person confirmed this exact Task in the preview.
                    cascades.Add(new CascadeEvent("Task", item.Id, item.Version, TaskEventTypes.TaskUpdated, 1,
                        payload, EventActors.User));
            }
            return (main ?? throw new CommandRejectedException("NO_CHANGES")) with { CascadeEvents = cascades };
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await tasks.GetByIdAsync(id, cancellationToken);
    }

    /// <summary>The plan from current state, and every Task it reads: the Task, the one to follow, and their sequences.</summary>
    private static async Task<(TaskSequencePlan Plan, IReadOnlyList<TaskSequenceMember> Involved)> PlanAsync(
        AppDbContext context, Guid owner, Guid id, string action, Guid? predecessorId, Func<Guid> newSequenceId,
        CancellationToken cancellationToken)
    {
        if (!TaskSequenceActions.IsKnown(action)) throw new ArgumentException("action is invalid.");
        if (action == TaskSequenceActions.Follow && predecessorId is null)
            throw new ArgumentException("predecessorId is required.");
        var target = await Member(context, owner, id, cancellationToken) ?? throw new ResourceNotFoundException("Task", id);
        var predecessor = action == TaskSequenceActions.Follow
            ? await Member(context, owner, predecessorId!.Value, cancellationToken)
                ?? throw new ResourceNotFoundException("Task", predecessorId.Value)
            : null;
        var sequences = new[] { target.SequenceId, predecessor?.SequenceId }.OfType<Guid>().Distinct().ToArray();
        var members = await context.Tasks.AsNoTracking()
            .Where(x => x.UserId == owner && x.SequenceId != null && sequences.Contains(x.SequenceId.Value))
            .Select(x => new TaskSequenceMember(x.Id, x.Title, x.Status, x.GoalId, x.ProjectId, x.SequenceId,
                x.SequenceOrder, x.Version))
            .ToListAsync(cancellationToken);
        var plan = TaskSequencePlanner.Plan(action, target, predecessor, members, newSequenceId);
        var involved = members.Append(target).Concat(predecessor is null ? [] : [predecessor])
            .DistinctBy(x => x.Id).ToArray();
        return (plan, involved);
    }

    private static Task<TaskSequenceMember?> Member(AppDbContext context, Guid owner, Guid id,
        CancellationToken cancellationToken) =>
        context.Tasks.AsNoTracking().Where(x => x.Id == id && x.UserId == owner)
            .Select(x => new TaskSequenceMember(x.Id, x.Title, x.Status, x.GoalId, x.ProjectId, x.SequenceId,
                x.SequenceOrder, x.Version))
            .SingleOrDefaultAsync(cancellationToken);

    private static TaskSequencePreviewDto ToPreview(string action, Guid id, TaskSequencePlan plan,
        IReadOnlyList<TaskSequenceMember> involved)
    {
        var changed = plan.Changes.Select(x => x.TaskId).ToHashSet();
        var steps = new List<TaskSequenceStepDto>();
        var unresolvedBefore = false;
        foreach (var (member, _) in plan.Steps)
        {
            steps.Add(new TaskSequenceStepDto(member.Id, member.Title, member.Status, changed.Contains(member.Id),
                member.Status == TaskStatuses.Active && unresolvedBefore));
            if (member.Status != TaskStatuses.Completed) unresolvedBefore = true;
        }
        return new TaskSequencePreviewDto(action, id, steps,
            involved.OrderBy(x => x.Id).Select(x => new TaskVersionRefDto(x.Id, x.Version)).ToArray());
    }
}
