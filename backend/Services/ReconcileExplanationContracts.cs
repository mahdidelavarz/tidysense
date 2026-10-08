using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using TidySense.Common.Events;
using TidySense.DTOs.Reconcile;

namespace TidySense.Services;

public static class ReconcileUnitKinds
{
    public const string Task = "TASK";
    public const string Sequence = "SEQUENCE";
}

/// <summary>
/// One decision of the execution lane as the explanation sees it: codes, counts and flags only.
/// It has no title, no description, no date and no canonical id.
/// </summary>
public sealed record ReconcileExplanationUnit(
    string Ref,
    string Kind,
    IReadOnlyList<string> ReasonCodes,
    IReadOnlyList<string> RuleIds,
    IReadOnlyList<string> AllowedActions,
    int? AgeDays,
    int CarryCount,
    bool IsProtected,
    int? DaysToDeadline,
    int MemberCount,
    int BlockedMemberCount,
    bool HasDroppedPredecessor);

public sealed record ReconcileExplanationGroup(
    string Ref,
    string OwnerType,
    IReadOnlyList<ReconcileExplanationUnit> Units);

/// <summary>Everything the explanation may be told: deterministic evidence that matched a rule.</summary>
public sealed record ReconcileExplanationContext(
    string BuilderVersion,
    string RulesCatalogVersion,
    string Severity,
    int ActionableCount,
    int? OldestAgeDays,
    IReadOnlyList<ReconcileExplanationGroup> Groups)
{
    public IEnumerable<ReconcileExplanationUnit> Units => Groups.SelectMany(x => x.Units);
}

/// <summary>Which canonical work a unit stands for. Kept by the server; never rendered.</summary>
public sealed record ReconcileExplanationTarget(
    string Ref,
    string Kind,
    Guid? SequenceId,
    IReadOnlyList<Guid> TaskIds,
    string EvidenceHash)
{
    /// <summary>The identity that survives between evaluations: the sequence, else the Task.</summary>
    public Guid EntityId => SequenceId ?? TaskIds[0];
}

public sealed record ReconcileExplanationInput(
    ReconcileExplanationContext Context,
    IReadOnlyList<ReconcileExplanationTarget> Targets);

public sealed record ReconcileRecommendationContent(
    IReadOnlyList<string> UnitRefs,
    string RuleId,
    string ActionType,
    string Explanation);

public sealed record ReconcileExplanationContent(
    string Summary,
    IReadOnlyList<ReconcileRecommendationContent> Recommendations);

public sealed record ReconcileExplanationRequest(Guid ExplanationId, Guid UserId, ReconcileExplanationContext Context);

public sealed class ReconcileExplanationException(string failureCode) : Exception(failureCode)
{
    public string FailureCode { get; } = failureCode;
}

public static class ReconcileExplanationFailureCodes
{
    public const string ExplanationInvalid = "EXPLANATION_INVALID";
    public const string ProviderError = "PROVIDER_ERROR";
    public const string GenerationTimeout = "GENERATION_TIMEOUT";
    public const string AiUnavailable = "AI_UNAVAILABLE";
    public const string AiBudgetExhausted = "AI_BUDGET_EXHAUSTED";
    public const string ContextTooLarge = "CONTEXT_TOO_LARGE";
}

/// <summary>
/// Explains deterministic Reconcile evidence and nothing else. An implementation sees only the
/// context it is handed, computes no eligibility or permission and cannot create or change anything.
/// </summary>
public interface IReconcileExplainer
{
    string Key { get; }

    Task<ReconcileExplanationContent> ExplainAsync(ReconcileExplanationRequest request,
        CancellationToken cancellationToken);
}

/// <summary>
/// Builds the explanation context from one deterministic evaluation. Pure. Only decisions that
/// matched a rule are included, so a session without a rule match has nothing to explain.
/// </summary>
public static class ReconcileExplanationContextBuilder
{
    public const string Version = "2026-10-08.1";
    public const int MaxUnits = 30;

    /// <summary>Actions a recommendation may name. Completion is never inferred, so it is not one of them.</summary>
    public static readonly IReadOnlyList<string> TaskActions =
        [ReconcileActionTypes.ReplanTasks, ReconcileActionTypes.DropTasks, ReconcileActionTypes.KeepTasks];

    public static readonly IReadOnlyList<string> SequenceActions =
    [
        ReconcileActionTypes.SequenceCarryAll, ReconcileActionTypes.SequenceDropAll,
        ReconcileActionTypes.DetachDroppedPredecessor
    ];

