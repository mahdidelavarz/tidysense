using System.Text;
using System.Text.RegularExpressions;
using TidySense.Common.Commands;
using TidySense.Models;

namespace TidySense.Services;

public static class PlanningLimits
{
    public const int Goals = 1;
    public const int Projects = 5;
    public const int Tasks = 15;
    public const int Routines = 5;
    public const int Proposals = 20;
    public const int Facts = 10;
    public const int FirstWeekEntries = 21;
    public const int Assumptions = 10;
    public const int Warnings = 10;
    public const int UnresolvedQuestions = 5;
    public const int HorizonDays = 7;
    public const int NoteLength = 300;
    public const int SummaryLength = 1000;
}

/// <summary>Reasons an item, or the whole draft, cannot be approved as it stands.</summary>
public static class PlanningIssueCodes
{
    public const string DateOutsideWindow = "DATE_OUTSIDE_WINDOW";
    public const string DateInPast = "DATE_IN_PAST";
    public const string DateAfterDeadline = "DATE_AFTER_DEADLINE";
    public const string StandaloneTaskNeedsDate = "STANDALONE_TASK_NEEDS_DATE";
    public const string HardConstraintConflict = "HARD_CONSTRAINT_CONFLICT";
    public const string UnsupportedRecurrence = "UNSUPPORTED_RECURRENCE";
    public const string InvalidTimes = "INVALID_TIMES";
    public const string StartInPast = "START_IN_PAST";
    public const string TargetInPast = "TARGET_IN_PAST";
    public const string ReviewInPast = "REVIEW_IN_PAST";
    public const string NotAllowedInContext = "NOT_ALLOWED_IN_CONTEXT";
    public const string FactScopeUnsupported = "FACT_SCOPE_UNSUPPORTED";
    public const string FactAlreadyActive = "FACT_ALREADY_ACTIVE";
    public const string FactDatePassed = "FACT_DATE_PASSED";
    public const string FirstWeekOverloaded = "FIRST_WEEK_OVERLOADED";
}

/// <summary>The closed catalogue of warnings a generator may attach. The client owns their wording.</summary>
public static class PlanningWarningCodes
{
    public const string AssumedDates = "ASSUMED_DATES";
    public const string OmittedForLimits = "OMITTED_FOR_LIMITS";
    public const string UnsupportedHardConstraint = "UNSUPPORTED_HARD_CONSTRAINT";
    public const string GoalOutcomeAmbiguous = "GOAL_OUTCOME_AMBIGUOUS";
    public const string SoftPreferenceConflict = "SOFT_PREFERENCE_CONFLICT";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        AssumedDates, OmittedForLimits, UnsupportedHardConstraint, GoalOutcomeAmbiguous, SoftPreferenceConflict
    };
}

public static class PlanningConfirmationWarningCodes
{
    public const string DescendantsExcludedWithParent = "DESCENDANTS_EXCLUDED_WITH_PARENT";
}

public sealed record PlanningIssue(string Code, string Severity, string Origin);

public sealed record PlanningItemState(string State, bool ExcludedByAncestor, IReadOnlyList<PlanningIssue> Issues);

public sealed record PlanningFirstWeekEntry(string DraftId, DateOnly Date);

/// <summary>
/// What a draft is validated against: the current local date, the kind of entity the planning
/// started from, and the planning details already confirmed for that scope.
/// </summary>
public sealed record PlanningRuleContext(
    DateOnly Today,
    string? ContextType,
    IReadOnlyList<PlanningFactData> ActiveContextFacts);

public sealed record PlanningEvaluation(
    IReadOnlyDictionary<string, PlanningItemState> Proposals,
    IReadOnlyDictionary<string, PlanningItemState> Facts,
    IReadOnlyList<PlanningIssue> DraftIssues,
    IReadOnlyList<PlanningFirstWeekEntry> FirstWeek,
    bool CanApply);

public sealed record PlanningConfirmationWarning(
    string WarningId,
    string Code,
    IReadOnlyList<string> AffectedDraftIds,
    string WarningHash);

