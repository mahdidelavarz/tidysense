using System.Text.Json;
using System.Text.Json.Nodes;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Ai;

namespace TidySense.Backend.Tests;

public sealed class PlanningOutputGateTests
{
    private static readonly DateOnly Today = new(2026, 10, 3);

    [Fact]
    public void A_complete_valid_output_becomes_a_draft_with_server_owned_window_and_review_defaults()
    {
        var result = Evaluate(Valid().ToJsonString());

        Assert.True(result.Passed);
        Assert.Equal(PlanningOutcomes.Draft, result.Outcome);
        Assert.Empty(result.RepairRules);
        var draft = result.Draft!;
        Assert.Equal(Today, draft.WindowStart);
        Assert.Equal(Today.AddDays(6), draft.WindowEnd);
        Assert.Equal(4, draft.Proposals.Count);
        Assert.All(draft.Proposals, x => Assert.True(x.Included));
        var goal = draft.Proposals.Single(x => x.DraftId == "goal");
        // The checkpoint is product policy, filled by the deterministic repair.
        Assert.Equal(Today.AddDays(90), goal.ReviewDate);
        Assert.Equal(ReviewDateSources.SystemDefault, goal.ReviewDateSource);
        Assert.Equal(new[] { 1, 3 }, draft.Proposals.Single(x => x.DraftId == "practice").Recurrence!.DaysOfWeek);
        Assert.Equal(new TimeOnly(7, 30), draft.Proposals.Single(x => x.DraftId == "practice").TimesOfDay!.Single());
        Assert.Equal(new[] { 5 }, draft.Facts.Single().Value.Weekdays);
        Assert.Single(draft.Warnings);
    }

    [Theory]
    [InlineData("length")]
    [InlineData("")]
    [InlineData(null)]
    public void An_incomplete_response_is_rejected_before_it_is_parsed(string? finishReason)
    {
        var result = PlanningOutputGate.Evaluate(Valid().ToJsonString(), finishReason, Context(), true);
        Assert.Equal(PlanningOutputGate.GateTransport, result.Gate);
        Assert.Equal(AiFailureClasses.Incomplete, result.FailureClass);
        Assert.Null(result.Draft);
    }

    [Fact]
    public void Empty_oversized_or_truncated_text_never_becomes_a_draft()
    {
        Assert.Equal(PlanningOutputGate.GateTransport, Evaluate("   ").Gate);
        Assert.Equal(PlanningOutputGate.GateTransport,
            Evaluate(new string(' ', PlanningOutputGate.MaxOutputChars) + Valid().ToJsonString()).Gate);
        var text = Valid().ToJsonString();
        Assert.Equal(PlanningOutputGate.GateParse, Evaluate(text[..(text.Length / 2)]).Gate);
        Assert.Equal(PlanningOutputGate.GateParse, Evaluate("Here is your plan: " + text).Gate);
        Assert.Equal(PlanningOutputGate.GateParse, Evaluate("[" + text + "]").Gate);
    }

    [Fact]
    public void Only_the_allowlisted_wrappers_are_removed()
    {
        var text = Valid().ToJsonString();
        var fenced = Evaluate($"﻿  ```json\n{text}\n```  ");
        Assert.True(fenced.Passed);
        Assert.Equal(new[]
        {
            PlanningOutputGate.RemoveBom, PlanningOutputGate.TrimWhitespace, PlanningOutputGate.RemoveCodeFence
        }, fenced.RepairRules);

        // Two fences, an unknown fence language or text around the fence are not a single JSON code fence.
        Assert.False(Evaluate($"```json\n{text}\n```\n```json\n{text}\n```").Passed);
        Assert.False(Evaluate($"```python\n{text}\n```").Passed);
        Assert.False(Evaluate($"```json\n{text}\n``` done").Passed);
    }

