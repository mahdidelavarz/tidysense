using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.DTOs.Operations;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Operations;

namespace TidySense.Backend.Tests;

/// <summary>
/// The metric dictionary against one fixed set of records: every numerator and denominator is
/// reproduced exactly, for the primary population and for internal accounts apart from it.
/// </summary>
public sealed class OperationsMetricsTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private const string InternalPhone = "+989120007701";
    private static readonly DateTimeOffset From = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset To = new(2025, 2, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset T0 = new(2025, 1, 10, 8, 0, 0, TimeSpan.Zero);
    private static readonly string Hash = new('D', 64);

    [Fact]
    public async Task Every_metric_reproduces_its_numerator_and_denominator_from_the_fixture()
    {
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Operations:InternalPhones:0"] = InternalPhone
            })));
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var a = User("+989120007702");
        var b = User("+989120007703");
        var inside = User(InternalPhone);
        db.AddRange(a, b, inside);
        await db.SaveChangesAsync();
        await SeedPlanningAsync(db, a.Id, b.Id, inside.Id);
        await SeedReconcileAsync(db, a.Id, b.Id, inside.Id);

        var service = scope.ServiceProvider.GetRequiredService<PilotMetricsService>();
        var result = await service.ComputeAsync(From, To, TestContext.Current.CancellationToken);
        Assert.Equal(PilotMetricCatalog.Version, result.CatalogVersion);
        Assert.Equal(PilotMetricCatalog.Metrics.Select(x => x.Id), result.Primary.Select(x => x.Id));
        Assert.Equal(PilotMetricCatalog.Metrics.Select(x => x.Id), result.Internal.Select(x => x.Id));
        Assert.Contains(result.External, x => x.Id == "H2.UNDERSTANDING_SCORE");

        // H1: four flows by two accounts; a later attempt of the same flow is not a second flow.
        Expect(result.Primary, "H1.FLOWS_STARTED", ("", 4, 2));
        Expect(result.Primary, "H1.REVIEWABLE_DRAFT", ("", 3, 4));
        Expect(result.Primary, "H1.FLOW_OUTCOME", ("DRAFT", 3, 4), ("FAILED:PROVIDER_ERROR", 1, 4));
        Expect(result.Primary, "H1.TIME_TO_DRAFT_SECONDS", ("", 40, 3));
        Expect(result.Primary, "H1.DRAFT_DISPOSITION", ("APPLIED", 2, 3), ("CANCELLED_BY_USER", 1, 3));
        Expect(result.Primary, "H1.ACCEPTANCE", ("EDITED", 1, 3), ("UNCHANGED", 1, 3));
        Expect(result.Primary, "H1.APPLIED_PLAN", ("", 2, 4));
        // A conflicted submission is a command result, never an applied plan.
        Expect(result.Primary, "H1.APPLY_SUBMISSIONS", ("CONFLICTED", 1, 3), ("SUCCEEDED", 2, 3));
        Expect(result.Primary, "H1.NON_TRIVIAL_PLAN", ("", 1, 2));
        Expect(result.Primary, "H1.REVERSAL_7D", ("", 1, 2));

        // H2: every band on its own; acceptance and application are separate rows.
        // An eligible day counts once, whether or not a session followed.
        Expect(result.Primary, "H2.ELIGIBLE_START_RATE", ("LIGHT", 0, 1), ("MEDIUM", 2, 2), ("RECOVERY", 1, 1));
        Expect(result.Primary, "H2.SESSIONS_OPENED", ("LIGHT", 1, 1), ("MEDIUM", 3, 2), ("RECOVERY", 1, 1));
        Expect(result.Primary, "H2.DETERMINISTIC_AVAILABILITY", ("", 6, 7));
        Expect(result.Primary, "H2.ELIGIBLE_SESSIONS", ("LIGHT", 0, 1), ("MEDIUM", 3, 3), ("RECOVERY", 1, 1));
        Expect(result.Primary, "H2.EXPLANATION_REQUESTED", ("MEDIUM", 2, 3), ("RECOVERY", 1, 1));
        Expect(result.Primary, "H2.EXPLANATION_AVAILABLE", ("MEDIUM", 1, 2), ("RECOVERY", 0, 1));
        Expect(result.Primary, "H2.EXPLANATION_OUTCOME", ("FAILED:GENERATION_TIMEOUT", 1, 3),
            ("FAILED:PROVIDER_ERROR", 1, 3), ("READY", 1, 3));
        Expect(result.Primary, "H2.RECOMMENDATION_DISPOSITION", ("ACCEPTED", 1, 4), ("ACCEPTED_EDITED", 1, 4),
            ("EXPIRED_WITHOUT_DECISION", 1, 4), ("REJECTED", 1, 4));
        Expect(result.Primary, "H2.RECOMMENDATION_APPLICATION", ("ACCEPTED_CONFLICTED", 1, 2), ("APPLIED", 1, 2));
        Expect(result.Primary, "H2.MANUAL_ESCAPE", ("MEDIUM", 1, 1), ("RECOVERY", 0, 1));
        Expect(result.Primary, "H2.UNRESOLVED_WORK_REDUCTION", ("MEDIUM", 5, 6));
        Expect(result.Primary, "H2.DECISION_COMPRESSION", ("", 5, 2));
        Expect(result.Primary, "H2.USER_CONTRIBUTION", ("", 3, 5));

        // The internal account is reported apart and appears in no primary row.
        Expect(result.Internal, "H1.FLOWS_STARTED", ("", 1, 1));
        Expect(result.Internal, "H1.DRAFT_DISPOSITION", ("PENDING", 1, 1));
        Expect(result.Internal, "H2.SESSIONS_OPENED", ("LIGHT", 1, 1));
        Expect(result.Internal, "H2.ELIGIBLE_SESSIONS", ("LIGHT", 0, 1));
        Expect(result.Internal, "H2.ELIGIBLE_START_RATE", ("LIGHT", 1, 1));

        // The same definitions over the same records give the same numbers.
        var again = await service.ComputeAsync(From, To, TestContext.Current.CancellationToken);
        Assert.Equal(JsonSerializer.Serialize(result.Primary), JsonSerializer.Serialize(again.Primary));

        // A window without records shows counts of zero, never a rate.
        var empty = await service.ComputeAsync(From.AddYears(-5), To.AddYears(-5), TestContext.Current.CancellationToken);
        Expect(empty.Primary, "H1.REVIEWABLE_DRAFT", ("", 0, 0));
        Expect(empty.Primary, "H1.TIME_TO_DRAFT_SECONDS", ("", 0, 0));
        Expect(empty.Primary, "H2.USER_CONTRIBUTION", ("", 0, 0));
        Assert.Empty(empty.Primary.Single(x => x.Id == "H2.SESSIONS_OPENED").Rows);
    }

    [Fact]
    public void Every_definition_states_its_unit_numerator_denominator_window_and_missing_data()
    {
        Assert.Equal(PilotMetricCatalog.Metrics.Count, PilotMetricCatalog.Metrics.Select(x => x.Id).Distinct().Count());
        Assert.All(PilotMetricCatalog.Metrics, x =>
        {
            Assert.Contains(x.Hypothesis, new[] { "H1", "H2" });
            Assert.StartsWith(x.Hypothesis + ".", x.Id);
            Assert.True(x.DefinitionVersion > 0);
            Assert.All(new[] { x.UnitOfAnalysis, x.Numerator, x.Denominator, x.Window, x.MissingData, x.Segmentation },
                text => Assert.False(string.IsNullOrWhiteSpace(text)));
            // Every query is bounded by the window and split by population.
            Assert.Contains("@from", x.Sql);
            Assert.Contains("@to", x.Sql);
            Assert.Contains("@excluded", x.Sql);
            Assert.Contains("@internal", x.Sql);
        });
    }

    private static void Expect(IReadOnlyList<MetricResultDto> results, string id,
        params (string Segment, long Numerator, long Denominator)[] rows)
    {
        var actual = results.Single(x => x.Id == id).Rows
            .Select(x => (x.Segment, x.Numerator, x.Denominator)).OrderBy(x => x.Segment, StringComparer.Ordinal);
        Assert.Equal(rows.OrderBy(x => x.Segment, StringComparer.Ordinal), actual);
    }

    private static async Task SeedPlanningAsync(AppDbContext db, Guid a, Guid b, Guid inside)
    {
        // Flow 1 (A): questions, then a draft after 100 seconds; edited, applied, one created Task dropped two days later.
        var asking = Attempt(a, T0, T0.AddSeconds(30), x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = "{\"questions\":[{\"id\":\"q1\",\"text\":\"?\"}]}";
        });
        var answered = Attempt(a, T0.AddSeconds(60), T0.AddSeconds(100), x =>
        {
            x.PreviousAttemptId = asking.Id;
            x.ClarificationTurn = 1;
            x.AnswersJson = "[]";
            Drafted(x);
        });
        db.Add(asking);
        await db.SaveChangesAsync();
        var edited = Draft(answered, PlanningDraftStatuses.Expired, revisions: 2);
        db.AddRange(answered, edited);
        await db.SaveChangesAsync();
        var appliedAt = T0.AddSeconds(200);
        var first = await ApplyAsync(db, a, edited, 2, appliedAt, projects: 1, tasks: 2);
        var task = Guid.NewGuid();
        db.AddRange(
            Event(a, "Task", task, "TASK_CREATED", appliedAt,
                JsonSerializer.Serialize(new { source = "AI_ASSISTED", parentScope = "STANDALONE", hasPlannedDate = true, inSequence = false }),
                confirmationId: first),
            Event(a, "Task", task, "TASK_DROPPED", appliedAt.AddDays(2), "{}"));

        // Flow 2 (A): the provider failed.
        db.Add(Attempt(a, T0.AddHours(1), T0.AddHours(1).AddSeconds(5), x =>
        {
            x.Status = PlanningAttemptStatuses.Failed;
            x.FailureCode = "PROVIDER_ERROR";
        }));

        // Flow 3 (B): a draft after 40 seconds, cancelled by the user.
        var cancelledAttempt = Attempt(b, T0, T0.AddSeconds(40), Drafted);
        var cancelled = Draft(cancelledAttempt, PlanningDraftStatuses.Cancelled);
        db.AddRange(cancelledAttempt, cancelled, Event(b, "PlanningDraft", cancelled.Id, "PLANNING_DRAFT_CANCELLED",
            T0.AddMinutes(5), "{\"reason\":\"USER\"}"));

        // Flow 4 (B): a draft after 20 seconds, applied unchanged, one Task only. An earlier submission conflicted.
        var plainAttempt = Attempt(b, T0.AddHours(2), T0.AddHours(2).AddSeconds(20), Drafted);
        var plain = Draft(plainAttempt, PlanningDraftStatuses.Expired);
        db.AddRange(plainAttempt, plain, Result(b, "APPLY_PLANNING_DRAFT", "CONFLICTED", T0.AddHours(2).AddMinutes(1)));
        await db.SaveChangesAsync();
        await ApplyAsync(db, b, plain, 1, T0.AddHours(2).AddMinutes(2), tasks: 1);

        // Internal account: a draft still waiting. Outside the window: a flow of A two months later.
        var pendingAttempt = Attempt(inside, T0, T0.AddSeconds(10), Drafted);
        var late = Attempt(a, To.AddDays(40), To.AddDays(40).AddSeconds(10), x =>
        {
            x.Status = PlanningAttemptStatuses.Failed;
            x.FailureCode = "PROVIDER_ERROR";
        });
        db.AddRange(pendingAttempt, Draft(pendingAttempt, PlanningDraftStatuses.Reviewable), late);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task SeedReconcileAsync(AppDbContext db, Guid a, Guid b, Guid inside)
    {
        var t = new DateTimeOffset(2025, 1, 15, 8, 0, 0, TimeSpan.Zero);

        // S1 (A, MEDIUM): a ready explanation with four recommendations; four actionable at opening, one at completion.
        var s1 = Session(a, "MEDIUM", ReconcileSessionStatuses.Completed, t, 4, matched: true);
        var ready = Explanation(s1, ReconcileExplanationStatuses.Ready, null);
        var applied = Result(a, "SUBMIT_RECONCILE_CONFIRMATION", "SUCCEEDED", t.AddMinutes(3));
        var conflicted = Result(a, "SUBMIT_RECONCILE_CONFIRMATION", "CONFLICTED", t.AddMinutes(4));
        var accepted = Recommendation(ready, 1, ReconcileRecommendationDispositions.Accepted, applied.Id);
        db.AddRange(s1, ready, applied, conflicted, accepted,
            Recommendation(ready, 2, ReconcileRecommendationDispositions.AcceptedEdited, conflicted.Id),
            Recommendation(ready, 3, ReconcileRecommendationDispositions.Rejected, null),
            Recommendation(ready, 4, ReconcileRecommendationDispositions.ExpiredWithoutDecision, null));
        await db.SaveChangesAsync();
        db.AddRange(Confirmation(a, s1.Id, accepted.Id, t.AddMinutes(3)),
            Event(a, "ActionConfirmation", Guid.NewGuid(), "RECONCILE_ACTION_CONFIRMED", t.AddMinutes(3),
                "{\"actionType\":\"REPLAN_TASKS\",\"affectedCount\":3}", sessionId: s1.Id),
            Completed(a, s1, 1));

        // S2 (A, LIGHT): nothing matched a rule. S5 (A, MEDIUM): matched, never asked for an explanation.
        db.AddRange(Session(a, "LIGHT", ReconcileSessionStatuses.Expired, t.AddDays(1), 1, matched: false),
            Session(a, "MEDIUM", ReconcileSessionStatuses.Expired, t.AddDays(2), 3, matched: true));

        // S3 (B, MEDIUM): the explanation failed and the user went on by hand; two actionable resolved.
        var s3 = Session(b, "MEDIUM", ReconcileSessionStatuses.Completed, t, 2, matched: true);
        db.AddRange(s3, Explanation(s3, ReconcileExplanationStatuses.Failed, "PROVIDER_ERROR"),
            Confirmation(b, s3.Id, null, t.AddMinutes(6)),
            Event(b, "ActionConfirmation", Guid.NewGuid(), "RECONCILE_ACTION_CONFIRMED", t.AddMinutes(6),
                "{\"actionType\":\"KEEP_TASKS\",\"affectedCount\":2}", sessionId: s3.Id),
            Completed(b, s3, 0));

        // S4 (B, RECOVERY): the explanation failed and nothing was applied.
        var s4 = Session(b, "RECOVERY", ReconcileSessionStatuses.Abandoned, t.AddDays(1), 9, matched: true);
        db.AddRange(s4, Explanation(s4, ReconcileExplanationStatuses.Failed, "GENERATION_TIMEOUT"));

        // Opening commands: five sessions opened, one answered with the session already open, one conflicted.
        db.AddRange(Enumerable.Range(0, 3).Select(i => Result(a, "OPEN_RECONCILE_SESSION", "SUCCEEDED", t.AddDays(i))));
        db.AddRange(Enumerable.Range(0, 2).Select(i => Result(b, "OPEN_RECONCILE_SESSION", "SUCCEEDED", t.AddDays(i))));
        var already = Result(a, "OPEN_RECONCILE_SESSION", "FAILED_FINAL", t.AddHours(1));
        already.ErrorCode = "RECONCILE_SESSION_ALREADY_OPEN";
        db.AddRange(already, Result(b, "OPEN_RECONCILE_SESSION", "CONFLICTED", t.AddHours(2)));

        // Eligible days: A and B on the day of S1 and S3, B on the day of S4, and A on a day without any session.
        ReconcileExposure Exposure(Guid userId, DateTimeOffset at, string severity) => new()
        {
            Id = Guid.NewGuid(), UserId = userId, LocalDate = DateOnly.FromDateTime(at.UtcDateTime),
            Severity = severity, FirstSeenAt = at
        };
        db.AddRange(Exposure(a, t, "MEDIUM"), Exposure(b, t, "MEDIUM"), Exposure(b, t.AddDays(1), "RECOVERY"),
            Exposure(a, t.AddDays(5), "LIGHT"), Exposure(inside, t, "LIGHT"));

        db.Add(Session(inside, "LIGHT", ReconcileSessionStatuses.Completed, t, 0, matched: false));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    /// <summary>The confirmation, the succeeded command and the applied event of one draft.</summary>
    private static async Task<Guid> ApplyAsync(AppDbContext db, Guid userId, PlanningDraft draft, int revision,
        DateTimeOffset at, int projects = 0, int tasks = 0)
    {
        var confirmation = new ActionConfirmation
        {
            Id = Guid.NewGuid(), UserId = userId, PlanningDraftId = draft.Id, PlanningDraftRevision = revision,
            ActionType = "APPLY_PLANNING_DRAFT", PreviewHash = Hash, Status = ActionConfirmationStatuses.Resolved,
            CreatedAt = at.AddMinutes(-1), ExpiresAt = at.AddMinutes(14), ResolvedAt = at
        };
        var result = Result(userId, "APPLY_PLANNING_DRAFT", "SUCCEEDED", at);
        db.AddRange(confirmation, result);
        await db.SaveChangesAsync();
        db.Add(Event(userId, "PlanningDraft", draft.Id, "PLANNING_DRAFT_APPLIED", at, JsonSerializer.Serialize(new
        {
            goalCount = 0, projectCount = projects, taskCount = tasks, routineCount = 0, factCount = 0
        }), confirmationId: confirmation.Id, resultId: result.Id));
        await db.SaveChangesAsync();
        return confirmation.Id;
    }

    private static User User(string phone) => new()
    {
        Id = Guid.NewGuid(), PhoneNumber = phone, IsActive = true, SetupComplete = true, CreatedAt = T0.AddDays(-30)
    };

    private static PlanningAttempt Attempt(Guid userId, DateTimeOffset created, DateTimeOffset completed,
        Action<PlanningAttempt> set)
    {
        var attempt = new PlanningAttempt
        {
            Id = Guid.NewGuid(), UserId = userId, ClientAttemptId = Guid.NewGuid().ToString("N"), RequestHash = Hash,
            Status = PlanningAttemptStatuses.Succeeded, Intention = "fixture", GeneratorKey = "fixture",
            ContextBuilderVersion = "fixture", ContextFingerprint = Hash, CreatedAt = created, UpdatedAt = completed,
            CompletedAt = completed
        };
        set(attempt);
        return attempt;
    }

    private static void Drafted(PlanningAttempt attempt)
    {
        attempt.Outcome = PlanningOutcomes.Draft;
        attempt.DraftId = Guid.NewGuid();
    }

    private static PlanningDraft Draft(PlanningAttempt attempt, string status, int revisions = 1) => new()
    {
        Id = attempt.DraftId!.Value, UserId = attempt.UserId, AttemptId = attempt.Id, Status = status,
        CurrentRevision = revisions, SchemaVersion = "fixture", ContextFingerprint = Hash,
        CreatedAt = attempt.CompletedAt!.Value, UpdatedAt = attempt.CompletedAt.Value,
        ExpiresAt = attempt.CompletedAt.Value.AddDays(1),
        Revisions = Enumerable.Range(1, revisions).Select(x => new PlanningDraftRevision
        {
            Id = Guid.NewGuid(), Revision = x, CreatedAt = attempt.CompletedAt.Value,
            Origin = x == 1 ? PlanningRevisionOrigins.Generated : PlanningRevisionOrigins.UserEdit
        }).ToList()
    };

    private static CommandResult Result(Guid userId, string type, string status, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, IdempotencyRecordId = Guid.NewGuid(), CommandType = type,
        Status = status, CreatedAt = at
    };

    private static DomainEvent Event(Guid userId, string aggregateType, Guid aggregateId, string type,
        DateTimeOffset at, string payload, Guid? confirmationId = null, Guid? resultId = null,
        Guid? sessionId = null) => new()
    {
        EventId = Guid.NewGuid(), EventType = type, EventVersion = 1, OccurredAt = at, RecordedAt = at,
        UserId = userId, Actor = "USER", AggregateType = aggregateType, AggregateId = aggregateId,
        AggregateVersion = 1, TransactionId = Guid.NewGuid(), CorrelationId = Guid.NewGuid().ToString("N"),
        ConfirmationId = confirmationId, CommandResultId = resultId, ReconcileSessionId = sessionId,
        PayloadJson = payload
    };

    private static DomainEvent Completed(Guid userId, ReconcileSession session, int actionable) =>
        Event(userId, "ReconcileSession", session.Id, "RECONCILE_SESSION_COMPLETED", session.CompletedAt!.Value,
            JsonSerializer.Serialize(new
            {
                severity = "LIGHT", actionableBacklogCount = actionable, reviewDueCount = 0, unresolvedCaptureCount = 0
            }), sessionId: session.Id);

    private static ReconcileSession Session(Guid userId, string severity, string status, DateTimeOffset opened,
        int actionable, bool matched)
    {
        var id = Guid.NewGuid();
        return new ReconcileSession
        {
            Id = id, UserId = userId, Status = status, Severity = severity, RulesCatalogVersion = "fixture",
            Timezone = "Asia/Tehran", LocalDate = DateOnly.FromDateTime(opened.UtcDateTime), OpenedAt = opened,
            CompletedAt = opened.AddMinutes(10), ActionableBacklogCount = actionable,
            RuleMatches = matched
                ?
                [
                    new RuleMatch
                    {
                        Id = Guid.NewGuid(), SessionId = id, RuleId = "R2", RuleVersion = "fixture",
                        AffectedEntityIds = [Guid.NewGuid()], MatchedAt = opened
                    }
                ]
                : []
        };
    }

    private static ReconcileExplanation Explanation(ReconcileSession session, string status, string? failure) => new()
    {
        Id = Guid.NewGuid(), SessionId = session.Id, UserId = session.UserId, Status = status,
        ExplainerKey = "fixture", ContextBuilderVersion = "fixture", ContextFingerprint = Hash,
        Summary = status == ReconcileExplanationStatuses.Ready ? "summary" : null, FailureCode = failure,
        CreatedAt = session.OpenedAt.AddMinutes(1), CompletedAt = session.OpenedAt.AddMinutes(2)
    };

    private static ReconcileRecommendation Recommendation(ReconcileExplanation explanation, int ordinal,
        string disposition, Guid? resultId) => new()
    {
        Id = Guid.NewGuid(), ExplanationId = explanation.Id, UserId = explanation.UserId, Ordinal = ordinal,
        RuleId = "R2", RuleVersion = "fixture", ActionType = "REPLAN_TASKS", TaskIds = [Guid.NewGuid()],
        EvidenceFingerprint = Hash, Explanation = "explanation", Disposition = disposition,
        DisposedAt = explanation.CompletedAt, ResultingCommandResultId = resultId
    };

    private static ActionConfirmation Confirmation(Guid userId, Guid sessionId, Guid? recommendationId,
        DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, ReconcileSessionId = sessionId,
        ReconcileRecommendationId = recommendationId, ActionType = "REPLAN_TASKS", PreviewHash = Hash,
        Status = ActionConfirmationStatuses.Resolved, CreatedAt = at.AddMinutes(-1), ExpiresAt = at.AddMinutes(14),
        ResolvedAt = at
    };
}