/// <summary>Exactly what one confirmation will create, with the hash the user's approval is bound to.</summary>
public sealed record PlanningPreview(
    IReadOnlyList<PlanningProposal> Items,
    IReadOnlyList<PlanningFactProposal> Facts,
    IReadOnlyList<PlanningConfirmationWarning> Warnings,
    bool NoFactsRemembered,
    bool CanApply,
    string Hash);

/// <summary>
/// Pure, deterministic rules for a planning draft. Structural defects make a draft unusable
/// (generation fails, an edit is refused). Everything else is a review state: an item that cannot
/// be approved is blocked until the user corrects or excludes it. Nothing here consults a model.
/// </summary>
public static partial class PlanningDraftRules
{
    public const string ContextScopeKey = "#CONTEXT";
    private const int GoalReviewDays = 90;
    private const int ProjectReviewDays = 30;

    [GeneratedRegex("^[A-Za-z0-9_-]{1,40}$")]
    private static partial Regex DraftIdPattern();

    /// <summary>
    /// The one bounded repair: normalise text, drop fields that do not belong to an entity type,
    /// and fill the deterministic review-date defaults. It never changes what is proposed, who
    /// owns it, when it is planned or how it recurs.
    /// </summary>
    public static PlanningDraftContent Repair(PlanningDraftContent content, DateOnly today) => content with
    {
        Summary = (content.Summary ?? string.Empty).Trim(),
        Proposals = (content.Proposals ?? []).Select(x => Repair(x, today)).ToArray(),
        Facts = (content.Facts ?? []).Select(x => x with
        {
            Value = PlanningFactCatalog.IsKnown(x.FactType)
                ? PlanningFactCatalog.Normalize(x.FactType, x.Value) ?? x.Value
                : x.Value
        }).ToArray(),
        Assumptions = (content.Assumptions ?? []).Select(Trimmed).ToArray(),
        Warnings = content.Warnings ?? [],
        UnresolvedQuestions = (content.UnresolvedQuestions ?? []).Select(Trimmed).ToArray()
    };

    private static PlanningNote Trimmed(PlanningNote note) => note with { Text = (note.Text ?? string.Empty).Trim() };

    private static PlanningProposal Repair(PlanningProposal value, DateOnly today)
    {
        var isGoal = value.EntityType == PlanningEntityTypes.Goal;
        var isProject = value.EntityType == PlanningEntityTypes.Project;
        var isTask = value.EntityType == PlanningEntityTypes.Task;
        var isRoutine = value.EntityType == PlanningEntityTypes.Routine;
        var hasCheckpoint = isGoal || isProject;
        var reviewDate = hasCheckpoint ? value.ReviewDate : null;
        var reviewSource = hasCheckpoint ? value.ReviewDateSource : null;
        if (hasCheckpoint && reviewDate is null)
        {
            // A missing checkpoint is product policy, never a question and never a model guess.
            var next = today.AddDays(isGoal ? GoalReviewDays : ProjectReviewDays);
            reviewDate = value.TargetDate is { } target && target >= today && target < next ? target : next;
            reviewSource = ReviewDateSources.SystemDefault;
        }
        return value with
        {
            Title = (value.Title ?? string.Empty).Trim(),
            Description = Optional(value.Description),
            DesiredOutcome = isGoal ? Optional(value.DesiredOutcome) : null,
            CompletionMeaning = isProject ? Optional(value.CompletionMeaning) : null,
            TargetDate = hasCheckpoint ? value.TargetDate : null,
            ReviewDate = reviewDate,
            ReviewDateSource = reviewSource,
            PlannedDate = isTask ? value.PlannedDate : null,
            Deadline = isTask ? value.Deadline : null,
            Recurrence = isRoutine ? value.Recurrence : null,
            TimesOfDay = isRoutine ? value.TimesOfDay ?? [] : null,
            EffectiveFromLocalDate = isRoutine ? value.EffectiveFromLocalDate : null
        };
    }

