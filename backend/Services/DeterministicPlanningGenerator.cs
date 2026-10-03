using TidySense.Models;

namespace TidySense.Services;

public static class PlanningFixtures
{
    public const string NarrowTask = "narrow-task";
    public const string Blocked = "blocked";
    public const string Repairable = "repairable";
    public const string Empty = "empty";
    public const string InvalidTwoGoals = "invalid-two-goals";
    public const string InvalidParent = "invalid-parent";
    public const string InvalidOversized = "invalid-oversized";
    public const string WrongContext = "wrong-context";
    public const string ProviderError = "provider-error";
    public const string Clarify = "clarify";
    public const string ClarifyAlways = "clarify-always";
    public const string InputBlocked = "input-blocked";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        NarrowTask, Blocked, Repairable, Empty, InvalidTwoGoals, InvalidParent, InvalidOversized,
        WrongContext, ProviderError, Clarify, ClarifyAlways, InputBlocked
    };
}

/// <summary>
/// The stand-in for a planning model until a real provider exists. The same intention and context
/// always produce the same draft. Named fixtures reproduce the valid, blocked, repairable and
/// invalid outputs the rest of the planning flow must handle; they are selectable only in
/// development and tests.
/// </summary>
public sealed class DeterministicPlanningGenerator : IPlanningGenerator
{
    private const int Friday = 5;

    public string Key => "deterministic-mock";

    public Task<PlanningGenerationResult> GenerateAsync(PlanningGenerationRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var context = request.Context;
        if (Clarification(request) is { } clarification)
            return Task.FromResult(new PlanningGenerationResult(null, context.Fingerprint)
            {
                Outcome = clarification.BlockReason is null
                    ? PlanningOutcomes.Clarification : PlanningOutcomes.InputBlocked,
                Clarification = clarification
            });
        var draft = request.Fixture switch
        {
            PlanningFixtures.ProviderError => throw new InvalidOperationException("The mock provider failed."),
            PlanningFixtures.NarrowTask => NarrowTask(request.Intention, context),
            PlanningFixtures.Blocked => Blocked(context),
            PlanningFixtures.Repairable => Repairable(context),
            PlanningFixtures.Empty => Content(context,
                "برای این درخواست پیشنهاد روشنی ساخته نشد.", [], [], [],
                [], [new PlanningNote(null, "می‌خواهید روی کدام بخش از این موضوع تمرکز کنید؟")]),
            PlanningFixtures.InvalidTwoGoals => Content(context, "دو هدف مستقل",
                [Goal("g1", "هدف اول", "نتیجه اول"), Goal("g2", "هدف دوم", "نتیجه دوم")]),
            PlanningFixtures.InvalidParent => Content(context, "والد نامعتبر",
                [Step("t1", "کار بدون والد واقعی", context.WindowStart, parent: "missing")]),
            PlanningFixtures.InvalidOversized => Content(context, "بیش از سقف",
                Enumerable.Range(1, PlanningLimits.Tasks + 1)
                    .Select(x => Step($"t{x}", $"کار {x}", context.WindowStart)).ToArray()),
            _ => Default(request.Intention, context)
        };
        return Task.FromResult(new PlanningGenerationResult(draft,
            request.Fixture == PlanningFixtures.WrongContext ? new string('0', 64) : context.Fingerprint));
    }

    /// <summary>
    /// The clarification fixtures: "clarify" asks once and then drafts, "clarify-always" asks
    /// whenever it is asked to generate (so the turn budget can be exercised), "input-blocked"
    /// refuses the input.
    /// </summary>
    private static PlanningClarification? Clarification(PlanningGenerationRequest request) => request.Fixture switch
    {
        PlanningFixtures.InputBlocked => new PlanningClarification([], PlanningBlockReasons.TooVague,
            "این درخواست برای برنامه‌ریزی خیلی کلی است. بنویسید می‌خواهید روی چه چیزی کار کنید."),
        PlanningFixtures.Clarify when request.Turns.Count == 0 && request.AllowClarification =>
            new PlanningClarification(
            [
                new PlanningQuestion("q1", "هر هفته چند روز می‌توانید برای این کار وقت بگذارید؟"),
                new PlanningQuestion("q2", "آیا تاریخ مشخصی برای رسیدن به نتیجه در نظر دارید؟")
            ], null, null),
        PlanningFixtures.ClarifyAlways => new PlanningClarification(
            [new PlanningQuestion("q1", $"پرسش شماره {request.Turns.Count + 1}: دقیق‌تر توضیح می‌دهید؟")], null, null),
        _ => null
    };