    [Fact]
    public void Unknown_fields_duplicate_names_and_wrong_types_fail_the_schema()
    {
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => x["actions"] = new JsonArray())).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["command"] = "DELETE")).Gate);
        // A review date is never accepted from a model.
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["reviewDate"] = "2026-12-01")).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["title"] = 12)).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["underContext"] = "no")).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0).Remove("title"))).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => x["draft"]!["proposals"] = "none")).Gate);
        Assert.Equal(PlanningOutputGate.GateParse,
            Evaluate("""{"kind":"DRAFT","kind":"CLARIFICATION","draft":null,"questions":[]}""").Gate);
    }

    [Fact]
    public void A_rejection_says_where_and_what_without_repeating_the_output()
    {
        Assert.Null(Evaluate(Valid().ToJsonString()).Correction);
        // An incomplete answer cannot be corrected by asking again.
        Assert.Null(PlanningOutputGate.Evaluate(Valid().ToJsonString(), "length", Context(), true).Correction);

        Assert.Contains("not exactly one JSON object", Evaluate("Here is your plan").Correction);
        var unknown = Evaluate(With(x => Proposal(x, 1)["priorityOfTheUser"] = "متن کاربر")).Correction!;
        Assert.StartsWith("draft.proposals[1]: has a field that is not allowed", unknown);
        Assert.DoesNotContain("priorityOfTheUser", unknown);
        Assert.Matches("^[\\x20-\\x7E]*$", unknown);
        Assert.StartsWith("the top-level object: has a field", Evaluate(With(x => x["actions"] = new JsonArray())).Correction);
        Assert.StartsWith("draft.proposals[0].confidence: must be exactly one of HIGH | MEDIUM | LOW",
            Evaluate(With(x => Proposal(x, 0)["confidence"] = "CERTAIN")).Correction);
        Assert.StartsWith("draft.proposals[2].plannedDate: must be a real calendar date",
            Evaluate(With(x => Proposal(x, 2)["plannedDate"] = "tomorrow")).Correction);
        Assert.StartsWith("draft.proposals[3].recurrence.daysOfWeek: must be a whole number",
            Evaluate(With(x => Proposal(x, 3)["recurrence"]!["daysOfWeek"] = new JsonArray("MONDAY"))).Correction);
        Assert.StartsWith("draft.proposals[3].timesOfDay: must be an array of 24-hour",
            Evaluate(With(x => Proposal(x, 3)["timesOfDay"] = new JsonArray("7:30"))).Correction);
        Assert.StartsWith("draft.proposals[0].title: is required",
            Evaluate(With(x => Proposal(x, 0).Remove("title"))).Correction);
        Assert.StartsWith("draft.facts[0].value: must be an object",
            Evaluate(With(x => x["draft"]!["facts"]![0]!.AsObject().Remove("value"))).Correction);
        Assert.StartsWith("draft.warnings[0].code: must be exactly one of",
            Evaluate(With(x => x["draft"]!["warnings"]![0]!["code"] = "TIME_CONFLICT")).Correction);
        Assert.StartsWith("draft.summary: is required", Evaluate(With(x => x["draft"]!.AsObject().Remove("summary"))).Correction);
        // A structural rule is named in words the model can act on.
        Assert.Contains("\"parentDraftId\" must be the draftId of another proposal",
            Evaluate(With(x => Proposal(x, 2)["parentDraftId"] = "missing")).Correction);
        Assert.Contains("\"draftId\" that is null or the draftId of a proposal or fact",
            Evaluate(With(x => x["draft"]!["assumptions"]![0]!["draftId"] = "nowhere")).Correction);
    }

    [Fact]
    public void An_enum_is_normalised_only_when_it_differs_in_letter_case()
    {
        var normalised = Evaluate(With(x =>
        {
            x["kind"] = "draft";
            Proposal(x, 0)["entityType"] = "Goal";
            Proposal(x, 3)["recurrence"]!["type"] = "specific_weekdays";
        }));
        Assert.True(normalised.Passed);
        Assert.Contains(PlanningOutputGate.NormalizeEnumCase, normalised.RepairRules);
        Assert.Equal(PlanningEntityTypes.Goal, normalised.Draft!.Proposals[0].EntityType);
        Assert.Equal(RecurrenceTypes.SpecificWeekdays, normalised.Draft.Proposals[3].Recurrence!.Type);

        // No fuzzy matching, abbreviation or synonym.
        foreach (var wrong in new[] { "GOL", "GOALS", "OBJECTIVE", " GOAL" })
            Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["entityType"] = wrong)).Gate);
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 0)["confidence"] = "CERTAIN")).Gate);
    }

    [Fact]
    public void An_unsupported_recurrence_is_never_converted_and_the_routine_is_asked_for_again_or_left_out()
    {
        // Kept as written, so it is never converted; the user could not approve it, so it is asked for
        // again, and the fallback draft leaves the Routine out with a note (029 §8).
        var result = Evaluate(With(x => Proposal(x, 3)["recurrence"] = new JsonObject { ["type"] = "WEEKLY" }));
        Assert.False(result.Passed);
        Assert.Equal(PlanningOutputGate.GateSemantic, result.Gate);
        Assert.Contains("draft.proposals[3]", result.Correction);
        Assert.Contains("\"recurrence\" is not one of the three supported forms", result.Correction);
        var fallback = result.Fallback!.Draft!;
        Assert.DoesNotContain(fallback.Proposals, x => x.DraftId == "practice");
        Assert.Equal([new PlanningRemovedItem(PlanningEntityTypes.Routine, "تمرین")], fallback.RemovedItems);
        Assert.Contains(PlanningOutputGate.RemoveInvalidItems, result.Fallback.RepairRules);
        Assert.Equal(PlanningOutputGate.GateSchema,
            Evaluate(With(x => Proposal(x, 3)["recurrence"]!["type"] = "every other day")).Gate);
    }

    [Fact]
    public void An_invalid_sequence_loses_only_its_order_and_the_draft_stands()
    {
        // A sequence of one Task is no sequence: its order is dropped and recorded, nothing else changes (029 §9).
        var result = Evaluate(With(x =>
        {
            Proposal(x, 2)["sequenceKey"] = "s1";
            Proposal(x, 2)["sequenceOrder"] = 1;
        }));
        Assert.True(result.Passed);
        Assert.Null(result.Draft!.Proposals[2].SequenceKey);
        Assert.Contains(PlanningOutputGate.DropInvalidSequence, result.RepairRules);
        Assert.Empty(result.Draft.RemovedItems ?? []);
    }

    [Fact]
    public void A_planning_detail_that_cannot_be_stored_is_asked_for_again_and_otherwise_left_out()
    {
        // A weekday detail with text instead of weekdays breaks the catalogue (FACT_INVALID).
        var result = Evaluate(With(x => x["draft"]!["facts"]![0]!["value"] = new JsonObject { ["text"] = "جمعه‌ها" }));
        Assert.False(result.Passed);
        Assert.Contains("PLANNING DETAILS rules", result.Correction);
        var fallback = result.Fallback!.Draft!;
        Assert.Empty(fallback.Facts);
        Assert.Equal(4, fallback.Proposals.Count);
        Assert.Equal([new PlanningRemovedItem(PlanningRemovedItemTypes.Fact, null)], fallback.RemovedItems);
    }

    [Fact]
    public void Written_persian_dates_must_be_real_days_with_their_own_weekday()
    {
        // Today is Saturday 11 Mehr 1405 (2026-10-03).
        bool Wrong(string text) => PlanningTextDates.HasError([text], Today);
        Assert.False(Wrong("شروع از شنبه ۱۱ مهر"));
        Assert.False(Wrong("تا ۳۱ شهریور ۱۴۰۶ و نوروز ۱ فروردین"));
        Assert.False(Wrong("پنج‌شنبه ۲۳ مهر و سه‌شنبه 14 مهر"));
        Assert.True(Wrong("جمعه ۲۳ مهر"));
        Assert.True(Wrong("تا ۳۱ مهر"));
        Assert.True(Wrong("شنبه ۲۴ مهر"));
        // Words that only start like a month are not dates.
        Assert.False(Wrong("۲ دیگر و ۳ مهرماه"));
    }

    [Fact]
    public void A_wrong_written_date_is_asked_for_again_and_otherwise_the_draft_is_kept_as_written()
    {
        var result = Evaluate(With(x => x["draft"]!["summary"] = "شروع از جمعه ۱۱ مهر"));
        Assert.False(result.Passed);
        Assert.Contains("exact \"persianDate\" from \"calendar\"", result.Correction);
        Assert.Equal("شروع از جمعه ۱۱ مهر", result.Fallback!.Draft!.Summary);
        Assert.Equal(4, result.Fallback.Draft.Proposals.Count);

        var asking = Evaluate(Asking(Question(x => x["text"] = "از جمعه ۱۱ مهر شروع کنیم؟")).ToJsonString());
        Assert.False(asking.Passed);
        Assert.Single(asking.Fallback!.Clarification!.Questions);
    }

    [Fact]
    public void Broken_notes_are_dropped_and_an_overloaded_week_loses_its_last_routines_when_not_corrected()
    {
        var noted = Evaluate(With(x => x["draft"]!["assumptions"]![0]!["text"] = new string('ف', 301)));
        Assert.False(noted.Passed);
        Assert.Empty(noted.Fallback!.Draft!.Assumptions);
        Assert.Equal(4, noted.Fallback.Draft.Proposals.Count);

        // Four daily Routines fill 28 days of the first week, more than 21.
        var busy = Evaluate(With(x =>
        {
            // Without the HARD «Friday» detail, so the daily Routines conflict with nothing.
            x["draft"]!["facts"] = new JsonArray();
            var proposals = x["draft"]!["proposals"]!.AsArray();
            Proposal(x, 3)["recurrence"] = new JsonObject { ["type"] = "DAILY" };
            foreach (var id in new[] { "r2", "r3", "r4" })
            {
                var routine = JsonNode.Parse(Proposal(x, 3).ToJsonString())!;
                routine["draftId"] = id;
                routine["title"] = $"روتین {id}";
                proposals.Add(routine);
            }
        }));
        Assert.False(busy.Passed);
        var fitted = busy.Fallback!.Draft!;
        Assert.Equal(["روتین r4", "روتین r3"], fitted.RemovedItems!.Select(x => x.Title));
        Assert.Equal(["goal", "project", "step", "practice", "r2"], fitted.Proposals.Select(x => x.DraftId));
    }

    [Fact]
    public void Leaving_an_item_out_is_judged_again_so_a_parent_left_without_work_goes_too()
    {
        // The Project's only Task is dated past the window; without it the Project would be empty (029 §5).
        var result = Evaluate(With(x => Proposal(x, 2)["plannedDate"] = "2026-10-20"));
        var fallback = result.Fallback!.Draft!;
        Assert.Equal(["goal", "practice"], fallback.Proposals.Select(x => x.DraftId));
        Assert.Equal([PlanningEntityTypes.Task, PlanningEntityTypes.Project], fallback.RemovedItems!.Select(x => x.EntityType));
        Assert.True(PlanningDraftRules.Evaluate(fallback, new PlanningRuleContext(Today, null, [])).CanApply);
    }

    [Fact]
    public void Too_many_goals_are_asked_for_again_and_otherwise_the_later_one_is_left_out_with_its_work()
    {
        var result = Evaluate(With(x =>
        {
            var proposals = x["draft"]!["proposals"]!.AsArray();
            var goal = JsonNode.Parse(Proposal(x, 0).ToJsonString())!;
            goal["draftId"] = "goal-2";
            goal["title"] = "تغییر شغل";
            proposals.Add(goal);
            var work = JsonNode.Parse(Proposal(x, 2).ToJsonString())!;
            work["draftId"] = "step-2";
            work["parentDraftId"] = "goal-2";
            proposals.Add(work);
        }));
        Assert.False(result.Passed);
        Assert.Contains("TOO_MANY_GOALS", result.Correction);
        var fallback = result.Fallback!.Draft!;
        Assert.Equal(["goal", "project", "step", "practice"], fallback.Proposals.Select(x => x.DraftId));
        Assert.Equal(["تغییر شغل", "انتخاب کتاب"], fallback.RemovedItems!.Select(x => x.Title));
        Assert.Contains(PlanningOutputGate.RemoveInvalidItems, result.Fallback.RepairRules);
    }

    [Theory]
    [InlineData("2026-10-5", "2026-10-05", PlanningOutputGate.PadDate)]
    [InlineData("2026/10/05", "2026-10-05", PlanningOutputGate.NormalizeDateSeparator)]
    public void A_year_first_numeric_date_is_normalised(string written, string expected, string rule)
    {
        var result = Evaluate(With(x => Proposal(x, 2)["plannedDate"] = written));
        Assert.True(result.Passed);
        Assert.Contains(rule, result.RepairRules);
        Assert.Equal(DateOnly.Parse(expected), result.Draft!.Proposals[2].PlannedDate);
    }

    [Theory]
    [InlineData("05/10/2026")]
    [InlineData("26-10-05")]
    [InlineData("October 5")]
    [InlineData("2026-10/05")]
    [InlineData("2026-13-01")]
    [InlineData("2026-02-30")]
    [InlineData("tomorrow")]
    public void An_ambiguous_or_impossible_date_rejects_the_output(string written)
    {
        Assert.Equal(PlanningOutputGate.GateSchema, Evaluate(With(x => Proposal(x, 2)["plannedDate"] = written)).Gate);
    }

    [Fact]
    public void A_broken_reference_graph_rejects_the_whole_output()
    {
        // A reference to an id that is not in the payload.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x => Proposal(x, 2)["parentDraftId"] = "missing")).Gate);
        // A duplicate id.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x => Proposal(x, 2)["draftId"] = "project")).Gate);
        // An incompatible parent type: a Task cannot own a Project.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x => Proposal(x, 1)["parentDraftId"] = "step")).Gate);
        // A self-reference, and a cycle between two items.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x => Proposal(x, 1)["parentDraftId"] = "project")).Gate);
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x =>
        {
            Proposal(x, 0)["parentDraftId"] = "project";
            Proposal(x, 1)["parentDraftId"] = "goal";
        })).Gate);
        // Two exclusive parents: a draft parent and the planning context.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x => Proposal(x, 2)["underContext"] = true)).Gate);
        // A fact scoped to an item that does not exist.
        Assert.Equal(PlanningOutputGate.GateSemantic,
            Evaluate(With(x => x["draft"]!["facts"]![0]!["scopeDraftId"] = "nowhere")).Gate);
        // More than the structure allows.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x =>
        {
            var second = JsonNode.Parse(Proposal(x, 0).ToJsonString())!;
            second["draftId"] = "goal-2";
            x["draft"]!["proposals"]!.AsArray().Add(second);
        })).Gate);
    }

    [Fact]
    public void A_clarification_is_bounded_and_refused_when_no_more_questions_are_allowed()
    {
        var asking = new JsonObject
        {
            ["kind"] = "CLARIFICATION", ["message"] = null, ["blockReason"] = null, ["draft"] = null,
            ["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = " چند روز در هفته؟ ", ["kind"] = "RECURRENCE" })
        };
        var result = Evaluate(asking.ToJsonString());
        Assert.True(result.Passed);
        Assert.Equal(PlanningOutcomes.Clarification, result.Outcome);
        Assert.Equal("چند روز در هفته؟", result.Clarification!.Questions.Single().Text);
        Assert.Null(result.Draft);

        var refused = PlanningOutputGate.Evaluate(asking.ToJsonString(), "stop", Context(), false);
        Assert.Equal(PlanningOutputGate.GatePolicy, refused.Gate);
        Assert.Equal(AiFailureClasses.Policy, refused.FailureClass);

        // No questions, too many questions, a repeated id, or questions together with a draft.
        Assert.False(Evaluate(Clarification().ToJsonString()).Passed);
        Assert.True(Evaluate(Clarification("q1", "q2", "q3", "q4").ToJsonString()).Passed);
        Assert.False(Evaluate(Clarification("q1", "q2", "q3", "q4", "q5").ToJsonString()).Passed);
        Assert.False(Evaluate(Clarification("q1", "q1").ToJsonString()).Passed);
        var both = Valid();
        both["kind"] = "CLARIFICATION";
        both["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = "؟", ["kind"] = "CONTENT" });
        Assert.False(Evaluate(both.ToJsonString()).Passed);
        var asked = Valid();
        asked["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = "؟", ["kind"] = "CONTENT" });
        Assert.False(Evaluate(asked.ToJsonString()).Passed);
    }

    [Fact]
    public void A_question_carries_a_reason_a_kind_and_options_one_or_several_of_which_may_be_chosen()
    {
        var result = Evaluate(Asking(Question()).ToJsonString());
        Assert.True(result.Passed);
        var question = result.Clarification!.Questions.Single();
        Assert.Equal("تا روتین‌ها همان روزها بنشینند.", question.Reason);
        Assert.Equal(PlanningQuestionKinds.Recurrence, question.Kind);
        Assert.Equal(["شنبه", "دوشنبه"], question.Options);
        Assert.True(question.Multiple);

        // Free text only: no options, no reason, "multiple" left out.
        var open = Evaluate(Asking(new JsonObject { ["id"] = "q1", ["text"] = "از کجا شروع می‌کنید؟", ["kind"] = "CONTENT" }).ToJsonString());
        Assert.True(open.Passed);
        Assert.Empty(open.Clarification!.Questions.Single().Options);
        Assert.False(open.Clarification.Questions.Single().Multiple);
        // A kind in another letter case is its canonical spelling.
        Assert.True(Evaluate(Asking(Question(x => x["kind"] = "timing")).ToJsonString()).Passed);
    }

    [Theory]
    [InlineData("kind-missing")]
    [InlineData("kind-unknown")]
    [InlineData("one-option")]
    [InlineData("three-options")]
    [InlineData("kind-entity-type")]
    [InlineData("write-it-yourself")]
    [InlineData("long-label")]
    [InlineData("empty-label")]
    [InlineData("duplicate-label")]
    [InlineData("duplicate-after-spacing")]
    [InlineData("other-persian")]
    [InlineData("other-with-ellipsis")]
    [InlineData("other-english")]
    [InlineData("write-your-own")]
    [InlineData("multiple-without-options")]
    [InlineData("multiple-not-boolean")]
    [InlineData("label-not-string")]
    [InlineData("label-object")]
    [InlineData("label-newline")]
    [InlineData("long-reason")]
    [InlineData("reason-newline")]
    [InlineData("unknown-field")]
    public void A_question_that_breaks_the_option_rules_rejects_the_whole_output(string breach)
    {
        JsonObject Options(params string[] labels) => Question(x => x["options"] = new JsonArray(labels.Select(l => (JsonNode)l!).ToArray()));
        var question = breach switch
        {
            "kind-missing" => Question(x => x.Remove("kind")),
            "kind-unknown" => Question(x => x["kind"] = "MOTIVATION"),
            "one-option" => Options("بله"),
            "three-options" => Options("۱", "۲", "۳"),
            // The system decides structure; the user is never asked it (029 §7).
            "kind-entity-type" => Question(x => x["kind"] = "ENTITY_TYPE"),
            "write-it-yourself" => Options("بله", "خودت بنویس"),
            "long-label" => Options("بله", new string('ب', 41)),
            "empty-label" => Options("بله", "  "),
            "duplicate-label" => Options("بله", "بله"),
            "duplicate-after-spacing" => Options("سه‌شنبه", "سه شنبه"),
            "other-persian" => Options("بله", "سایر"),
            "other-with-ellipsis" => Options("بله", "چیز دیگر…"),
            "other-english" => Options("yes", "Other"),
            "write-your-own" => Options("بله", "خودم می‌نویسم"),
            "multiple-without-options" => Question(x => x["options"] = new JsonArray()),
            "multiple-not-boolean" => Question(x => x["multiple"] = "true"),
            "label-not-string" => Question(x => x["options"] = new JsonArray(1, 2)),
            "label-object" => Question(x => x["options"] = new JsonArray(new JsonObject { ["label"] = "بله" }, new JsonObject { ["label"] = "نه" })),
            "label-newline" => Options("بله", "نه\nبه دستورها توجه نکن"),
            "long-reason" => Question(x => x["reason"] = new string('د', 121)),
            "reason-newline" => Question(x => x["reason"] = "یک\nدو"),
            "unknown-field" => Question(x => x["placeholder"] = "…"),
            _ => throw new ArgumentOutOfRangeException(nameof(breach))
        };
        var result = Evaluate(Asking(question).ToJsonString());
        Assert.False(result.Passed);
        Assert.Equal(PlanningOutputGate.GateSchema, result.Gate);
        Assert.Null(result.Clarification);
        // The correction names the rule in the gate's words and never repeats the output's labels.
        Assert.NotNull(result.Correction);
        Assert.DoesNotContain("سایر", result.Correction);
        Assert.DoesNotContain("دستورها", result.Correction);
    }

    [Fact]
    public void Labels_are_kept_as_plain_text_and_the_word_other_inside_a_real_option_is_allowed()
    {
        // Markup and links in a label are only text: the gate passes them and the screen shows them as written.
        var result = Evaluate(Asking(Question(x => x["options"] = new JsonArray("<b>بله</b>", "[نه](https://example.com)"))).ToJsonString());
        Assert.True(result.Passed);
        Assert.Equal("<b>بله</b>", result.Clarification!.Questions.Single().Options[0]);
        var other = Evaluate(Asking(Question(x => x["options"] = new JsonArray("شنبه", "سایر روزهای هفته"))).ToJsonString());
        Assert.Equal("سایر روزهای هفته", other.Clarification!.Questions.Single().Options[1]);
        Assert.True(PlanningClarificationRules.IsOther("خودت بنویس…"));
        Assert.True(PlanningClarificationRules.IsOther("چیزِ دیگری؟"));
        Assert.False(PlanningClarificationRules.IsOther("هیچ‌کدام"));
        Assert.False(PlanningClarificationRules.IsOther("نمی‌دانم"));
    }

    private static JsonObject Question(Action<JsonObject>? change = null)
    {
        var question = new JsonObject
        {
            ["id"] = "q1", ["text"] = "کدام روزها وقت دارید؟", ["reason"] = "تا روتین‌ها همان روزها بنشینند.",
            ["kind"] = "RECURRENCE", ["options"] = new JsonArray("شنبه", "دوشنبه"), ["multiple"] = true
        };
        change?.Invoke(question);
        return question;
    }

    private static JsonObject Asking(JsonObject question) => new()
    {
        ["kind"] = "CLARIFICATION", ["message"] = null, ["blockReason"] = null, ["draft"] = null,
        ["questions"] = new JsonArray(question)
    };

    [Fact]
    public void A_blocked_input_names_a_known_reason_and_says_why()
    {
        JsonObject Blocked(string? reason, string? message) => new()
        {
            ["kind"] = "INPUT_BLOCKED", ["message"] = message, ["blockReason"] = reason, ["draft"] = null,
            ["questions"] = new JsonArray()
        };
        var result = PlanningOutputGate.Evaluate(Blocked("too_vague", "خیلی کلی است.").ToJsonString(), "stop",
            Context(), false);
        Assert.True(result.Passed);
        Assert.Equal(PlanningOutcomes.InputBlocked, result.Outcome);
        Assert.Equal(PlanningBlockReasons.TooVague, result.Clarification!.BlockReason);

        Assert.False(Evaluate(Blocked("NOT_A_REASON", "متن").ToJsonString()).Passed);
        Assert.False(Evaluate(Blocked("TOO_VAGUE", null).ToJsonString()).Passed);
        Assert.False(Evaluate(Blocked(null, "متن").ToJsonString()).Passed);
        Assert.False(Evaluate(Blocked("TOO_VAGUE", new string('x', 501)).ToJsonString()).Passed);
    }

    [Fact]
    public void Context_rules_apply_to_model_output_as_to_any_draft()
    {
        // "underContext" without a planning context has nothing to attach to.
        Assert.Equal(PlanningOutputGate.GateSemantic, Evaluate(With(x =>
        {
            Proposal(x, 2)["parentDraftId"] = null;
            Proposal(x, 2)["underContext"] = true;
        })).Gate);
    }

    private static PlanningGateResult Evaluate(string text) => PlanningOutputGate.Evaluate(text, "stop", Context(), true);

    private static string With(Action<JsonObject> change)
    {
        var value = Valid();
        change(value);
        return value.ToJsonString();
    }

    private static JsonObject Proposal(JsonObject root, int index) => root["draft"]!["proposals"]![index]!.AsObject();

    private static JsonObject Clarification(params string[] ids) => new()
    {
        ["kind"] = "CLARIFICATION", ["draft"] = null,
        ["questions"] = new JsonArray(ids.Select(x => (JsonNode)new JsonObject { ["id"] = x, ["text"] = "پرسش", ["kind"] = "CONTENT" }).ToArray())
    };

    internal static PlanningContext Context(PlanningScope? scope = null) => new(PlanningContextBuilder.Version,
        Today, "Asia/Tehran", Today, Today.AddDays(6), scope, [], [], [], [], null)
    {
        Fingerprint = new string('A', 64)
    };

    /// <summary>A Goal, its Project, one Task and one Routine, a planning detail and a warning.</summary>
    internal static JsonObject Valid() => JsonSerializer.SerializeToNode(new
    {
        kind = "DRAFT",
        message = (string?)null,
        blockReason = (string?)null,
        questions = Array.Empty<object>(),
        draft = new
        {
            summary = "یک مسیر کوتاه برای هفته آینده.",
            proposals = new object[]
            {
                new
                {
                    draftId = "goal", entityType = "GOAL", title = "یادگیری زبان", description = (string?)null,
                    parentDraftId = (string?)null, underContext = false, source = "EXPLICIT", confidence = "HIGH",
                    desiredOutcome = "رسیدن به سطح B1"
                },
                new
                {
                    draftId = "project", entityType = "PROJECT", title = "گام نخست", parentDraftId = "goal",
                    underContext = false, source = "INFERRED", confidence = "MEDIUM",
                    completionMeaning = "سه درس اول تمام شده باشد."
                },
                new
                {
                    draftId = "step", entityType = "TASK", title = "انتخاب کتاب", parentDraftId = "project",
                    underContext = false, source = "INFERRED", confidence = "MEDIUM", plannedDate = "2026-10-04"
                },
                new
                {
                    draftId = "practice", entityType = "ROUTINE", title = "تمرین", parentDraftId = "goal",
                    underContext = false, source = "INFERRED", confidence = "LOW",
                    recurrence = new { type = "SPECIFIC_WEEKDAYS", daysOfWeek = new[] { 1, 3 } },
                    timesOfDay = new[] { "07:30" }
                }
            },
            facts = new object[]
            {
                new
                {
                    draftId = "fact-friday", factType = "UNAVAILABLE_WEEKDAY", strength = "HARD",
                    value = new { weekdays = new[] { 5 } }, scopeDraftId = "goal"
                }
            },
            assumptions = new object[] { new { draftId = "step", text = "تاریخ پیشنهادی است." } },
            warnings = new object[] { new { draftId = (string?)null, severity = "INFO", code = "ASSUMED_DATES" } },
            unresolvedQuestions = Array.Empty<object>()
        }
    })!.AsObject();
}