    /// <summary>Null when no decision matched a rule: the explanation is not eligible.</summary>
    public static ReconcileExplanationInput? Build(ReconcileEvaluation evaluation, DateOnly today)
    {
        var groups = new List<ReconcileExplanationGroup>();
        var targets = new List<ReconcileExplanationTarget>();
        foreach (var owner in evaluation.ExecutionGroups)
        {
            var units = new List<ReconcileExplanationUnit>();
            foreach (var sequence in owner.Sequences)
            {
                var rules = sequence.RuleIds.Concat(sequence.Items.SelectMany(x => x.RuleIds))
                    .Distinct().Order(StringComparer.Ordinal).ToArray();
                var deadlines = sequence.Items.Where(x => x.Deadline is not null)
                    .Select(x => x.Deadline!.Value.DayNumber - today.DayNumber).ToArray();
                Add(units, rules, x => new ReconcileExplanationUnit(x, ReconcileUnitKinds.Sequence,
                        sequence.ReasonCodes, rules,
                        sequence.AllowedActions.Where(a => SequenceActions.Contains(a)).ToArray(),
                        sequence.Items.Max(i => i.AgeDays), sequence.Items.Max(i => i.CarryCount),
                        sequence.Items.Any(i => i.IsProtected), deadlines.Length == 0 ? null : deadlines.Min(),
                        sequence.Items.Count, sequence.Items.Count(i => i.IsBlocked),
                        sequence.DroppedPredecessor is not null),
                    sequence.SequenceId, sequence.Items.Select(x => x.TaskId).ToArray());
            }
            foreach (var task in owner.Tasks)
                Add(units, task.RuleIds, x => new ReconcileExplanationUnit(x, ReconcileUnitKinds.Task,
                        task.ReasonCodes, task.RuleIds, task.AllowedActions.Where(a => TaskActions.Contains(a)).ToArray(),
                        task.AgeDays, task.CarryCount, task.IsProtected,
                        task.Deadline is { } deadline ? deadline.DayNumber - today.DayNumber : null, 1, 0, false),
                    null, [task.TaskId]);
            if (units.Count > 0)
                groups.Add(new ReconcileExplanationGroup($"g{groups.Count + 1}", owner.OwnerType, units));
        }
        if (targets.Count == 0) return null;
        return new ReconcileExplanationInput(new ReconcileExplanationContext(Version, ReconcileRules.CatalogVersion,
            evaluation.Severity, evaluation.Counts.ActionableBacklogCount,
            evaluation.Counts.OldestUnresolvedAgeDays, groups), targets);

        void Add(List<ReconcileExplanationUnit> units, IReadOnlyList<string> rules,
            Func<string, ReconcileExplanationUnit> create, Guid? sequenceId, IReadOnlyList<Guid> taskIds)
        {
            // Each unit is complete on its own, so the cap drops whole decisions and never part of one.
            if (rules.Count == 0 || targets.Count >= MaxUnits) return;
            var unit = create($"u{targets.Count + 1}");
            if (unit.AllowedActions.Count == 0) return;
            units.Add(unit);
            targets.Add(new ReconcileExplanationTarget(unit.Ref, unit.Kind, sequenceId, taskIds, EvidenceHash(unit)));
        }
    }

    /// <summary>The evidence a unit carries, independent of its position in the context.</summary>
    private static string EvidenceHash(ReconcileExplanationUnit unit) => Hash(
        JsonSerializer.Serialize(unit with { Ref = string.Empty }));

    /// <summary>One hash over the evidence of the given targets, in a stable order.</summary>
    public static string Fingerprint(IEnumerable<ReconcileExplanationTarget> targets) => Hash(string.Join('|',
        targets.OrderBy(x => x.EntityId).Select(x => $"{x.EntityId:N}:{x.EvidenceHash}")));

    public static string Manifest(ReconcileExplanationContext context) => JsonSerializer.Serialize(new
    {
        builderVersion = context.BuilderVersion,
        rulesCatalogVersion = context.RulesCatalogVersion,
        groupCount = context.Groups.Count,
        taskUnitCount = context.Units.Count(x => x.Kind == ReconcileUnitKinds.Task),
        sequenceUnitCount = context.Units.Count(x => x.Kind == ReconcileUnitKinds.Sequence),
        ruleIds = context.Units.SelectMany(x => x.RuleIds).Distinct().Order(StringComparer.Ordinal).ToArray()
    });

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
