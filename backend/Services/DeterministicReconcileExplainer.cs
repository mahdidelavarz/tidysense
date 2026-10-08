using TidySense.Common.Events;

namespace TidySense.Services;

/// <summary>
/// The sample explainer used when no provider is selected. It writes fixed sentences per rule and
/// points at the first allowed action, so the whole review and apply path works without a model.
/// Its output is validated like any other and is labelled as a sample in the client.
/// </summary>
public sealed class DeterministicReconcileExplainer : IReconcileExplainer
{
    public const string SampleKey = "reconcile.sample";
    private const int MaxRecommendations = 5;

    private static readonly Dictionary<string, string> Sentences = new(StringComparer.Ordinal)
    {
        ["R1"] = "این کار چند بار به تاریخ دیگری منتقل شده است. می‌توانید تاریخ تازه‌ای برایش انتخاب کنید.",
        ["R2"] = "از تاریخ برنامه‌ریزی این کار مدتی گذشته است. می‌توانید آن را به تاریخ تازه‌ای منتقل کنید.",
        ["R3"] = "مهلت این کار نزدیک است و تاریخی پیش رو ندارد. می‌توانید برایش تاریخ تعیین کنید.",
        ["R6"] = "کار اول این دنباله کنار گذاشته شده است و کارهای بعدی منتظر تصمیم شما هستند."
    };

    public string Key => SampleKey;

    public Task<ReconcileExplanationContent> ExplainAsync(ReconcileExplanationRequest request,
        CancellationToken cancellationToken)
    {
        var recommendations = new List<ReconcileRecommendationContent>();
        foreach (var group in request.Context.Groups)
        {
            foreach (var sequence in group.Units.Where(x => x.Kind == ReconcileUnitKinds.Sequence))
                recommendations.Add(new ReconcileRecommendationContent([sequence.Ref], sequence.RuleIds[0],
                    sequence.AllowedActions.Contains(ReconcileActionTypes.DetachDroppedPredecessor)
                        ? ReconcileActionTypes.DetachDroppedPredecessor : sequence.AllowedActions[0],
                    Sentences[sequence.RuleIds[0]]));
            // Tasks of one owner that matched the same rule become one consolidated recommendation.
            foreach (var matched in group.Units
                         .Where(x => x.Kind == ReconcileUnitKinds.Task &&
                             x.AllowedActions.Contains(ReconcileActionTypes.ReplanTasks))
                         .GroupBy(x => x.RuleIds[0]))
                recommendations.Add(new ReconcileRecommendationContent(matched.Select(x => x.Ref).ToArray(),
                    matched.Key, ReconcileActionTypes.ReplanTasks, Sentences[matched.Key]));
        }
        return Task.FromResult(new ReconcileExplanationContent(
            "این یک توضیح نمونه است. چند مورد با قاعده‌های بازبینی تطبیق داشته‌اند و برای هر کدام یک اقدام مجاز پیشنهاد شده است.",
            recommendations.Take(MaxRecommendations).ToArray()));
    }
}