    /// <summary>
    /// A full hierarchy for a broad intention, or only the next steps when planning started inside
    /// a Goal or a Project. It never proposes a planning detail the scope already holds.
    /// </summary>
    private static PlanningDraftContent Default(string intention, PlanningContext context)
    {
        var title = Short(intention);
        var scope = context.Scope?.Type;
        var first = NextFree(context, context.WindowStart);
        var second = first is { } a ? NextFree(context, a.AddDays(1)) : null;
        var third = second is { } b ? NextFree(context, b.AddDays(2)) : null;
        var proposals = new List<PlanningProposal>();
        string? goalId = null, projectId = null;
        if (scope is null)
        {
            goalId = "goal";
            proposals.Add(Goal(goalId, title, intention.Trim()));
        }
        if (scope != PlanningContextTypes.Project)
        {
            projectId = "project";
            proposals.Add(Project(projectId, "گام نخست", "سه قدم اول انجام شده باشد.", goalId,
                underContext: scope is not null));
        }
        var stepContext = projectId is null;
        proposals.Add(Step("step-1", "روشن‌کردن اولین قدم", first, projectId, stepContext));
        proposals.Add(Step("step-2", "انجام اولین قدم", second, projectId, stepContext));
        proposals.Add(Step("step-3", "مرور پیشرفت هفته", third, projectId, stepContext));
        if (scope != PlanningContextTypes.Project)
            proposals.Add(Step("resources", "فهرست‌کردن منابع لازم", null, goalId, scope is not null));
        var blockedDays = context.Facts.Where(x => x.Strength == PlanningFactStrengths.Hard)
            .SelectMany(x => x.Value.Weekdays ?? []).ToHashSet();
        var practiceDays = new[] { 1, 3, 6 }.Where(x => !blockedDays.Contains(x)).ToArray();
        if (practiceDays.Length > 0)
            proposals.Add(Routine("practice", "تمرین منظم",
                new PlanningRecurrence(RecurrenceTypes.SpecificWeekdays, practiceDays, null), goalId,
                scope is not null));

        var scopeId = scope is null ? goalId : null;
        var facts = new[]
        {
            new PlanningFactProposal("fact-friday", PlanningFactTypes.UnavailableWeekday,
                PlanningFactStrengths.Hard, new PlanningFactValue([Friday], null, null, null, null), scopeId, true),
            new PlanningFactProposal("fact-device", PlanningFactTypes.AvailableDevice,
                PlanningFactStrengths.Informational,
                new PlanningFactValue(null, null, null, null, "گوشی همراه"), scopeId, true)
        }.Where(x => context.Facts.All(known =>
            PlanningFactCatalog.Key(known.FactType, known.Value) != PlanningFactCatalog.Key(x.FactType, x.Value)));

        return Content(context, $"پیش‌نویس نمونه برای «{title}»: یک مسیر کوتاه برای هفت روز آینده.",
            proposals, facts.ToArray(),
            [new PlanningNote("step-1", "تاریخ‌ها پیشنهادی‌اند و می‌توانید آن‌ها را تغییر دهید.")],
            [new PlanningWarning(null, PlanningSeverities.Info, PlanningWarningCodes.AssumedDates)]);
    }

    private static PlanningDraftContent NarrowTask(string intention, PlanningContext context) =>
        Content(context, "یک کار مستقل برای این درخواست.",
            [Step("task", Short(intention), NextFree(context, context.WindowStart.AddDays(1)), source: "EXPLICIT")],
            assumptions: [new PlanningNote("task", "تاریخ فردا فرض شده است.")]);