    private static string? Optional(string? value)
    {
        var text = value?.Trim();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    /// <summary>
    /// Defects that make the content unusable as a draft. An empty result means it can be stored
    /// and reviewed; it does not mean every item can be approved.
    /// </summary>
    public static IReadOnlyList<string> StructuralErrors(PlanningDraftContent content, string? contextType)
    {
        var errors = new SortedSet<string>(StringComparer.Ordinal);
        if (content.Summary.Length is 0 or > PlanningLimits.SummaryLength) errors.Add("SUMMARY_INVALID");
        if (content.WindowEnd < content.WindowStart ||
            content.WindowEnd.DayNumber - content.WindowStart.DayNumber > PlanningLimits.HorizonDays - 1)
            errors.Add("WINDOW_INVALID");

        var proposals = content.Proposals;
        if (proposals.Count > PlanningLimits.Proposals) errors.Add("TOO_MANY_PROPOSALS");
        if (Count(PlanningEntityTypes.Goal) > PlanningLimits.Goals) errors.Add("TOO_MANY_GOALS");
        if (Count(PlanningEntityTypes.Project) > PlanningLimits.Projects) errors.Add("TOO_MANY_PROJECTS");
        if (Count(PlanningEntityTypes.Task) > PlanningLimits.Tasks) errors.Add("TOO_MANY_TASKS");
        if (Count(PlanningEntityTypes.Routine) > PlanningLimits.Routines) errors.Add("TOO_MANY_ROUTINES");
        if (content.Facts.Count > PlanningLimits.Facts) errors.Add("TOO_MANY_FACTS");
        if (content.Assumptions.Count > PlanningLimits.Assumptions) errors.Add("TOO_MANY_ASSUMPTIONS");
        if (content.Warnings.Count > PlanningLimits.Warnings) errors.Add("TOO_MANY_WARNINGS");
        if (content.UnresolvedQuestions.Count > PlanningLimits.UnresolvedQuestions)
            errors.Add("TOO_MANY_QUESTIONS");

        var ids = proposals.Select(x => x.DraftId).Concat(content.Facts.Select(x => x.DraftId)).ToArray();
        if (ids.Any(x => x is null || !DraftIdPattern().IsMatch(x))) errors.Add("DRAFT_ID_INVALID");
        if (ids.Distinct(StringComparer.Ordinal).Count() != ids.Length) errors.Add("DRAFT_ID_DUPLICATE");
        if (errors.Contains("DRAFT_ID_INVALID") || errors.Contains("DRAFT_ID_DUPLICATE")) return errors.ToArray();
        var byId = proposals.ToDictionary(x => x.DraftId, StringComparer.Ordinal);

        foreach (var item in proposals)
        {
            if (!PlanningEntityTypes.IsKnown(item.EntityType))
            {
                errors.Add("ENTITY_TYPE_UNSUPPORTED");
                continue;
            }
            if (item.Title.Length is 0 or > 200) errors.Add("TITLE_INVALID");
            if (item.Description is { Length: > 2000 } || item.DesiredOutcome is { Length: > 2000 } ||
                item.CompletionMeaning is { Length: > 2000 }) errors.Add("TEXT_TOO_LONG");
            if (item.Source is not ("EXPLICIT" or "INFERRED")) errors.Add("SOURCE_INVALID");
            if (item.Confidence is not ("HIGH" or "MEDIUM" or "LOW")) errors.Add("CONFIDENCE_INVALID");
            if (item.EntityType == PlanningEntityTypes.Goal && item.DesiredOutcome is null)
                errors.Add("GOAL_OUTCOME_REQUIRED");
            if (item.EntityType == PlanningEntityTypes.Routine && item.Recurrence is null)
                errors.Add("ROUTINE_RECURRENCE_REQUIRED");
            if (item.EntityType is PlanningEntityTypes.Goal or PlanningEntityTypes.Project &&
                item.ReviewDateSource is not (ReviewDateSources.User or ReviewDateSources.SystemDefault))
                errors.Add("REVIEW_SOURCE_INVALID");

            if (item.ParentDraftId is { } parentId)
            {
                // One owner only: a proposal has a draft parent, the planning context, or nothing.
                var mapped = byId.TryGetValue(parentId, out var parent) && !item.UnderContext &&
                    (item.EntityType, parent.EntityType) switch
                    {
                        (PlanningEntityTypes.Project, PlanningEntityTypes.Goal) => true,
                        (PlanningEntityTypes.Task or PlanningEntityTypes.Routine,
                            PlanningEntityTypes.Goal or PlanningEntityTypes.Project) => true,
                        _ => false
                    };
                if (!mapped) errors.Add("PARENT_INVALID");
            }
            if (item.UnderContext && (contextType is null || item.EntityType == PlanningEntityTypes.Goal ||
                    (item.EntityType == PlanningEntityTypes.Project && contextType == PlanningContextTypes.Project)))
                errors.Add("CONTEXT_PARENT_INVALID");
        }

        foreach (var fact in content.Facts)
        {
            if (!PlanningFactCatalog.IsKnown(fact.FactType) ||
                !PlanningFactCatalog.IsStrengthAllowed(fact.FactType, fact.Strength) ||
                PlanningFactCatalog.Normalize(fact.FactType, fact.Value) is null) errors.Add("FACT_INVALID");
            if (fact.ScopeDraftId is { } scope && !byId.ContainsKey(scope)) errors.Add("FACT_SCOPE_INVALID");
        }

        var known = ids.ToHashSet(StringComparer.Ordinal);
        if (content.Assumptions.Concat(content.UnresolvedQuestions).Any(x =>
                x.Text.Length is 0 or > PlanningLimits.NoteLength ||
                (x.DraftId is not null && !known.Contains(x.DraftId)))) errors.Add("NOTE_INVALID");
        if (content.Warnings.Any(x => !PlanningWarningCodes.All.Contains(x.Code) ||
                !PlanningSeverities.IsKnown(x.Severity) ||
                (x.DraftId is not null && !known.Contains(x.DraftId)))) errors.Add("WARNING_INVALID");
        return errors.ToArray();

        int Count(string type) => proposals.Count(x => x.EntityType == type);
    }

    /// <summary>Review state of every item against the current date and confirmed planning details.</summary>
    public static PlanningEvaluation Evaluate(PlanningDraftContent content, PlanningRuleContext context)
    {
        var byId = content.Proposals.ToDictionary(x => x.DraftId, StringComparer.Ordinal);
        var issues = content.Proposals.ToDictionary(x => x.DraftId, _ => new List<PlanningIssue>(),
            StringComparer.Ordinal);
        var factIssues = content.Facts.ToDictionary(x => x.DraftId, _ => new List<PlanningIssue>(),
            StringComparer.Ordinal);
        var draftIssues = new List<PlanningIssue>();
        foreach (var warning in content.Warnings)
        {
            var issue = new PlanningIssue(warning.Code, warning.Severity, PlanningIssueOrigins.Generator);
            if (warning.DraftId is null) draftIssues.Add(issue);
            else if (issues.TryGetValue(warning.DraftId, out var list)) list.Add(issue);
            else factIssues[warning.DraftId].Add(issue);
        }

        bool Excluded(PlanningProposal item) =>
            !item.Included || (item.ParentDraftId is { } parentId && Excluded(byId[parentId]));

        // The planning scope an item belongs to: the context, or the Goal / standalone Project at its root.
        string? ScopeKey(PlanningProposal item)
        {
            var root = item;
            while (root.ParentDraftId is { } parentId) root = byId[parentId];
            if (root.UnderContext) return ContextScopeKey;
            return root.EntityType is PlanningEntityTypes.Goal or PlanningEntityTypes.Project ? root.DraftId : null;
        }

        var hard = new Dictionary<string, HardConstraints>(StringComparer.Ordinal);
        HardConstraints Hard(string key) => hard.TryGetValue(key, out var set) ? set : hard[key] = new HardConstraints();
        var seenFacts = context.ActiveContextFacts
            .Select(x => (Scope: ContextScopeKey, Key: PlanningFactCatalog.Key(x.FactType, x.Value))).ToHashSet();
        foreach (var fact in context.ActiveContextFacts.Where(x => x.Strength == PlanningFactStrengths.Hard))
            Hard(ContextScopeKey).Add(fact.FactType, fact.Value);

        var factScopeExcluded = new HashSet<string>(StringComparer.Ordinal);
        foreach (var fact in content.Facts)
        {
            var own = factIssues[fact.DraftId];
            string? scopeKey;
            if (fact.ScopeDraftId is { } scopeId)
            {
                var scope = byId[scopeId];
                var supported = scope.EntityType == PlanningEntityTypes.Goal ||
                    (scope.EntityType == PlanningEntityTypes.Project && scope.ParentDraftId is null && !scope.UnderContext);
                scopeKey = supported ? scopeId : null;
                if (Excluded(scope)) factScopeExcluded.Add(fact.DraftId);
            }
            else scopeKey = context.ContextType is null ? null : ContextScopeKey;

            if (scopeKey is null) own.Add(Rule(PlanningIssueCodes.FactScopeUnsupported));
            if (PlanningFactCatalog.HasPassed(fact.FactType, fact.Value, context.Today))
                own.Add(Rule(PlanningIssueCodes.FactDatePassed));
            var selected = fact.Included && !factScopeExcluded.Contains(fact.DraftId);
            if (scopeKey is not null && selected &&
                !seenFacts.Add((scopeKey, PlanningFactCatalog.Key(fact.FactType, fact.Value))))
                own.Add(Rule(PlanningIssueCodes.FactAlreadyActive));
            if (scopeKey is not null && selected && fact.Strength == PlanningFactStrengths.Hard &&
                !own.Any(IsBlocking)) Hard(scopeKey).Add(fact.FactType, fact.Value);
        }

        foreach (var item in content.Proposals)
        {
            var own = issues[item.DraftId];
            var constraints = ScopeKey(item) is { } key && hard.TryGetValue(key, out var set) ? set : null;
            switch (item.EntityType)
            {
                case PlanningEntityTypes.Task:
                    if (item.PlannedDate is { } planned)
                    {
                        if (planned < context.Today) own.Add(Rule(PlanningIssueCodes.DateInPast));
                        else if (planned > content.WindowEnd) own.Add(Rule(PlanningIssueCodes.DateOutsideWindow));
                        if (item.Deadline is { } deadline && planned > deadline)
                            own.Add(Rule(PlanningIssueCodes.DateAfterDeadline));
                        if (constraints?.Blocks(planned) == true)
                            own.Add(Rule(PlanningIssueCodes.HardConstraintConflict));
                    }
                    else if (item.ParentDraftId is null && !item.UnderContext)
                        own.Add(Rule(PlanningIssueCodes.StandaloneTaskNeedsDate));
                    break;
                case PlanningEntityTypes.Routine:
                    var recurrence = ValidRecurrence(item);
                    if (recurrence is null) own.Add(Rule(PlanningIssueCodes.UnsupportedRecurrence));
                    else if (constraints?.BlocksRecurrence(recurrence) == true)
                        own.Add(Rule(PlanningIssueCodes.HardConstraintConflict));
                    if (!ValidTimes(item)) own.Add(Rule(PlanningIssueCodes.InvalidTimes));
                    if (item.EffectiveFromLocalDate < context.Today) own.Add(Rule(PlanningIssueCodes.StartInPast));
                    break;
                default:
                    if (item.TargetDate < context.Today) own.Add(Rule(PlanningIssueCodes.TargetInPast));
                    if (item.ReviewDate < context.Today) own.Add(Rule(PlanningIssueCodes.ReviewInPast));
                    // Planning inside a Goal or Project never introduces a second, unrelated Goal.
                    if (item.EntityType == PlanningEntityTypes.Goal && context.ContextType is not null ||
                        item.EntityType == PlanningEntityTypes.Project && !item.UnderContext &&
                        item.ParentDraftId is null && context.ContextType == PlanningContextTypes.Project)
                        own.Add(Rule(PlanningIssueCodes.NotAllowedInContext));
                    break;
            }
        }

        var states = new Dictionary<string, PlanningItemState>(StringComparer.Ordinal);
        PlanningItemState State(PlanningProposal item)
        {
            if (states.TryGetValue(item.DraftId, out var known)) return known;
            var parent = item.ParentDraftId is { } parentId ? State(byId[parentId]) : null;
            var own = issues[item.DraftId];
            var state = !item.Included || parent?.State == PlanningReviewStates.Excluded
                ? PlanningReviewStates.Excluded
                : own.Any(IsBlocking) ? PlanningReviewStates.Blocked
                : parent?.State is PlanningReviewStates.Blocked or PlanningReviewStates.BlockedByAncestor
                    ? PlanningReviewStates.BlockedByAncestor
                : PlanningReviewStates.Included;
            return states[item.DraftId] = new PlanningItemState(state,
                item.Included && parent?.State == PlanningReviewStates.Excluded, own);
        }
        foreach (var item in content.Proposals) State(item);

        var factStates = content.Facts.ToDictionary(x => x.DraftId, fact =>
        {
            var own = factIssues[fact.DraftId];
            var scope = fact.ScopeDraftId is { } scopeId ? states[scopeId] : null;
            var byScope = fact.Included && factScopeExcluded.Contains(fact.DraftId);
            var state = !fact.Included || byScope ? PlanningReviewStates.Excluded
                : own.Any(IsBlocking) ? PlanningReviewStates.Blocked
                : scope?.State is PlanningReviewStates.Blocked or PlanningReviewStates.BlockedByAncestor
                    ? PlanningReviewStates.BlockedByAncestor
                : PlanningReviewStates.Included;
            return new PlanningItemState(state, byScope, own);
        }, StringComparer.Ordinal);

        var firstWeek = FirstWeek(content, states, context.Today);
        if (firstWeek.Count > PlanningLimits.FirstWeekEntries)
            draftIssues.Add(Rule(PlanningIssueCodes.FirstWeekOverloaded));
        var all = states.Values.Concat(factStates.Values).ToArray();
        var canApply = !draftIssues.Any(IsBlocking) &&
            all.All(x => x.State is PlanningReviewStates.Included or PlanningReviewStates.Excluded) &&
            all.Any(x => x.State == PlanningReviewStates.Included);
        return new PlanningEvaluation(states, factStates, draftIssues, firstWeek, canApply);
    }

    /// <summary>
    /// The first-week view is derived, never stored: a Task appears on its planned date and a
    /// Routine on each date of the window its recurrence produces.
    /// </summary>
    private static List<PlanningFirstWeekEntry> FirstWeek(PlanningDraftContent content,
        IReadOnlyDictionary<string, PlanningItemState> states, DateOnly today)
    {
        var entries = new List<PlanningFirstWeekEntry>();
        foreach (var item in content.Proposals.Where(x => states[x.DraftId].State != PlanningReviewStates.Excluded))
        {
            if (item.EntityType == PlanningEntityTypes.Task && item.PlannedDate is { } planned &&
                planned >= content.WindowStart && planned <= content.WindowEnd)
                entries.Add(new PlanningFirstWeekEntry(item.DraftId, planned));
            if (item.EntityType != PlanningEntityTypes.Routine || ValidRecurrence(item) is not { } recurrence) continue;
            var from = item.EffectiveFromLocalDate ?? today;
            for (var date = content.WindowStart; date <= content.WindowEnd; date = date.AddDays(1))
                if (date >= from && date >= today && RoutineSchedule.OccursOn(recurrence, date))
                    entries.Add(new PlanningFirstWeekEntry(item.DraftId, date));
        }
        return entries.OrderBy(x => x.Date).ToList();
    }

    /// <summary>The preview a confirmation stores, and that submission rebuilds and compares.</summary>
    public static PlanningPreview BuildPreview(Guid draftId, int revision, PlanningDraftContent content,
        PlanningEvaluation evaluation, string contextStamp)
    {
        var items = content.Proposals
            .Where(x => evaluation.Proposals[x.DraftId].State == PlanningReviewStates.Included).ToArray();
        var facts = content.Facts
            .Where(x => evaluation.Facts[x.DraftId].State == PlanningReviewStates.Included).ToArray();
        var warnings = new List<PlanningConfirmationWarning>();
        var carried = content.Proposals.Where(x => evaluation.Proposals[x.DraftId].ExcludedByAncestor)
            .Select(x => x.DraftId).Order(StringComparer.Ordinal).ToArray();
        if (carried.Length > 0)
            warnings.Add(new PlanningConfirmationWarning(
                PlanningConfirmationWarningCodes.DescendantsExcludedWithParent,
                PlanningConfirmationWarningCodes.DescendantsExcludedWithParent, carried,
                Hash($"{PlanningConfirmationWarningCodes.DescendantsExcludedWithParent}|{draftId}|{revision}|{string.Join(',', carried)}")));
        var canonical = new StringBuilder($"{draftId}|{revision}|{contextStamp}|{evaluation.CanApply}");
        foreach (var item in items)
            canonical.Append($"|{item.DraftId}:{item.EntityType}:{item.ParentDraftId}:{item.UnderContext}");
        foreach (var fact in facts) canonical.Append($"|{fact.DraftId}:{fact.ScopeDraftId}");
        foreach (var warning in warnings) canonical.Append($"|{warning.WarningHash}");
        return new PlanningPreview(items, facts, warnings, content.Facts.Count > 0 && facts.Length == 0,
            evaluation.CanApply, Hash(canonical.ToString()));
    }

    public static RoutineRecurrence? ValidRecurrence(PlanningProposal item)
    {
        if (item.Recurrence is not { } recurrence) return null;
        try
        {
            return RoutineSchedule.Validate(recurrence.Type, recurrence.DaysOfWeek, recurrence.DayOfMonth);
        }
        catch (ArgumentException)
        {
            // Outside what a Routine can represent. It is blocked as proposed, never converted.
            return null;
        }
    }

    private static bool ValidTimes(PlanningProposal item)
    {
        try
        {
            RoutineSchedule.NormalizeTimes(item.TimesOfDay);
            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    private static string Hash(string canonical) =>
        CommandExecutionRequest.HashCanonicalRequest(Encoding.UTF8.GetBytes(canonical));

    private static PlanningIssue Rule(string code) =>
        new(code, PlanningSeverities.Blocking, PlanningIssueOrigins.Rule);

    private static bool IsBlocking(PlanningIssue issue) => issue.Severity == PlanningSeverities.Blocking;

    /// <summary>The dates a scope's HARD planning details rule out.</summary>
    private sealed class HardConstraints
    {
        private readonly HashSet<int> _weekdays = [];
        private readonly HashSet<DateOnly> _dates = [];
        private readonly List<(DateOnly Start, DateOnly End)> _ranges = [];

        public void Add(string factType, PlanningFactValue value)
        {
            switch (factType)
            {
                case PlanningFactTypes.UnavailableWeekday:
                    _weekdays.UnionWith(value.Weekdays ?? []);
                    break;
                case PlanningFactTypes.UnavailableDate when value.LocalDate is { } date:
                    _dates.Add(date);
                    break;
                case PlanningFactTypes.UnavailableDateRange
                    when value.StartLocalDate is { } start && value.EndLocalDate is { } end:
                    _ranges.Add((start, end));
                    break;
            }
        }

        public bool Blocks(DateOnly date) => _weekdays.Contains(RoutineSchedule.IsoDayOfWeek(date)) ||
            _dates.Contains(date) || _ranges.Any(x => date >= x.Start && date <= x.End);

        /// <summary>Only weekday rules are checked: they are what a recurrence can express.</summary>
        public bool BlocksRecurrence(RoutineRecurrence recurrence) => recurrence.Type switch
        {
            RecurrenceTypes.Daily => _weekdays.Count > 0,
            RecurrenceTypes.SpecificWeekdays => recurrence.DaysOfWeek.Any(_weekdays.Contains),
            _ => false
        };
    }
}
