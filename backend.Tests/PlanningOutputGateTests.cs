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
    public void An_unsupported_recurrence_is_kept_as_written_for_review_and_never_converted()
    {
        var result = Evaluate(With(x => Proposal(x, 3)["recurrence"] = new JsonObject { ["type"] = "WEEKLY" }));
        Assert.True(result.Passed);
        Assert.Equal("WEEKLY", result.Draft!.Proposals[3].Recurrence!.Type);
        Assert.Null(PlanningDraftRules.ValidRecurrence(result.Draft.Proposals[3]));
        Assert.Equal(PlanningOutputGate.GateSchema,
            Evaluate(With(x => Proposal(x, 3)["recurrence"]!["type"] = "every other day")).Gate);
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
            ["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = " چند روز در هفته؟ " })
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
        Assert.False(Evaluate(Clarification("q1", "q2", "q3", "q4").ToJsonString()).Passed);
        Assert.False(Evaluate(Clarification("q1", "q1").ToJsonString()).Passed);
        var both = Valid();
        both["kind"] = "CLARIFICATION";
        both["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = "؟" });
        Assert.False(Evaluate(both.ToJsonString()).Passed);
        var asked = Valid();
        asked["questions"] = new JsonArray(new JsonObject { ["id"] = "q1", ["text"] = "؟" });
        Assert.False(Evaluate(asked.ToJsonString()).Passed);
    }

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
        ["questions"] = new JsonArray(ids.Select(x => (JsonNode)new JsonObject { ["id"] = x, ["text"] = "پرسش" }).ToArray())
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