    /// <summary>Every review-level block at once: an ambiguous Goal with a dependent child, an unsupported recurrence, a date beyond the window and a HARD conflict.</summary>
    private static PlanningDraftContent Blocked(PlanningContext context)
    {
        var tomorrow = context.WindowStart.AddDays(1);
        return Content(context, "پیش‌نویسی با موارد نیازمند اصلاح.",
            [
                Goal("goal", "هدف مبهم", "بهتر شدن"),
                Step("child", "کار وابسته به هدف", context.WindowStart, "goal"),
                Routine("weekly", "مرور هفتگی", new PlanningRecurrence("WEEKLY", null, null)),
                Step("far", "کار خارج از هفته", context.WindowEnd.AddDays(3)),
                Step("ready", "کار آماده", context.WindowStart),
                Project("side", "پروژه جانبی", null),
                Step("clash", "کار در روز غیرممکن", tomorrow, "side")
            ],
            [
                new PlanningFactProposal("fact-day", PlanningFactTypes.UnavailableWeekday,
                    PlanningFactStrengths.Hard,
                    new PlanningFactValue([RoutineSchedule.IsoDayOfWeek(tomorrow)], null, null, null, null),
                    "side", true)
            ],
            warnings: [new PlanningWarning("goal", PlanningSeverities.Blocking, PlanningWarningCodes.GoalOutcomeAmbiguous)]);
    }

    /// <summary>Formatting defects and a missing checkpoint that the single repair pass fixes.</summary>
    private static PlanningDraftContent Repairable(PlanningContext context) =>
        Content(context, "  پیش‌نویس با قالب نامرتب  ",
            [
                Project("project", "  پروژه نامرتب  ", "   ") with { ReviewDate = null, ReviewDateSource = null },
                Step("task", " کار نامرتب ", context.WindowStart, "project") with { Description = "  " }
            ]);

    private static PlanningDraftContent Content(PlanningContext context, string summary,
        IReadOnlyList<PlanningProposal> proposals, IReadOnlyList<PlanningFactProposal>? facts = null,
        IReadOnlyList<PlanningNote>? assumptions = null, IReadOnlyList<PlanningWarning>? warnings = null,
        IReadOnlyList<PlanningNote>? questions = null) =>
        new(summary, context.WindowStart, context.WindowEnd, proposals, facts ?? [], assumptions ?? [],
            warnings ?? [], questions ?? []);

    private static PlanningProposal Goal(string id, string title, string outcome) =>
        new(id, PlanningEntityTypes.Goal, title, null, null, false, "EXPLICIT", "HIGH", true, outcome, null,
            null, null, null, null, null, null, null, null);

    private static PlanningProposal Project(string id, string title, string? meaning, string? parent = null,
        bool underContext = false) =>
        new(id, PlanningEntityTypes.Project, title, null, parent, underContext, "INFERRED", "MEDIUM", true,
            null, meaning, null, null, null, null, null, null, null, null);

    private static PlanningProposal Step(string id, string title, DateOnly? plannedDate, string? parent = null,
        bool underContext = false, string source = "INFERRED") =>
        new(id, PlanningEntityTypes.Task, title, null, parent, underContext, source, "MEDIUM", true, null,
            null, null, null, null, plannedDate, null, null, null, null);

    private static PlanningProposal Routine(string id, string title, PlanningRecurrence recurrence,
        string? parent = null, bool underContext = false) =>
        new(id, PlanningEntityTypes.Routine, title, null, parent, underContext, "INFERRED", "MEDIUM", true,
            null, null, null, null, null, null, null, recurrence, [], null);

    /// <summary>The first date in the window, from <paramref name="from"/>, that no HARD detail rules out. Friday is avoided because the mock proposes it as unavailable.</summary>
    private static DateOnly? NextFree(PlanningContext context, DateOnly from)
    {
        var hard = context.Facts.Where(x => x.Strength == PlanningFactStrengths.Hard).ToArray();
        for (var date = from; date <= context.WindowEnd; date = date.AddDays(1))
        {
            var weekday = RoutineSchedule.IsoDayOfWeek(date);
            if (weekday == Friday || hard.Any(x =>
                    x.Value.Weekdays?.Contains(weekday) == true || x.Value.LocalDate == date ||
                    (x.Value.StartLocalDate <= date && x.Value.EndLocalDate >= date))) continue;
            return date;
        }
        return null;
    }

    private static string Short(string intention)
    {
        var text = intention.Trim();
        return text.Length <= 80 ? text : text[..80];
    }
}
