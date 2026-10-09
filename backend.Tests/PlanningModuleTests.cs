using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.DTOs.Goals;
using TidySense.DTOs.Planning;
using TidySense.DTOs.Projects;
using TidySense.DTOs.Tasks;
using TidySense.Infrastructure.Ai;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Ai;

namespace TidySense.Backend.Tests;

public sealed class PlanningModuleTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    // Every test pins the clock to a local day safely after the real time (see TestClock.Pin).
    private static readonly DateOnly Day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3);
    private const string Intention = "می‌خواهم زبان انگلیسی را منظم یاد بگیرم";

    [Fact]
    public async Task Attempt_is_idempotent_owner_scoped_and_becomes_a_reviewable_draft_without_creating_anything()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);
        var calls = factory.PlanningGate.Calls;
        var body = Body("attempt-idempotent-1");

        var first = await StartAsync(client, body);
        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        var attempt = (await first.Content.ReadFromJsonAsync<PlanningAttemptDto>())!;
        // A duplicate click or a reconnect returns the same attempt.
        var again = await ReadAsync<PlanningAttemptDto>(await StartAsync(client, body));
        Assert.Equal(attempt.Id, again.Id);
        var mismatch = await StartAsync(client, Body("attempt-idempotent-1", intention: "چیز دیگری"));
        Assert.Equal(HttpStatusCode.Conflict, mismatch.StatusCode);
        Assert.Equal("IDEMPOTENCY_MISMATCH", await ProblemCodeAsync(mismatch));

        var done = await WaitAsync(client, attempt.Id);
        Assert.Equal("SUCCEEDED", done.Status);
        Assert.Equal(Intention, done.Intention);
        Assert.NotNull(done.DraftId);
        Assert.Equal(done.DraftId, (await ReadAsync<PlanningAttemptDto>(await StartAsync(client, body))).DraftId);
        Assert.Equal(calls + 1, factory.PlanningGate.Calls);

        var draft = await DraftAsync(client, done.DraftId!.Value);
        Assert.Equal("REVIEWABLE", draft.Status);
        Assert.Equal(1, draft.Revision);
        Assert.Null(draft.Context);
        Assert.Null(draft.LinkedConfirmationId);
        Assert.True(draft.CanApply);
        Assert.Equal(7, draft.Proposals.Count);
        Assert.Equal(2, draft.Facts.Count);
        Assert.All(draft.Proposals, x => Assert.Equal("INCLUDED", x.State));
        Assert.Equal(Day, draft.WindowStart);
        Assert.Equal(Day.AddDays(6), draft.WindowEnd);
        Assert.NotEmpty(draft.FirstWeek);
        Assert.All(draft.FirstWeek, x => Assert.InRange(x.Date, Day, Day.AddDays(6)));
        var active = (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!;
        Assert.Equal(draft.Id, active.Draft!.Id);
        Assert.Null(active.Attempt);

        // Another user can neither read nor act on any planning resource.
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/v1/planning/attempts/{attempt.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/v1/planning/drafts/{draft.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/planning/drafts/{draft.Id}/previews", new { expectedRevision = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/planning/attempts/{attempt.Id}/cancel", new { })).StatusCode);
        Assert.Null((await otherClient.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Draft);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // A draft is a proposal: no canonical entity and no planning detail exists yet.
        Assert.Equal(0, await db.Goals.CountAsync(x => x.UserId == owner.UserId));
        Assert.Equal(0, await db.Tasks.CountAsync(x => x.UserId == owner.UserId));
        Assert.Equal(0, await db.PlanningFacts.CountAsync(x => x.UserId == owner.UserId));
        var created = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == draft.Id && x.EventType == "PLANNING_DRAFT_CREATED");
        Assert.Equal("SYSTEM_DETERMINISTIC", created.Actor);
        Assert.DoesNotContain("انگلیسی", created.PayloadJson);
        var stored = await db.PlanningAttempts.AsNoTracking().SingleAsync(x => x.Id == attempt.Id);
        Assert.Equal("deterministic-mock", stored.GeneratorKey);
        Assert.DoesNotContain("انگلیسی", stored.ContextManifestJson);
    }

    [Fact]
    public async Task An_unfinished_flow_is_replaced_only_explicitly_and_a_cancelled_attempt_discards_its_late_result()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        factory.PlanningGate.Hold();

        var held = await ReadAsync<PlanningAttemptDto>(await StartAsync(client, Body("held-attempt-1"),
            PlanningGate.HeldFixture));
        Assert.Contains(held.Status, new[] { "QUEUED", "RUNNING" });
        Assert.Equal(held.Id, (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Attempt!.Id);

        // A second flow cannot start silently while one is unfinished.
        var blocked = await StartAsync(client, Body("held-attempt-2"));
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Equal("PLANNING_DRAFT_ACTIVE", await ProblemCodeAsync(blocked));

        var cancelled = await ReadAsync<PlanningAttemptDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/attempts/{held.Id}/cancel", new { }));
        Assert.Equal("CANCELLED", cancelled.Status);
        // Repeating the cancellation is harmless.
        Assert.Equal("CANCELLED", (await ReadAsync<PlanningAttemptDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/attempts/{held.Id}/cancel", new { }))).Status);

        // The generation finishes after the cancellation: its result must not become a draft.
        factory.PlanningGate.Release();
        await Task.Delay(500, TestContext.Current.CancellationToken);
        var late = (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{held.Id}"))!;
        Assert.Equal("CANCELLED", late.Status);
        Assert.Null(late.DraftId);
        await using (var scope = factory.Services.CreateAsyncScope())
            Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<AppDbContext>()
                .PlanningDrafts.CountAsync(x => x.UserId == session.UserId));

        var first = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("held-attempt-3")))).Id);
        Assert.Equal("SUCCEEDED", first.Status);
        var refused = await StartAsync(client, Body("held-attempt-4"));
        Assert.Equal("PLANNING_DRAFT_ACTIVE", await ProblemCodeAsync(refused));

        // "Start new and discard the previous draft" is the explicit choice.
        var replacement = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("held-attempt-5", replaceActive: true)))).Id);
        Assert.Equal("SUCCEEDED", replacement.Status);
        Assert.Equal("SUPERSEDED", (await DraftAsync(client, first.DraftId!.Value)).Status);
        Assert.False((await DraftAsync(client, first.DraftId.Value)).CanApply);
        var previewOld = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{first.DraftId}/previews", new { expectedRevision = 1 });
        Assert.Equal("DRAFT_NOT_REVIEWABLE", await ProblemCodeAsync(previewOld));
        Assert.Equal(replacement.DraftId,
            (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Draft!.Id);

        // Cancelling the draft ends the flow without creating anything.
        var cancelDraft = await ReadAsync<PlanningDraftDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{replacement.DraftId}/cancel", new { expectedRevision = 1 }, "cancel-draft"));
        Assert.Equal("CANCELLED", cancelDraft.Status);
        Assert.Null((await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Draft);
    }

    [Theory]
    [InlineData(PlanningFixtures.InvalidTwoGoals, "DRAFT_INVALID")]
    [InlineData(PlanningFixtures.InvalidParent, "DRAFT_INVALID")]
    [InlineData(PlanningFixtures.InvalidOversized, "DRAFT_INVALID")]
    [InlineData(PlanningFixtures.WrongContext, "CONTEXT_INTEGRITY")]
    [InlineData(PlanningFixtures.ProviderError, "PROVIDER_ERROR")]
    public async Task Invalid_or_failed_generation_never_becomes_a_draft_and_keeps_the_input(string fixture,
        string failureCode)
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var attempt = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body($"failed-{fixture}"), fixture))).Id);
        Assert.Equal("FAILED", attempt.Status);
        Assert.Equal(failureCode, attempt.FailureCode);
        Assert.Null(attempt.DraftId);
        Assert.Equal(Intention, attempt.Intention);
        var active = (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!;
        Assert.Null(active.Draft);
        Assert.Null(active.Attempt);

        // A retry is a new attempt with the preserved input; the failed one blocks nothing.
        var retry = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body($"retry-{fixture}")))).Id);
        Assert.Equal("SUCCEEDED", retry.Status);
    }

    [Fact]
    public async Task Repairable_and_empty_outputs_are_reviewable_but_only_valid_work_can_be_applied()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);

        var repaired = await GenerateAsync(client, "repairable-1", PlanningFixtures.Repairable);
        Assert.Equal("پروژه نامرتب", repaired.Proposals.Single(x => x.Proposal.DraftId == "project").Proposal.Title);
        Assert.Equal("SYSTEM_DEFAULT", repaired.Proposals.Single(x => x.Proposal.DraftId == "project").Proposal.ReviewDateSource);
        Assert.True(repaired.CanApply);

        var empty = await GenerateAsync(client, "empty-1", PlanningFixtures.Empty, replaceActive: true);
        Assert.Empty(empty.Proposals);
        Assert.Single(empty.UnresolvedQuestions);
        Assert.False(empty.CanApply);
        var preview = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{empty.Id}/previews", new { expectedRevision = 1 });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, preview.StatusCode);
        Assert.Equal("DRAFT_NOT_APPLICABLE", await ProblemCodeAsync(preview));

        var blocked = await GenerateAsync(client, "blocked-1", PlanningFixtures.Blocked, replaceActive: true);
        Assert.Equal("BLOCKED", State(blocked, "goal"));
        Assert.Equal("BLOCKED_BY_ANCESTOR", State(blocked, "child"));
        Assert.Equal("BLOCKED", State(blocked, "weekly"));
        Assert.Equal("BLOCKED", State(blocked, "far"));
        Assert.Equal("BLOCKED", State(blocked, "clash"));
        Assert.Equal("INCLUDED", State(blocked, "ready"));
        Assert.False(blocked.CanApply);

        // Rewording the Goal answers the generator's concern and releases its child automatically.
        var corrected = await ReviseAsync(client, blocked, proposal: x => x.DraftId switch
        {
            "goal" => x with { DesiredOutcome = "رسیدن به سطح B2 تا پایان سال" },
            "weekly" or "far" or "clash" => x with { Included = false },
            _ => x
        });
        Assert.Equal("INCLUDED", State(corrected, "goal"));
        Assert.Equal("INCLUDED", State(corrected, "child"));
        Assert.Equal("EXCLUDED", State(corrected, "far"));
        Assert.True(corrected.CanApply);
    }

    [Fact]
    public async Task Revisions_are_immutable_validated_and_invalidate_the_previous_confirmation()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var draft = await GenerateAsync(client, "revision-1");
        var confirmation = await PreviewAsync(client, draft);
        Assert.Equal("CREATED", confirmation.Status);
        Assert.Equal(1, confirmation.Revision);
        // A linked confirmation is not an applied plan.
        var linked = await DraftAsync(client, draft.Id);
        Assert.Equal(confirmation.Id, linked.LinkedConfirmationId);
        Assert.Equal("REVIEWABLE", linked.Status);

        var revised = await ReviseAsync(client, draft, proposal: x => x.DraftId switch
        {
            "step-1" => x with { Title = "  عنوان ویرایش‌شده  ", PlannedDate = Day.AddDays(6) },
            "practice" => x with { Included = false },
            "goal" => x with { ReviewDate = Day.AddDays(45) },
            _ => x
        });
        Assert.Equal(2, revised.Revision);
        Assert.Null(revised.LinkedConfirmationId);
        var step = revised.Proposals.Single(x => x.Proposal.DraftId == "step-1").Proposal;
        Assert.Equal("عنوان ویرایش‌شده", step.Title);
        Assert.Equal(Day.AddDays(6), step.PlannedDate);
        Assert.Equal("INFERRED", step.Source);
        Assert.Equal("EXCLUDED", State(revised, "practice"));
        var goal = revised.Proposals.Single(x => x.Proposal.DraftId == "goal").Proposal;
        Assert.Equal("USER", goal.ReviewDateSource);
        Assert.DoesNotContain(revised.FirstWeek, x => x.DraftId == "practice");

        // The confirmation made for revision 1 can no longer be submitted.
        var stale = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "submit-old-revision");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, stale.StatusCode);
        Assert.Equal("CONFIRMATION_NOT_PENDING", await ProblemCodeAsync(stale));
        Assert.Equal("CANCELLED", (await client.GetFromJsonAsync<PlanningConfirmationDto>(
            $"/api/v1/planning/confirmations/{confirmation.Id}"))!.Status);

        var staleRevision = await ReviseResponseAsync(client, draft, "revise-stale",
            proposal: x => x with { Title = x.Title + "!" });
        Assert.Equal(HttpStatusCode.Conflict, staleRevision.StatusCode);
        Assert.Equal("CONFLICT_STALE_VERSION", await ProblemCodeAsync(staleRevision));
        Assert.Equal("NO_CHANGES", await ProblemCodeAsync(await ReviseResponseAsync(client, revised, "revise-none")));

        // An edit cannot add, remove or reclassify items, or break the hierarchy.
        var request = new RevisePlanningDraftRequest(2,
            revised.Proposals.Select(x => x.Proposal).Skip(1).ToArray(), revised.Facts.Select(x => x.Fact).ToArray());
        Assert.Equal("DRAFT_EDIT_INVALID", await ProblemCodeAsync(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{draft.Id}/revisions", request, "revise-missing")));
        Assert.Equal("DRAFT_EDIT_INVALID", await ProblemCodeAsync(await ReviseResponseAsync(client, revised,
            "revise-parent", proposal: x => x.DraftId == "project" ? x with { ParentDraftId = "step-1" } : x)));
        var reclassified = await ReviseAsync(client, revised,
            proposal: x => x.DraftId == "step-2" ? x with { EntityType = "ROUTINE", Source = "EXPLICIT" } : x,
            fact: x => x.DraftId == "fact-device" ? x with { Included = false, FactType = "EXCLUDED_PATH" } : x);
        Assert.Equal("TASK", reclassified.Proposals.Single(x => x.Proposal.DraftId == "step-2").Proposal.EntityType);
        Assert.Equal("INFERRED", reclassified.Proposals.Single(x => x.Proposal.DraftId == "step-2").Proposal.Source);
        Assert.Equal("AVAILABLE_DEVICE", reclassified.Facts.Single(x => x.Fact.DraftId == "fact-device").Fact.FactType);

        // A date outside the seven-day window is stored as the user's edit and blocks that item.
        var beyond = await ReviseAsync(client, reclassified,
            proposal: x => x.DraftId == "step-3" ? x with { PlannedDate = Day.AddDays(9) } : x);
        Assert.Equal("BLOCKED", State(beyond, "step-3"));
        Assert.Contains(beyond.Proposals.Single(x => x.Proposal.DraftId == "step-3").Issues,
            x => x.Code == "DATE_OUTSIDE_WINDOW");
        Assert.False(beyond.CanApply);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var revisions = await db.PlanningDraftRevisions.AsNoTracking().Where(x => x.DraftId == draft.Id)
            .OrderBy(x => x.Revision).ToListAsync();
        Assert.Equal(new[] { 1, 2, 3, 4 }, revisions.Select(x => x.Revision));
        Assert.Equal("GENERATED", revisions[0].Origin);
        Assert.DoesNotContain("ویرایش‌شده", revisions[0].ContentJson);
        Assert.Contains("ویرایش‌شده", revisions[1].ContentJson);
        var events = await db.DomainEvents.AsNoTracking()
            .Where(x => x.AggregateId == draft.Id && x.EventType == "PLANNING_DRAFT_REVISED").ToListAsync();
        Assert.Equal(3, events.Count);
        Assert.All(events, x => Assert.DoesNotContain("ویرایش‌شده", x.PayloadJson));
    }

    [Fact]
    public async Task Apply_creates_the_approved_plan_once_with_user_events_and_planning_details()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var generated = await GenerateAsync(client, "apply-1");
        // Work and planning details are approved independently.
        var draft = await ReviseAsync(client, generated,
            fact: x => x.DraftId == "fact-device" ? x with { Included = false } : x);
        var confirmation = await PreviewAsync(client, draft);
        Assert.Equal(7, confirmation.Items.Count);
        Assert.Equal("fact-friday", Assert.Single(confirmation.Facts).DraftId);
        Assert.Empty(confirmation.Warnings);
        Assert.False(confirmation.NoFactsRemembered);
        Assert.Null(confirmation.Result);

        var first = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "apply-key");
        var replay = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "apply-key");
        var result = await ReadAsync<PlanningApplyResultDto>(first);
        var replayed = await ReadAsync<PlanningApplyResultDto>(replay);
        Assert.Equal("RESOLVED", result.Status);
        Assert.NotNull(result.GoalId);
        Assert.Single(result.ProjectIds);
        Assert.Equal(4, result.TaskIds.Count);
        Assert.Single(result.RoutineIds);
        Assert.Equal(1, result.FactCount);
        Assert.Equal(result.GoalId, replayed.GoalId);
        Assert.Equal(result.TaskIds, replayed.TaskIds);

        // A client that lost its submission reads the confirmation instead of submitting again.
        var recovered = (await client.GetFromJsonAsync<PlanningConfirmationDto>(
            $"/api/v1/planning/confirmations/{confirmation.Id}"))!;
        Assert.Equal("RESOLVED", recovered.Status);
        Assert.Equal(result.GoalId, recovered.Result!.GoalId);
        var second = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "apply-key-2");
        Assert.Equal("CONFIRMATION_NOT_PENDING", await ProblemCodeAsync(second));

        // The draft's own lifecycle ended; it never claims to be confirmed.
        var applied = await DraftAsync(client, draft.Id);
        Assert.Equal("EXPIRED", applied.Status);
        Assert.Equal(confirmation.Id, applied.LinkedConfirmationId);
        Assert.Null((await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Draft);

        var goal = (await client.GetFromJsonAsync<GoalDto>($"/api/v1/goals/{result.GoalId}"))!;
        Assert.Equal("AI_ASSISTED", goal.Source);
        Assert.Equal("SYSTEM_DEFAULT", goal.ReviewDateSource);
        Assert.Equal(Day.AddDays(90), goal.ReviewDate);
        var project = (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{result.ProjectIds[0]}"))!;
        Assert.Equal(goal.Id, project.GoalId);
        var planned = draft.Proposals.Single(x => x.Proposal.DraftId == "step-1").Proposal;
        var tasks = new List<TaskDto>();
        foreach (var id in result.TaskIds) tasks.Add((await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{id}"))!);
        Assert.All(tasks, x => Assert.Equal("AI_ASSISTED", x.Source));
        Assert.Equal(3, tasks.Count(x => x.ProjectId == project.Id && x.GoalId is null));
        var undated = Assert.Single(tasks, x => x.GoalId == goal.Id);
        Assert.Null(undated.PlannedDate);
        Assert.Equal(planned.PlannedDate, tasks.Single(x => x.Title == planned.Title).PlannedDate);

        var facts = (await client.GetFromJsonAsync<List<PlanningFactDto>>($"/api/v1/planning/facts?goalId={goal.Id}"))!;
        var fact = Assert.Single(facts);
        Assert.Equal("UNAVAILABLE_WEEKDAY", fact.FactType);
        Assert.Equal("AVAILABILITY", fact.Category);
        Assert.Equal("HARD", fact.Strength);
        Assert.Equal("ACTIVE", fact.Status);
        Assert.Equal("USER_CONFIRMED_AI_EXTRACTION", fact.Source);
        Assert.Equal(new[] { 5 }, fact.Value.Weekdays);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var events = await db.DomainEvents.AsNoTracking()
                .Where(x => x.ConfirmationId == confirmation.Id).ToListAsync();
            var appliedEvent = Assert.Single(events, x => x.EventType == "PLANNING_DRAFT_APPLIED");
            Assert.Equal(9, events.Count);
            Assert.All(events, x =>
            {
                Assert.Equal("USER", x.Actor);
                Assert.Equal(appliedEvent.TransactionId, x.TransactionId);
                Assert.Equal(appliedEvent.CorrelationId, x.CorrelationId);
                Assert.DoesNotContain("انگلیسی", x.PayloadJson);
            });
            Assert.Single(events, x => x.EventType == "GOAL_CREATED");
            Assert.Equal(4, events.Count(x => x.EventType == "TASK_CREATED"));
            Assert.Single(events, x => x.EventType == "PLANNING_FACT_CREATED");
            var storedFact = await db.PlanningFacts.AsNoTracking().SingleAsync(x => x.Id == fact.Id);
            Assert.Equal(draft.AttemptId, storedFact.SourcePlanningAttemptId);
            Assert.Equal("R1", storedFact.RetentionClass);
            Assert.Equal(1, await db.Routines.CountAsync(x => x.UserId == session.UserId && x.GoalId == goal.Id));
        }

        // The user can take a detail out of future planning; its record stays for audit.
        var otherSession = await CreateSessionAsync();
        using var otherClient = Client(otherSession.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/v1/planning/facts?goalId={goal.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(otherClient, HttpMethod.Post,
            $"/api/v1/planning/facts/{fact.Id}/remove", new { expectedVersion = 1 }, "remove-cross")).StatusCode);
        var removed = await ReadAsync<PlanningFactDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/facts/{fact.Id}/remove", new { expectedVersion = 1 }, "remove-fact"));
        Assert.Equal("REMOVED", removed.Status);
        Assert.Empty((await client.GetFromJsonAsync<List<PlanningFactDto>>($"/api/v1/planning/facts?goalId={goal.Id}"))!);
    }

    [Fact]
    public async Task Excluding_a_parent_excludes_its_children_and_must_be_acknowledged()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var draft = await ReviseAsync(client, await GenerateAsync(client, "exclude-1"),
            proposal: x => x.DraftId == "project" ? x with { Included = false } : x,
            fact: x => x with { Included = false });
        Assert.All(new[] { "step-1", "step-2", "step-3" }, id =>
        {
            var item = draft.Proposals.Single(x => x.Proposal.DraftId == id);
            Assert.Equal("EXCLUDED", item.State);
            Assert.True(item.ExcludedByAncestor);
            // The child itself was never deselected: it follows its parent, it is not rewritten.
            Assert.True(item.Proposal.Included);
        });
        Assert.Equal("INCLUDED", State(draft, "goal"));

        var confirmation = await PreviewAsync(client, draft);
        var warning = Assert.Single(confirmation.Warnings);
        Assert.Equal("DESCENDANTS_EXCLUDED_WITH_PARENT", warning.Code);
        Assert.Equal(new[] { "step-1", "step-2", "step-3" }, warning.AffectedDraftIds);
        Assert.True(confirmation.NoFactsRemembered);

        var unacknowledged = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "exclude-no-ack");
        Assert.Equal("WARNING_NOT_ACKNOWLEDGED", await ProblemCodeAsync(unacknowledged));
        var wrong = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new
            {
                acknowledgedWarnings = new[] { new { warningId = warning.WarningId, warningHash = new string('A', 64) } }
            }, "exclude-wrong-ack");
        Assert.Equal("WARNING_NOT_ACKNOWLEDGED", await ProblemCodeAsync(wrong));
        await using (var scope = factory.Services.CreateAsyncScope())
            Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<AppDbContext>()
                .Goals.CountAsync(x => x.UserId == session.UserId));

        var result = await ReadAsync<PlanningApplyResultDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new
            {
                acknowledgedWarnings = new[] { new { warningId = warning.WarningId, warningHash = warning.WarningHash } }
            }, "exclude-ack"));
        Assert.Empty(result.ProjectIds);
        Assert.Single(result.TaskIds);
        Assert.Equal(0, result.FactCount);
    }

    [Fact]
    public async Task Planning_inside_a_goal_attaches_to_it_respects_its_hard_details_and_rejects_a_stale_confirmation()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var goal = await CreateGoalAsync(client, "context-goal");

        var draft = await GenerateAsync(client, "context-1", goalId: goal.Id);
        Assert.Equal("GOAL", draft.Context!.Type);
        Assert.Equal(goal.Id, draft.Context.Id);
        Assert.DoesNotContain(draft.Proposals, x => x.Proposal.EntityType == "GOAL");
        Assert.True(draft.Proposals.Single(x => x.Proposal.DraftId == "project").Proposal.UnderContext);
        var confirmation = await PreviewAsync(client, draft);

        // The Goal changes after the preview: what the user approved is no longer what would happen.
        (await SendAsync(client, HttpMethod.Put, $"/api/v1/goals/{goal.Id}", new
        {
            title = "هدف تغییرکرده", desiredOutcome = goal.DesiredOutcome, targetDate = (string?)null,
            reviewDate = (string?)null, expectedVersion = goal.Version
        }, "context-goal-edit")).EnsureSuccessStatusCode();
        var stale = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "context-stale");
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("CONFIRMATION_STALE", await ProblemCodeAsync(stale));
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(0, await db.Projects.CountAsync(x => x.UserId == session.UserId));
            Assert.Equal(0, await db.Tasks.CountAsync(x => x.UserId == session.UserId));
            Assert.Equal(0, await db.PlanningFacts.CountAsync(x => x.UserId == session.UserId));
        }

        // A fresh preview and an explicit confirmation are required; nothing rebases by itself.
        var fresh = await PreviewAsync(client, draft);
        var result = await ReadAsync<PlanningApplyResultDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{fresh.Id}/submit", new { }, "context-apply"));
        Assert.Null(result.GoalId);
        Assert.Equal(2, result.FactCount);
        var project = (await client.GetFromJsonAsync<ProjectDto>($"/api/v1/projects/{result.ProjectIds[0]}"))!;
        Assert.Equal(goal.Id, project.GoalId);
        Assert.Equal(2, (await client.GetFromJsonAsync<List<PlanningFactDto>>(
            $"/api/v1/planning/facts?goalId={goal.Id}"))!.Count);

        // The next window is planned from product state: the Goal's confirmed details are context,
        // so they are not proposed again and a HARD one rejects a conflicting date.
        var next = await GenerateAsync(client, "context-2", goalId: goal.Id);
        Assert.Empty(next.Facts);
        var friday = Enumerable.Range(0, 7).Select(Day.AddDays).Single(x => x.DayOfWeek == DayOfWeek.Friday);
        var conflicting = await ReviseAsync(client, next,
            proposal: x => x.DraftId == "step-1" ? x with { PlannedDate = friday } : x);
        Assert.Contains(conflicting.Proposals.Single(x => x.Proposal.DraftId == "step-1").Issues,
            x => x.Code == "HARD_CONSTRAINT_CONFLICT" && x.Origin == "RULE");
        Assert.False(conflicting.CanApply);

        // Planning inside a Project of that Goal uses the Goal's details and attaches to the Project.
        var inProject = await GenerateAsync(client, "context-3", projectId: project.Id, replaceActive: true);
        Assert.Equal("PROJECT", inProject.Context!.Type);
        Assert.Empty(inProject.Facts);
        Assert.DoesNotContain(inProject.Proposals, x => x.Proposal.EntityType is "GOAL" or "PROJECT");
        Assert.All(inProject.Proposals, x => Assert.True(x.Proposal.UnderContext));
        var applied = await ReadAsync<PlanningApplyResultDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{(await PreviewAsync(client, inProject)).Id}/submit", new { },
            "context-project-apply"));
        Assert.Equal(3, applied.TaskIds.Count);
        var task = (await client.GetFromJsonAsync<TaskDto>($"/api/v1/tasks/{applied.TaskIds[0]}"))!;
        Assert.Equal(project.Id, task.ProjectId);

        // A terminal or foreign parent is not a planning scope.
        var other = await CreateSessionAsync();
        using var otherClient = Client(other.Token);
        Assert.Equal(HttpStatusCode.NotFound,
            (await StartAsync(otherClient, Body("context-foreign", goalId: goal.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await StartAsync(client, Body("context-both", goalId: goal.Id, projectId: project.Id))).StatusCode);
    }

    [Fact]
    public async Task Context_is_bounded_to_the_scope_the_previous_window_and_counts_only()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        var stranger = await CreateSessionAsync();
        using var client = Client(session.Token);
        using var strangerClient = Client(stranger.Token);
        var goal = await CreateGoalAsync(client, "bounded-goal");
        var otherGoal = await CreateGoalAsync(client, "bounded-other-goal");
        var project = await CreateProjectAsync(client, goal.Id, "bounded-project");
        var old = await CreateTaskAsync(client, "bounded-old", goalId: goal.Id, plannedDate: Day);
        var recent = await CreateTaskAsync(client, "bounded-recent", projectId: project.Id, plannedDate: Day.AddDays(8));
        var overdue = await CreateTaskAsync(client, "bounded-overdue", projectId: project.Id, plannedDate: Day.AddDays(1));
        await CreateTaskAsync(client, "bounded-undated", goalId: goal.Id);
        await CreateTaskAsync(client, "bounded-elsewhere", goalId: otherGoal.Id, plannedDate: Day.AddDays(1));
        await CreateTaskAsync(client, "bounded-standalone", plannedDate: Day.AddDays(1));
        await CreateGoalAsync(strangerClient, "bounded-stranger");
        await CompleteAsync(client, old, Day, "bounded-complete-old");
        PinLocal(Day.AddDays(8));
        await CompleteAsync(client, recent, Day.AddDays(8), "bounded-complete-recent");
        PinLocal(Day.AddDays(9));

        await using var scope = factory.Services.CreateAsyncScope();
        var builder = scope.ServiceProvider.GetRequiredService<PlanningContextBuilder>();
        var token = TestContext.Current.CancellationToken;
        var context = await builder.BuildAsync(session.UserId, goal.Id, null, token);

        Assert.Equal(Day.AddDays(9), context.Today);
        Assert.Equal(Day.AddDays(15), context.WindowEnd);
        Assert.Equal(goal.Id, context.Scope!.Id);
        Assert.Equal(project.Id, Assert.Single(context.Projects).Id);
        // Only unfinished work of this Goal and its Projects, dated work first.
        Assert.Equal(new[] { overdue.Id }, context.UnfinishedTasks.Where(x => x.PlannedDate is not null).Select(x => x.Id));
        Assert.Equal(2, context.UnfinishedTasks.Count);
        Assert.Equal(new[] { "EXECUTION_OVERDUE" }, context.UnfinishedTasks[0].ReasonCodes);
        // Only the previous seven local days: the completion nine days ago is not supplied.
        var previous = context.PreviousWindow!;
        Assert.Equal(Day.AddDays(2), previous.StartDate);
        Assert.Equal(Day.AddDays(8), previous.EndDate);
        Assert.Equal(1, previous.CompletedTaskCount);
        Assert.Equal(recent.Title, Assert.Single(previous.CompletedTaskTitles));

        // The same state gives the same context; any change inside the scope gives another.
        Assert.Equal(context.Fingerprint, (await builder.BuildAsync(session.UserId, goal.Id, null, token)).Fingerprint);
        await CreateTaskAsync(client, "bounded-new", goalId: goal.Id);
        Assert.NotEqual(context.Fingerprint, (await builder.BuildAsync(session.UserId, goal.Id, null, token)).Fingerprint);

        var manifest = PlanningContextBuilder.Manifest(context);
        using var parsed = JsonDocument.Parse(manifest);
        Assert.Equal(2, parsed.RootElement.GetProperty("categories").GetProperty("UNFINISHED_TASKS").GetInt32());
        Assert.DoesNotContain(recent.Title, manifest);
        Assert.DoesNotContain(goal.Title, manifest);

        // Without a scope nothing of the user's work is supplied at all.
        var global = await builder.BuildAsync(session.UserId, null, null, token);
        Assert.Null(global.Scope);
        Assert.Empty(global.UnfinishedTasks);
        Assert.Null(global.PreviousWindow);
        await Assert.ThrowsAsync<TidySense.Common.Exceptions.ResourceNotFoundException>(
            () => builder.BuildAsync(stranger.UserId, goal.Id, null, token));
    }

    [Fact]
    public async Task An_expired_draft_cannot_be_previewed_or_applied_and_no_longer_blocks_a_new_flow()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var draft = await GenerateAsync(client, "expiry-1");
        var confirmation = await PreviewAsync(client, draft);

        PinLocal(Day.AddDays(1), 11);
        var expired = await DraftAsync(client, draft.Id);
        Assert.Equal("EXPIRED", expired.Status);
        Assert.False(expired.CanApply);
        Assert.Equal("EXPIRED", (await client.GetFromJsonAsync<PlanningConfirmationDto>(
            $"/api/v1/planning/confirmations/{confirmation.Id}"))!.Status);
        var submit = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, "expiry-submit");
        Assert.Equal("CONFIRMATION_EXPIRED", await ProblemCodeAsync(submit));
        var preview = await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{draft.Id}/previews", new { expectedRevision = 1 });
        Assert.Equal("DRAFT_EXPIRED", await ProblemCodeAsync(preview));
        Assert.Null((await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Draft);

        var next = await GenerateAsync(client, "expiry-2");
        Assert.Equal("REVIEWABLE", next.Status);
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<AppDbContext>()
            .Goals.CountAsync(x => x.UserId == session.UserId));
    }

    [Fact]
    public async Task Questions_are_answered_once_by_their_owner_and_the_flow_ends_in_a_reviewable_draft()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);

        var asked = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("clarify-1"), PlanningFixtures.Clarify))).Id);
        Assert.Equal("SUCCEEDED", asked.Status);
        Assert.Equal("CLARIFICATION", asked.Outcome);
        Assert.Null(asked.DraftId);
        Assert.Equal(new[] { "q1", "q2" }, asked.Clarification!.Questions.Select(x => x.Id));
        Assert.Equal(1, asked.Clarification.Turn);
        // The questions are the unfinished flow, and they are not a draft.
        var waiting = (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!;
        Assert.Equal(asked.Id, waiting.Clarification!.Id);
        Assert.Null(waiting.Draft);
        Assert.Null(waiting.Attempt);
        Assert.Null((await otherClient.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!.Clarification);

        object Answer(string id, object[] answers, bool draftNow = false) => new
        {
            clientAttemptId = $"attempt-{id}", intention = "متنی که نادیده گرفته می‌شود", replaceActive = false,
            previousAttemptId = asked.Id, answers, draftNow
        };
        Assert.Equal(HttpStatusCode.NotFound, (await StartAsync(otherClient,
            Answer("clarify-other", [new { questionId = "q1", text = "سه روز" }]), PlanningFixtures.Clarify)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await StartAsync(client,
            Answer("clarify-unknown", [new { questionId = "q9", text = "سه روز" }]), PlanningFixtures.Clarify)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await StartAsync(client,
            Answer("clarify-empty", [new { questionId = "q1", text = "   " }]), PlanningFixtures.Clarify)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await StartAsync(client, new
        {
            clientAttemptId = "attempt-clarify-orphan", intention = Intention, replaceActive = false,
            answers = new[] { new { questionId = "q1", text = "سه روز" } }
        })).StatusCode);

        var answered = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(await StartAsync(client,
            Answer("clarify-2", [new { questionId = "q1", text = "  سه روز در هفته  " }]), PlanningFixtures.Clarify))).Id);
        Assert.Equal("SUCCEEDED", answered.Status);
        Assert.Equal("DRAFT", answered.Outcome);
        Assert.Null(answered.Clarification);
        // The flow keeps the intention the questions were asked about.
        Assert.Equal(Intention, answered.Intention);
        Assert.Equal("REVIEWABLE", (await DraftAsync(client, answered.DraftId!.Value)).Status);

        var twice = await StartAsync(client, Answer("clarify-3", [new { questionId = "q2", text = "نه" }]),
            PlanningFixtures.Clarify);
        Assert.Equal(HttpStatusCode.Conflict, twice.StatusCode);
        Assert.Equal("CLARIFICATION_ALREADY_ANSWERED", await ProblemCodeAsync(twice));
        var active = (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!;
        Assert.Null(active.Clarification);
        Assert.Equal(answered.DraftId, active.Draft!.Id);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.PlanningAttempts.AsNoTracking().SingleAsync(x => x.Id == answered.Id);
        Assert.Equal(asked.Id, stored.PreviousAttemptId);
        Assert.Equal(1, stored.ClarificationTurn);
        Assert.Contains("سه روز در هفته", PlanningJson.Deserialize<PlanningAnswer[]>(stored.AnswersJson!).Single().Text);
        Assert.Equal(0, await db.Goals.CountAsync(x => x.UserId == owner.UserId));
    }

    [Fact]
    public async Task Clarification_stops_after_three_turns_or_when_the_user_asks_for_a_draft_now()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);

        async Task<PlanningAttemptDto> NextAsync(string id, string fixture, PlanningAttemptDto? previous,
            bool draftNow = false, bool replaceActive = false) => await WaitAsync(client,
            (await ReadAsync<PlanningAttemptDto>(await StartAsync(client, new
            {
                clientAttemptId = $"attempt-{id}", intention = Intention, replaceActive,
                previousAttemptId = previous?.Id, draftNow,
                answers = previous is null || draftNow
                    ? Array.Empty<object>()
                    : new object[] { new { questionId = previous.Clarification!.Questions[0].Id, text = "پاسخ" } }
            }, fixture))).Id);

        // A generator that always asks: three clarification turns are accepted, the fourth request may not ask.
        var turn = await NextAsync("turns-0", PlanningFixtures.ClarifyAlways, null);
        for (var index = 1; index <= 2; index++)
        {
            Assert.Equal("CLARIFICATION", turn.Outcome);
            Assert.Equal(index, turn.Clarification!.Turn);
            turn = await NextAsync($"turns-{index}", PlanningFixtures.ClarifyAlways, turn);
        }
        Assert.Equal("CLARIFICATION", turn.Outcome);
        Assert.Equal(3, turn.Clarification!.Turn);
        var beyond = await NextAsync("turns-3", PlanningFixtures.ClarifyAlways, turn);
        Assert.Equal("FAILED", beyond.Status);
        Assert.Equal("DRAFT_INVALID", beyond.FailureCode);
        Assert.Null(beyond.Outcome);
        Assert.Equal(Intention, beyond.Intention);

        // "Draft now" ends the questions without an answer.
        var asked = await NextAsync("now-0", PlanningFixtures.Clarify, null);
        Assert.Equal("CLARIFICATION", asked.Outcome);
        var drafted = await NextAsync("now-1", PlanningFixtures.Clarify, asked, draftNow: true);
        Assert.Equal("DRAFT", drafted.Outcome);
        Assert.NotNull(drafted.DraftId);

        // A generator that asks anyway is not obeyed: the attempt fails and the input is kept.
        var stubborn = await NextAsync("now-2", PlanningFixtures.ClarifyAlways, null, replaceActive: true);
        Assert.Equal("CLARIFICATION", stubborn.Outcome);
        var refused = await NextAsync("now-3", PlanningFixtures.ClarifyAlways, stubborn, draftNow: true);
        Assert.Equal("DRAFT_INVALID", refused.FailureCode);
    }

    [Fact]
    public async Task A_blocked_input_says_why_creates_nothing_and_cannot_be_answered()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);

        var blocked = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("blocked-input-1"), PlanningFixtures.InputBlocked))).Id);
        Assert.Equal("SUCCEEDED", blocked.Status);
        Assert.Equal("INPUT_BLOCKED", blocked.Outcome);
        Assert.Equal("TOO_VAGUE", blocked.Clarification!.BlockReason);
        Assert.NotEmpty(blocked.Clarification.Message!);
        Assert.Empty(blocked.Clarification.Questions);
        Assert.Null(blocked.DraftId);
        var active = (await client.GetFromJsonAsync<PlanningActiveDto>("/api/v1/planning/active"))!;
        Assert.Null(active.Clarification);
        Assert.Null(active.Draft);

        var answer = await StartAsync(client, new
        {
            clientAttemptId = "attempt-blocked-input-2", intention = Intention, replaceActive = false,
            previousAttemptId = blocked.Id, draftNow = true
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, answer.StatusCode);
        Assert.Equal("CLARIFICATION_NOT_PENDING", await ProblemCodeAsync(answer));

        // The user rewrites the intention and starts again; the manual path was never closed.
        Assert.Equal("DRAFT", (await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("blocked-input-3", intention: "یادگیری گیتار در سه ماه")))).Id)).Outcome);
        await CreateGoalAsync(client, "blocked-input-goal");
    }

    [Fact]
    public async Task A_kill_switch_refuses_generation_plainly_and_distinct_work_is_rate_limited()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        var calls = factory.PlanningGate.Calls;

        using (var off = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
                   configuration.AddInMemoryCollection(new Dictionary<string, string?>
                   {
                       ["Ai:Planning:KillSwitch"] = "true"
                   }))))
        using (var client = Client(session.Token, off))
        {
            var refused = await StartAsync(client, Body("killed-1"));
            Assert.Equal(HttpStatusCode.ServiceUnavailable, refused.StatusCode);
            Assert.Equal("PLANNING_AI_UNAVAILABLE", await ProblemCodeAsync(refused));
            Assert.Equal(calls, factory.PlanningGate.Calls);
            // Manual creation is untouched.
            await CreateGoalAsync(client, "killed-goal");
            await using var scope = factory.Services.CreateAsyncScope();
            Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<AppDbContext>()
                .PlanningAttempts.CountAsync(x => x.UserId == session.UserId));
        }

        using var limited = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Ai:Planning:AttemptsPerUserPerHour"] = "2"
            })));
        using var limitedClient = Client(session.Token, limited);
        var first = await WaitAsync(limitedClient, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(limitedClient, Body("limited-1")))).Id);
        await WaitAsync(limitedClient, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(limitedClient, Body("limited-2", replaceActive: true)))).Id);
        var third = await StartAsync(limitedClient, Body("limited-3", replaceActive: true));
        Assert.Equal(HttpStatusCode.TooManyRequests, third.StatusCode);
        Assert.Equal("AI_RATE_LIMITED", await ProblemCodeAsync(third));
        Assert.True(third.Headers.RetryAfter!.Delta > TimeSpan.Zero);
        // A replay is the same work: it is answered, not counted and not generated again.
        Assert.Equal(first.Id, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(limitedClient, Body("limited-1")))).Id);
        // Another user has their own allowance.
        var other = await CreateSessionAsync();
        using var otherClient = Client(other.Token, limited);
        Assert.Equal(HttpStatusCode.Accepted, (await StartAsync(otherClient, Body("limited-other"))).StatusCode);
    }

    [Fact]
    public async Task A_model_backed_attempt_reaches_review_only_through_the_gates_and_is_recorded_as_metadata()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        var provider = new AiPlanningRuntimeTests.ScriptedProvider();
        using var host = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Ai:Planning:Provider"] = "scripted",
                    ["Ai:Providers:scripted:BaseUrl"] = "https://provider.test",
                    ["Ai:Providers:scripted:ApiKey"] = "test-key",
                    ["Ai:Providers:scripted:Model"] = "test-model"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPlanningGenerator>();
                services.AddSingleton<IPlanningGenerator, AiPlanningGenerator>();
                services.RemoveAll<IAiCompletionClient>();
                services.AddSingleton<IAiCompletionClient>(provided => new OpenAiCompatibleChatClient(
                    new HttpClient(provider), provided.GetRequiredService<IOptionsMonitor<AiOptions>>()));
            });
        });
        using var client = Client(session.Token, host);
        // Text goes to a provider only for an account that agreed to it.
        (await SendAsync(client, HttpMethod.Put, "/api/v1/users/me/ai-consent",
            new { granted = true, noticeVersion = AiConsentPolicy.NoticeVersion }, "model-consent")).EnsureSuccessStatusCode();
        var output = PlanningOutputGateTests.Valid();
        output["draft"]!["proposals"]![2]!["plannedDate"] =
            Day.AddDays(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        HttpResponseMessage Completion(string content) => new(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new
            {
                choices = new[] { new { message = new { role = "assistant", content }, finish_reason = "stop" } },
                usage = new { prompt_tokens = 900, completion_tokens = 300 }
            })
        };

        provider.Reply(Completion(output.ToJsonString()));
        var done = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("model-1")))).Id);
        Assert.Equal("SUCCEEDED", done.Status);
        Assert.Equal("DRAFT", done.Outcome);
        var draft = await DraftAsync(client, done.DraftId!.Value);
        Assert.Equal(4, draft.Proposals.Count);
        Assert.Equal("SYSTEM_DEFAULT", draft.Proposals.Single(x => x.Proposal.DraftId == "goal").Proposal.ReviewDateSource);

        // An answer that tries to do more than propose is rejected whole; the input is kept.
        // The clock moves between operations so their records have an order.
        PinLocal(Day, 11);
        var acting = PlanningOutputGateTests.Valid();
        acting["commands"] = JsonSerializer.SerializeToNode(new[] { "DROP_ALL_TASKS" });
        provider.Reply(Completion(acting.ToJsonString()));
        var rejected = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("model-2", replaceActive: true)))).Id);
        Assert.Equal("FAILED", rejected.Status);
        Assert.Equal("DRAFT_INVALID", rejected.FailureCode);
        Assert.Equal(Intention, rejected.Intention);

        // A provider that is down is tried twice and no more.
        PinLocal(Day, 12);
        provider.Reply(HttpStatusCode.ServiceUnavailable);
        provider.Reply(HttpStatusCode.ServiceUnavailable);
        var down = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(
            await StartAsync(client, Body("model-3")))).Id);
        Assert.Equal("PROVIDER_ERROR", down.FailureCode);
        Assert.Equal(4, provider.Calls.Count);

        // Cancelling abandons the call that is in flight; nothing appears later.
        PinLocal(Day, 13);
        provider.Hang();
        var held = await ReadAsync<PlanningAttemptDto>(await StartAsync(client, Body("model-4")));
        for (var wait = 0; wait < 200 && provider.Calls.Count < 5; wait++)
            await Task.Delay(25, TestContext.Current.CancellationToken);
        Assert.Equal("CANCELLED", (await ReadAsync<PlanningAttemptDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/attempts/{held.Id}/cancel", new { }))).Status);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        AiInvocation[] rows = [];
        for (var wait = 0; wait < 200; wait++)
        {
            rows = await db.AiInvocations.AsNoTracking().Where(x => x.UserId == session.UserId)
                .OrderBy(x => x.StartedAt).ThenBy(x => x.Sequence).ToArrayAsync();
            if (rows.Length == 5) break;
            await Task.Delay(25, TestContext.Current.CancellationToken);
        }
        Assert.Equal(new[] { "SUCCEEDED", "REJECTED", "FAILED", "FAILED", "CANCELLED" }, rows.Select(x => x.Outcome));
        Assert.Equal(new[] { 1, 1, 1, 2, 1 }, rows.Select(x => x.Sequence));
        Assert.Equal(done.Id, rows[0].PlanningAttemptId);
        Assert.Equal(900, rows[0].InputTokens);
        Assert.Equal("SCHEMA", rows[1].Gate);
        Assert.All(rows, x =>
        {
            Assert.Equal("PLANNING", x.Family);
            Assert.Equal("scripted", x.ProviderKey);
            Assert.Equal("test-model", x.Model);
            Assert.Equal("R4", x.RetentionClass);
        });
        Assert.Equal("planning.standard", (await db.PlanningAttempts.AsNoTracking().SingleAsync(x => x.Id == done.Id)).GeneratorKey);
        Assert.Equal("CANCELLED", (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{held.Id}"))!.Status);
        // Whatever the model returned, nothing canonical exists and the manual path works.
        Assert.Equal(0, await db.Goals.CountAsync(x => x.UserId == session.UserId));
        Assert.Equal(0, await db.Tasks.CountAsync(x => x.UserId == session.UserId));
        await CreateGoalAsync(client, "model-goal");
    }

    private static object Body(string clientAttemptId, string? intention = null, Guid? goalId = null,
        Guid? projectId = null, bool replaceActive = false) => new
    {
        clientAttemptId = $"attempt-{clientAttemptId}", intention = intention ?? Intention, goalId, projectId,
        replaceActive
    };

    private static string State(PlanningDraftDto draft, string draftId) =>
        draft.Proposals.Single(x => x.Proposal.DraftId == draftId).State;

    private static async Task<HttpResponseMessage> StartAsync(HttpClient client, object body, string? fixture = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/planning/attempts")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("Origin", "http://localhost");
        if (fixture is not null) request.Headers.Add("X-Planning-Fixture", fixture);
        return await client.SendAsync(request);
    }

    /// <summary>Polls the attempt by id, as a client would, until it leaves the queue and stops running.</summary>
    private static async Task<PlanningAttemptDto> WaitAsync(HttpClient client, Guid id)
    {
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var current = (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{id}"))!;
            if (current.Status is not ("QUEUED" or "RUNNING")) return current;
            await Task.Delay(50);
        }
        throw new TimeoutException("The planning attempt did not finish.");
    }

    private static async Task<PlanningDraftDto> GenerateAsync(HttpClient client, string clientAttemptId,
        string? fixture = null, Guid? goalId = null, Guid? projectId = null, bool replaceActive = false)
    {
        var started = await ReadAsync<PlanningAttemptDto>(await StartAsync(client,
            Body(clientAttemptId, goalId: goalId, projectId: projectId, replaceActive: replaceActive), fixture));
        var done = await WaitAsync(client, started.Id);
        Assert.Equal("SUCCEEDED", done.Status);
        return await DraftAsync(client, done.DraftId!.Value);
    }

    private static async Task<PlanningDraftDto> DraftAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<PlanningDraftDto>($"/api/v1/planning/drafts/{id}"))!;

    private static async Task<PlanningConfirmationDto> PreviewAsync(HttpClient client, PlanningDraftDto draft) =>
        await ReadAsync<PlanningConfirmationDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{draft.Id}/previews", new { expectedRevision = draft.Revision }));

    private static Task<HttpResponseMessage> ReviseResponseAsync(HttpClient client, PlanningDraftDto draft,
        string key, Func<PlanningProposal, PlanningProposal>? proposal = null,
        Func<PlanningFactProposal, PlanningFactProposal>? fact = null) => SendAsync(client, HttpMethod.Post,
        $"/api/v1/planning/drafts/{draft.Id}/revisions", new RevisePlanningDraftRequest(draft.Revision,
            draft.Proposals.Select(x => (proposal ?? (p => p))(x.Proposal)).ToArray(),
            draft.Facts.Select(x => (fact ?? (f => f))(x.Fact)).ToArray()), key);

    private static async Task<PlanningDraftDto> ReviseAsync(HttpClient client, PlanningDraftDto draft,
        Func<PlanningProposal, PlanningProposal>? proposal = null,
        Func<PlanningFactProposal, PlanningFactProposal>? fact = null) => await ReadAsync<PlanningDraftDto>(
        await ReviseResponseAsync(client, draft, $"revise-{Guid.NewGuid():N}", proposal, fact));

    private void PinLocal(DateOnly date, int hour = 10) =>
        factory.Clock.Pin(new DateTimeOffset(date.Year, date.Month, date.Day, hour, 0, 0,
            TimeSpan.FromMinutes(210)));

    private HttpClient Client(string token, WebApplicationFactory<Program>? host = null)
    {
        var client = (host ?? factory).CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private async Task<Session> CreateSessionAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Session(user.Id, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private static async Task<GoalDto> CreateGoalAsync(HttpClient client, string key) =>
        await ReadAsync<GoalDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/goals",
            new { title = $"هدف {key}", desiredOutcome = "نتیجه روشن", targetDate = (string?)null, reviewDate = (string?)null }, key));

    private static async Task<ProjectDto> CreateProjectAsync(HttpClient client, Guid? goalId, string key) =>
        await ReadAsync<ProjectDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/projects", new
        {
            title = $"پروژه {key}", completionMeaning = (string?)null, goalId, targetDate = (string?)null,
            reviewDate = (string?)null
        }, key));

    private static async Task<TaskDto> CreateTaskAsync(HttpClient client, string key, Guid? goalId = null,
        Guid? projectId = null, DateOnly? plannedDate = null) =>
        await ReadAsync<TaskDto>(await SendAsync(client, HttpMethod.Post, "/api/v1/tasks", new
        {
            title = $"کار {key}", description = (string?)null, goalId, projectId, plannedDate,
            deadline = (string?)null, sequenceId = (string?)null, sequenceOrder = (int?)null, isProtected = false
        }, key));

    private static async Task CompleteAsync(HttpClient client, TaskDto task, DateOnly localDate, string key) =>
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/tasks/{task.Id}/complete",
            new { expectedVersion = task.Version, completedForLocalDate = localDate }, key)).EnsureSuccessStatusCode();

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task<string?> ProblemCodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString();

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method,
        string path, object body, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Session(Guid UserId, string Token);
}
