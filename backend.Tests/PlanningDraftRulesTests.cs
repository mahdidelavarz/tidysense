using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class PlanningDraftRulesTests
{
    // A Saturday, so the seven-day window ends on a Friday.
    private static readonly DateOnly Today = new(2026, 10, 3);
    private static readonly DeterministicPlanningGenerator Generator = new();

    [Fact]
    public async Task Default_fixture_is_a_valid_hierarchy_with_defaults_and_a_derived_first_week()
    {
        var content = await GenerateAsync(null);
        Assert.Empty(PlanningDraftRules.StructuralErrors(content, null));
        var evaluation = PlanningDraftRules.Evaluate(content, Rules());

        Assert.All(evaluation.Proposals.Values, x => Assert.Equal(PlanningReviewStates.Included, x.State));
        Assert.All(evaluation.Facts.Values, x => Assert.Equal(PlanningReviewStates.Included, x.State));
        Assert.True(evaluation.CanApply);
        Assert.Single(content.Proposals, x => x.EntityType == PlanningEntityTypes.Goal);

        // Missing checkpoints are product defaults, labelled as such, never questions.
        var goal = content.Proposals.Single(x => x.DraftId == "goal");
        Assert.Equal(Today.AddDays(90), goal.ReviewDate);
        Assert.Equal(ReviewDateSources.SystemDefault, goal.ReviewDateSource);
        Assert.Equal(Today.AddDays(30), content.Proposals.Single(x => x.DraftId == "project").ReviewDate);

        // Friday is proposed as unavailable, so no Task lands on it and every date is inside the window.
        var dated = content.Proposals.Where(x => x.PlannedDate is not null).ToArray();
        Assert.Equal(3, dated.Length);
        Assert.All(dated, x => Assert.InRange(x.PlannedDate!.Value, Today, Today.AddDays(6)));
        Assert.DoesNotContain(dated, x => x.PlannedDate!.Value.DayOfWeek == DayOfWeek.Friday);

        // Tasks appear on their planned date; the Routine on each date its recurrence produces.
        Assert.Equal(6, evaluation.FirstWeek.Count);
        Assert.Equal(new[] { new DateOnly(2026, 10, 3), new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 7) },
            evaluation.FirstWeek.Where(x => x.DraftId == "practice").Select(x => x.Date));
        Assert.Equal(evaluation.FirstWeek.OrderBy(x => x.Date).Select(x => x.Date),
            evaluation.FirstWeek.Select(x => x.Date));
    }

    [Theory]
    [InlineData(PlanningFixtures.InvalidTwoGoals, "TOO_MANY_GOALS")]
    [InlineData(PlanningFixtures.InvalidParent, "PARENT_INVALID")]
    [InlineData(PlanningFixtures.InvalidOversized, "TOO_MANY_TASKS")]
    public async Task Invalid_fixtures_are_structural_failures(string fixture, string expected)
    {
        var content = await GenerateAsync(fixture);
        Assert.Contains(expected, PlanningDraftRules.StructuralErrors(content, null));
    }

    [Fact]
    public async Task Repair_normalises_format_and_fills_defaults_without_changing_what_is_proposed()
    {
        var raw = (await Generator.GenerateAsync(new PlanningGenerationRequest(Guid.NewGuid(), "x", Context(),
            PlanningFixtures.Repairable), TestContext.Current.CancellationToken)).Draft!;
        Assert.NotEmpty(PlanningDraftRules.StructuralErrors(raw, null));

        var repaired = PlanningDraftRules.Repair(raw, Today);
        Assert.Empty(PlanningDraftRules.StructuralErrors(repaired, null));
        var project = repaired.Proposals.Single(x => x.DraftId == "project");
        var task = repaired.Proposals.Single(x => x.DraftId == "task");
        Assert.Equal("پروژه نامرتب", project.Title);
        Assert.Null(project.CompletionMeaning);
        Assert.Equal(Today.AddDays(30), project.ReviewDate);
        Assert.Equal("کار نامرتب", task.Title);
        Assert.Null(task.Description);
        // Ownership and dates are never touched by repair.
        Assert.Equal("project", task.ParentDraftId);
        Assert.Equal(Today, task.PlannedDate);
        // Repairing again changes nothing.
        Assert.Equal(PlanningJson.Serialize(repaired), PlanningJson.Serialize(PlanningDraftRules.Repair(repaired, Today)));
    }

    [Fact]
    public void A_default_review_date_never_passes_an_earlier_target_date()
    {
        var content = Content(Goal("g") with { TargetDate = Today.AddDays(20) });
        var goal = PlanningDraftRules.Repair(content, Today).Proposals.Single();
        Assert.Equal(Today.AddDays(20), goal.ReviewDate);
        Assert.Equal(ReviewDateSources.SystemDefault, goal.ReviewDateSource);
    }

    [Fact]
    public async Task Blocked_items_block_their_descendants_until_corrected_or_excluded()
    {
        var content = await GenerateAsync(PlanningFixtures.Blocked);
        Assert.Empty(PlanningDraftRules.StructuralErrors(content, null));
        var evaluation = PlanningDraftRules.Evaluate(content, Rules());

        Assert.Equal(PlanningReviewStates.Blocked, evaluation.Proposals["goal"].State);
        Assert.Contains(evaluation.Proposals["goal"].Issues, x =>
            x.Code == PlanningWarningCodes.GoalOutcomeAmbiguous && x.Origin == PlanningIssueOrigins.Generator);
        // The child's only problem is its ancestor.
        Assert.Equal(PlanningReviewStates.BlockedByAncestor, evaluation.Proposals["child"].State);
        Assert.Empty(evaluation.Proposals["child"].Issues);
        Assert.Equal(PlanningIssueCodes.UnsupportedRecurrence, evaluation.Proposals["weekly"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.DateOutsideWindow, evaluation.Proposals["far"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.HardConstraintConflict, evaluation.Proposals["clash"].Issues.Single().Code);
        Assert.Equal(PlanningReviewStates.Included, evaluation.Proposals["ready"].State);
        Assert.False(evaluation.CanApply);

        // Excluding a parent takes its descendants with it; excluding a child never excludes the parent.
        var excluded = content with
        {
            Proposals = content.Proposals.Select(x =>
                x.DraftId is "goal" or "weekly" or "far" or "clash" ? x with { Included = false } : x).ToArray()
        };
        var after = PlanningDraftRules.Evaluate(excluded, Rules());
        Assert.Equal(PlanningReviewStates.Excluded, after.Proposals["child"].State);
        Assert.True(after.Proposals["child"].ExcludedByAncestor);
        Assert.False(after.Proposals["goal"].ExcludedByAncestor);
        Assert.Equal(PlanningReviewStates.Included, after.Proposals["side"].State);
        Assert.True(after.CanApply);

        var preview = PlanningDraftRules.BuildPreview(Guid.NewGuid(), 2, excluded, after, "NONE");
        Assert.Equal(new[] { "ready", "side" }, preview.Items.Select(x => x.DraftId));
        var warning = Assert.Single(preview.Warnings);
        Assert.Equal(PlanningConfirmationWarningCodes.DescendantsExcludedWithParent, warning.Code);
        Assert.Equal(new[] { "child" }, warning.AffectedDraftIds);

        // Correcting the root releases the subtree without touching the child.
        var corrected = content with
        {
            Warnings = [],
            Proposals = content.Proposals.Where(x => x.DraftId is "goal" or "child").ToArray(), Facts = []
        };
        var released = PlanningDraftRules.Evaluate(corrected, Rules());
        Assert.Equal(PlanningReviewStates.Included, released.Proposals["child"].State);
    }

    [Fact]
    public void Hard_details_reject_conflicting_dates_while_soft_ones_never_block()
    {
        var planned = Today.AddDays(2);
        var content = Content(Work("t", planned) with { UnderContext = true },
            Routine("r", RecurrenceTypes.Daily) with { UnderContext = true });
        var range = new PlanningFactValue(null, null, Today.AddDays(1), Today.AddDays(3), null);

        var hard = PlanningDraftRules.Evaluate(content, Rules(PlanningContextTypes.Goal,
            new PlanningFactData(PlanningFactTypes.UnavailableDateRange, PlanningFactStrengths.Hard, range)));
        Assert.Equal(PlanningIssueCodes.HardConstraintConflict, hard.Proposals["t"].Issues.Single().Code);
        // A date range is not something a recurrence can express, so the Routine is not blocked by it.
        Assert.Equal(PlanningReviewStates.Included, hard.Proposals["r"].State);

        var soft = PlanningDraftRules.Evaluate(content, Rules(PlanningContextTypes.Goal,
            new PlanningFactData(PlanningFactTypes.UnavailableDateRange, PlanningFactStrengths.Soft, range)));
        Assert.Equal(PlanningReviewStates.Included, soft.Proposals["t"].State);

        var weekday = new PlanningFactValue([RoutineSchedule.IsoDayOfWeek(planned)], null, null, null, null);
        var byWeekday = PlanningDraftRules.Evaluate(content, Rules(PlanningContextTypes.Goal,
            new PlanningFactData(PlanningFactTypes.UnavailableWeekday, PlanningFactStrengths.Hard, weekday)));
        Assert.Equal(PlanningReviewStates.Blocked, byWeekday.Proposals["t"].State);
        Assert.Equal(PlanningIssueCodes.HardConstraintConflict, byWeekday.Proposals["r"].Issues.Single().Code);

        // The same detail applies to nothing outside its scope.
        var standalone = PlanningDraftRules.Evaluate(Content(Work("t", planned)), Rules(PlanningContextTypes.Goal,
            new PlanningFactData(PlanningFactTypes.UnavailableWeekday, PlanningFactStrengths.Hard, weekday)));
        Assert.Equal(PlanningReviewStates.Included, standalone.Proposals["t"].State);
    }

    [Fact]
    public void Facts_need_a_supported_scope_and_are_never_duplicated_or_already_past()
    {
        var friday = new PlanningFactValue([5], null, null, null, null);
        var fact = new PlanningFactProposal("f", PlanningFactTypes.UnavailableWeekday,
            PlanningFactStrengths.Hard, friday, null, true);

        var noScope = PlanningDraftRules.Evaluate(Content([Work("t", Today)], [fact]), Rules());
        Assert.Equal(PlanningIssueCodes.FactScopeUnsupported, noScope.Facts["f"].Issues.Single().Code);
        Assert.False(noScope.CanApply);

        var known = PlanningDraftRules.Evaluate(Content([], [fact]), Rules(PlanningContextTypes.Goal,
            new PlanningFactData(PlanningFactTypes.UnavailableWeekday, PlanningFactStrengths.Hard, friday)));
        Assert.Equal(PlanningIssueCodes.FactAlreadyActive, known.Facts["f"].Issues.Single().Code);

        var past = fact with
        {
            FactType = PlanningFactTypes.UnavailableDate,
            Value = new PlanningFactValue(null, Today.AddDays(-1), null, null, null)
        };
        var expired = PlanningDraftRules.Evaluate(Content([], [past]), Rules(PlanningContextTypes.Goal));
        Assert.Equal(PlanningIssueCodes.FactDatePassed, expired.Facts["f"].Issues.Single().Code);

        // A detail scoped to a Project that sits under a Goal has no home of its own.
        var nested = Content([Goal("g"), Project("p") with { ParentDraftId = "g" }], [fact with { ScopeDraftId = "p" }]);
        Assert.Equal(PlanningIssueCodes.FactScopeUnsupported,
            PlanningDraftRules.Evaluate(PlanningDraftRules.Repair(nested, Today), Rules()).Facts["f"].Issues.Single().Code);

        // Rejecting every detail leaves the work approvable and is disclosed, not blocked.
        var declined = PlanningDraftRules.Repair(
            Content([Goal("g"), Work("t", Today) with { ParentDraftId = "g" }],
                [fact with { ScopeDraftId = "g", Included = false }]), Today);
        var evaluation = PlanningDraftRules.Evaluate(declined, Rules());
        Assert.True(evaluation.CanApply);
        Assert.True(PlanningDraftRules.BuildPreview(Guid.NewGuid(), 1, declined, evaluation, "NONE").NoFactsRemembered);
    }

    [Fact]
    public void Fact_vocabulary_is_closed_and_hard_is_limited_to_what_a_date_can_prove()
    {
        Assert.True(PlanningFactCatalog.IsStrengthAllowed(PlanningFactTypes.UnavailableWeekday, PlanningFactStrengths.Hard));
        Assert.False(PlanningFactCatalog.IsStrengthAllowed(PlanningFactTypes.AvailableDevice, PlanningFactStrengths.Hard));
        Assert.False(PlanningFactCatalog.IsStrengthAllowed(PlanningFactTypes.UnavailableDate, PlanningFactStrengths.Informational));
        Assert.False(PlanningFactCatalog.IsKnown("DAILY_TIME_WINDOW"));
        Assert.Equal("STARTING_STATE", PlanningFactCatalog.Category(PlanningFactTypes.CurrentLevel));

        Assert.Equal(new[] { 1, 5 }, PlanningFactCatalog.Normalize(PlanningFactTypes.UnavailableWeekday,
            new PlanningFactValue([5, 1], Today, null, null, "دلیل"))!.Weekdays);
        // Only the field the type owns survives: an explanation is never kept beside a schedule rule.
        Assert.Null(PlanningFactCatalog.Normalize(PlanningFactTypes.UnavailableWeekday,
            new PlanningFactValue([5, 1], Today, null, null, "دلیل"))!.Text);
        Assert.Null(PlanningFactCatalog.Normalize(PlanningFactTypes.UnavailableDateRange,
            new PlanningFactValue(null, null, Today.AddDays(2), Today, null)));
        Assert.Null(PlanningFactCatalog.Normalize(PlanningFactTypes.ExcludedPath,
            new PlanningFactValue(null, null, null, null, new string('x', 121))));

        var invalid = Content([Goal("g")], [new PlanningFactProposal("f", PlanningFactTypes.AvailableDevice,
            PlanningFactStrengths.Hard, new PlanningFactValue(null, null, null, null, "گوشی"), "g", true)]);
        Assert.Contains("FACT_INVALID", PlanningDraftRules.StructuralErrors(PlanningDraftRules.Repair(invalid, Today), null));
    }

    [Fact]
    public void Ownership_window_and_context_rules_are_enforced()
    {
        var content = PlanningDraftRules.Repair(Content(
            Goal("g"), Work("loose", null), Work("past", Today.AddDays(-1)),
            Work("late", Today.AddDays(2)) with { Deadline = Today.AddDays(1) },
            Routine("r", RecurrenceTypes.Daily) with { EffectiveFromLocalDate = Today.AddDays(-2) },
            Work("owned", null) with { ParentDraftId = "g" }), Today);
        Assert.Empty(PlanningDraftRules.StructuralErrors(content, null));
        var evaluation = PlanningDraftRules.Evaluate(content, Rules());
        Assert.Equal(PlanningIssueCodes.StandaloneTaskNeedsDate, evaluation.Proposals["loose"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.DateInPast, evaluation.Proposals["past"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.DateAfterDeadline, evaluation.Proposals["late"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.StartInPast, evaluation.Proposals["r"].Issues.Single().Code);
        // A Task under a Goal or Project may stay undated.
        Assert.Equal(PlanningReviewStates.Included, evaluation.Proposals["owned"].State);

        // Planning inside a Goal never introduces another Goal.
        var inGoal = PlanningDraftRules.Evaluate(content, Rules(PlanningContextTypes.Goal));
        Assert.Equal(PlanningIssueCodes.NotAllowedInContext, inGoal.Proposals["g"].Issues.Single().Code);

        var orphan = Content(Work("t", Today) with { UnderContext = true });
        Assert.Contains("CONTEXT_PARENT_INVALID", PlanningDraftRules.StructuralErrors(orphan, null));
        Assert.Empty(PlanningDraftRules.StructuralErrors(orphan, PlanningContextTypes.Project));
        var both = Content(Goal("g"), Work("t", Today) with { ParentDraftId = "g", UnderContext = true });
        Assert.Contains("PARENT_INVALID", PlanningDraftRules.StructuralErrors(
            PlanningDraftRules.Repair(both, Today), PlanningContextTypes.Goal));
    }

    [Fact]
    public void An_overloaded_first_week_blocks_the_draft_and_the_preview_hash_follows_the_context()
    {
        var routines = Enumerable.Range(1, 4).Select(x => Routine($"r{x}", RecurrenceTypes.Daily)).ToArray();
        var content = Content(routines);
        var overloaded = PlanningDraftRules.Evaluate(content, Rules());
        Assert.Equal(28, overloaded.FirstWeek.Count);
        Assert.Equal(PlanningIssueCodes.FirstWeekOverloaded, overloaded.DraftIssues.Single().Code);
        Assert.False(overloaded.CanApply);

        var trimmed = content with { Proposals = routines.Take(3).ToArray() };
        var evaluation = PlanningDraftRules.Evaluate(trimmed, Rules());
        Assert.True(evaluation.CanApply);
        var id = Guid.NewGuid();
        var first = PlanningDraftRules.BuildPreview(id, 1, trimmed, evaluation, "GOAL:a:1");
        Assert.Equal(first.Hash, PlanningDraftRules.BuildPreview(id, 1, trimmed, evaluation, "GOAL:a:1").Hash);
        Assert.NotEqual(first.Hash, PlanningDraftRules.BuildPreview(id, 1, trimmed, evaluation, "GOAL:a:2").Hash);
        Assert.NotEqual(first.Hash, PlanningDraftRules.BuildPreview(id, 2, trimmed, evaluation, "GOAL:a:1").Hash);
    }

    [Fact]
    public void Long_dates_may_lie_beyond_the_window_up_to_two_years_while_detailed_dates_stay_inside_it()
    {
        // 029 §2: a target date or a deadline far ahead is allowed; a planned date or a Routine start is not.
        var goal = Goal("g") with { TargetDate = Today.AddMonths(PlanningLimits.MaxMonthsAhead) };
        var child = Work("t", null) with { ParentDraftId = "g", Deadline = Today.AddMonths(12) };
        var near = PlanningDraftRules.Evaluate(PlanningDraftRules.Repair(Content(goal, child), Today), Rules());
        Assert.True(near.CanApply);

        var far = PlanningDraftRules.Evaluate(PlanningDraftRules.Repair(Content(
            goal with { TargetDate = Today.AddMonths(PlanningLimits.MaxMonthsAhead).AddDays(1) },
            child with { Deadline = Today.AddMonths(30) }), Today), Rules());
        Assert.Equal(PlanningIssueCodes.DateTooFar, far.Proposals["g"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.DateTooFar, far.Proposals["t"].Issues.Single().Code);

        // An undated Task whose deadline has passed, and a Routine that would start after the week.
        var late = PlanningDraftRules.Evaluate(PlanningDraftRules.Repair(Content(goal,
            child with { Deadline = Today.AddDays(-1) },
            Routine("r", RecurrenceTypes.Daily) with { ParentDraftId = "g", EffectiveFromLocalDate = Today.AddDays(7) }), Today), Rules());
        Assert.Equal(PlanningIssueCodes.DateInPast, late.Proposals["t"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.DateOutsideWindow, late.Proposals["r"].Issues.Single().Code);
    }

    [Fact]
    public void A_goal_or_project_is_never_proposed_empty()
    {
        var empty = PlanningDraftRules.Evaluate(PlanningDraftRules.Repair(Content(Goal("g"), Project("p") with { ParentDraftId = "g" }), Today), Rules());
        Assert.Equal(PlanningIssueCodes.EmptyParent, empty.Proposals["g"].Issues.Single().Code);
        Assert.Equal(PlanningIssueCodes.EmptyParent, empty.Proposals["p"].Issues.Single().Code);

        // Work anywhere under it is enough, and the user excluding that work does not make it empty.
        var filled = PlanningDraftRules.Repair(Content(Goal("g"), Project("p") with { ParentDraftId = "g" },
            Work("t", Today) with { ParentDraftId = "p", Included = false }), Today);
        var evaluation = PlanningDraftRules.Evaluate(filled, Rules());
        Assert.Empty(evaluation.Proposals["g"].Issues);
        Assert.Empty(evaluation.Proposals["p"].Issues);
    }

    [Fact]
    public void A_sequence_is_two_or_more_tasks_of_one_owner_in_distinct_order()
    {
        PlanningProposal Step(string id, int? order, string? parent = "p", string? key = "s") =>
            Work(id, Today) with { ParentDraftId = parent, SequenceKey = key, SequenceOrder = order };
        IReadOnlyList<string> Errors(params PlanningProposal[] items) =>
            PlanningDraftRules.StructuralErrors(PlanningDraftRules.Repair(Content([Project("p"), Project("q"), .. items]), Today), null);

        Assert.Empty(Errors(Step("a", 1), Step("b", 2)));
        Assert.Contains("SEQUENCE_INVALID", Errors(Step("a", 1)));
        Assert.Contains("SEQUENCE_INVALID", Errors(Step("a", 1), Step("b", 1)));
        Assert.Contains("SEQUENCE_INVALID", Errors(Step("a", 1), Step("b", 2, parent: "q")));
        Assert.Contains("SEQUENCE_INVALID", Errors(Step("a", 1), Step("b", null)));
        Assert.Contains("SEQUENCE_INVALID", Errors(Step("a", 0), Step("b", 1)));
        // A Routine never carries a sequence; the repair drops what does not belong to its type.
        var routine = Routine("r", RecurrenceTypes.Daily) with { SequenceKey = "s", SequenceOrder = 3 };
        Assert.Null(PlanningDraftRules.Repair(Content(routine), Today).Proposals[0].SequenceKey);
    }

    [Fact]
    public void Leaving_items_out_takes_what_hangs_on_them_and_names_them()
    {
        var friday = new PlanningFactValue([5], null, null, null, null);
        var content = PlanningDraftRules.Repair(new PlanningDraftContent("خلاصه", Today, Today.AddDays(6),
            [
                Project("p"), Work("a", Today) with { ParentDraftId = "p" },
                Work("b", Today) with { SequenceKey = "s", SequenceOrder = 1 },
                Work("c", Today) with { SequenceKey = "s", SequenceOrder = 2 }
            ],
            [new PlanningFactProposal("f", PlanningFactTypes.UnavailableWeekday, PlanningFactStrengths.Hard, friday, "p", true)],
            [new PlanningNote("a", "فرض"), new PlanningNote(null, "فرض کلی")],
            [new PlanningWarning("p", PlanningSeverities.Info, PlanningWarningCodes.AssumedDates)], []), Today);

        var without = PlanningDraftRules.Without(content, ["p", "c"])!;

        Assert.Equal(["b"], without.Proposals.Select(x => x.DraftId));
        // The sequence left with one member is no sequence; nothing is re-dated or re-parented.
        Assert.Null(without.Proposals[0].SequenceKey);
        Assert.Equal(Today, without.Proposals[0].PlannedDate);
        Assert.Empty(without.Facts);
        Assert.Equal(["فرض کلی"], without.Assumptions.Select(x => x.Text));
        Assert.Empty(without.Warnings);
        Assert.Equal(
            [PlanningEntityTypes.Project, PlanningEntityTypes.Task, PlanningEntityTypes.Task, PlanningRemovedItemTypes.Fact],
            without.RemovedItems!.Select(x => x.EntityType));
        Assert.Null(without.RemovedItems![3].Title);

        Assert.Null(PlanningDraftRules.Without(content, ["p", "b", "c"]));
    }

    [Fact]
    public void The_measurement_of_a_turn_records_up_to_four_questions_and_never_five()
    {
        // 029 §7: one turn asks up to four questions; the event of what was asked holds one item each.
        var validator = new TidySense.Common.Events.EventPayloadValidator(TidySense.Common.Events.PlanningEventSchemas.All());
        string Asked(int count) => System.Text.Json.JsonSerializer.Serialize(new
        {
            flowId = Guid.NewGuid(), turn = 1,
            questions = Enumerable.Range(0, count).Select(_ => new { kind = "CONTENT", optionCount = 2, multiple = false })
        });
        validator.Validate(TidySense.Common.Events.PlanningEventTypes.ClarificationAsked, 1, Asked(4));
        Assert.Throws<ArgumentException>(() => validator.Validate(TidySense.Common.Events.PlanningEventTypes.ClarificationAsked, 1, Asked(5)));
    }

    private static async Task<PlanningDraftContent> GenerateAsync(string? fixture) =>
        PlanningDraftRules.Repair((await Generator.GenerateAsync(
            new PlanningGenerationRequest(Guid.NewGuid(), "یادگیری زبان انگلیسی", Context(), fixture),
            TestContext.Current.CancellationToken)).Draft!, Today);

    private static PlanningContext Context() => new(PlanningContextBuilder.Version, Today, "Asia/Tehran", Today,
        Today.AddDays(6), null, [], [], [], [], null) { Fingerprint = new string('A', 64) };

    private static PlanningRuleContext Rules(string? contextType = null, params PlanningFactData[] facts) =>
        new(Today, contextType, facts);

    private static PlanningDraftContent Content(params PlanningProposal[] proposals) => Content(proposals, []);

    private static PlanningDraftContent Content(PlanningProposal[] proposals, PlanningFactProposal[] facts) =>
        new("خلاصه", Today, Today.AddDays(6), proposals, facts, [], [], []);

    private static PlanningProposal Proposal(string id, string type) => new(id, type, $"عنوان {id}", null, null,
        false, "EXPLICIT", "HIGH", true, null, null, null, null, null, null, null, null, null, null);

    private static PlanningProposal Goal(string id) =>
        Proposal(id, PlanningEntityTypes.Goal) with { DesiredOutcome = "نتیجه روشن" };

    private static PlanningProposal Project(string id) => Proposal(id, PlanningEntityTypes.Project);

    private static PlanningProposal Work(string id, DateOnly? plannedDate) =>
        Proposal(id, PlanningEntityTypes.Task) with { PlannedDate = plannedDate };

    private static PlanningProposal Routine(string id, string recurrenceType) =>
        Proposal(id, PlanningEntityTypes.Routine) with
        {
            Recurrence = new PlanningRecurrence(recurrenceType, null, null), TimesOfDay = []
        };
}
