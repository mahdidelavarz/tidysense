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
/// «سنجش محصول» (Discussion 027 §5, §10) against one fixed set of records: every figure is
/// reproduced with its numerator and denominator, internal accounts never enter a figure, small
/// denominators are reported as they are, and reasons come without identity.
/// </summary>
public sealed class ProductInsightsTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private const string InternalPhone = "+989120007801";
    private const string Surface = AiResponseFeedbackSurfaces.PlanningDraft;
    private static readonly DateTimeOffset From = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset To = new(2025, 2, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly string Hash = new('E', 64);

    private static DateTimeOffset Jan(int day, int hour = 8) => new(2025, 1, day, hour, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Every_figure_reproduces_its_numerator_and_denominator_without_internal_accounts()
    {
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Operations:InternalPhones:0"] = InternalPhone
            })));
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // A registered before the window; B and C in its first full week (cohort of Saturday 4 January);
        // the internal account in the same week; a fourth account after the window.
        var a = User("+989120007802", new DateTimeOffset(2024, 12, 1, 8, 0, 0, TimeSpan.Zero));
        var b = User("+989120007803", Jan(6));
        var c = User("+989120007804", Jan(7));
        var inside = User(InternalPhone, Jan(5));
        var later = User("+989120007805", new DateTimeOffset(2025, 3, 1, 8, 0, 0, TimeSpan.Zero));
        db.AddRange(a, b, c, inside, later);
        await db.SaveChangesAsync();
        await SeedPlanningAsync(db, a.Id, b.Id, inside.Id);
        await SeedExecutionAsync(db, a.Id, b.Id, c.Id, inside.Id);
        await SeedReconcileAsync(db, a.Id, b.Id, inside.Id);
        await SeedFeedbackAsync(db, a.Id, b.Id, c.Id, inside.Id);

        var service = scope.ServiceProvider.GetRequiredService<ProductInsightsService>();
        var result = await service.ComputeAsync(From, To, TestContext.Current.CancellationToken);
        Assert.Equal(ProductInsightCatalog.Version, result.CatalogVersion);
        Assert.Equal(ProductInsightCatalog.Figures.Select(x => x.Id), result.Figures.Select(x => x.Id));
        // Counted, never mixed in: the internal account registered by the end of the window.
        Assert.Equal(1, result.InternalAccountCount);

        // People.
        Expect(result, "P.ACCOUNTS", ("", 2, 3));
        Expect(result, "P.ACTIVATION", ("", 2, 3));
        // C created work in the last seven days; A only changed a consent, which is not activity.
        Expect(result, "P.WEEKLY_ACTIVE", ("", 1, 3));
        // The cohort is B and C: B active in weeks 0 and 1, C in week 3. A small denominator stays as it is.
        Expect(result, "P.COHORT_RETENTION", ("2025-01-04:0", 1, 2), ("2025-01-04:1", 1, 2), ("2025-01-04:2", 0, 2),
            ("2025-01-04:3", 1, 2), ("2025-01-04:4", 0, 2));

        // Planning: five flows by two accounts; the internal flow is in none of them.
        Expect(result, "P.FUNNEL_FLOWS", ("ACCEPTED", 3, 5), ("ALIVE_7D", 1, 5), ("APPLIED", 2, 5), ("DECIDED", 3, 5),
            ("DRAFT", 4, 5), ("STARTED", 5, 5));
        Expect(result, "P.FUNNEL_ACCOUNTS", ("ACCEPTED", 2, 2), ("ALIVE_7D", 1, 2), ("APPLIED", 2, 2), ("DECIDED", 2, 2),
            ("DRAFT", 2, 2), ("STARTED", 2, 2));
        // B's draft was applied before exclusions were recorded (version 1): left out, not counted as zero.
        Expect(result, "P.REMOVED_BEFORE_ACCEPTING", ("GOAL", 0, 1), ("PROJECT", 0, 0), ("ROUTINE", 2, 2), ("TASK", 1, 3));
        Expect(result, "P.REMOVED_BEFORE_ACCEPTING_ACCOUNTS", ("GOAL", 0, 1), ("PROJECT", 0, 1), ("ROUTINE", 1, 1),
            ("TASK", 1, 1));
        // B's question was asked and the flow abandoned: asked, neither answered nor skipped.
        Expect(result, "P.CLARIFICATION",
            ("CONTENT:ANSWERED", 1, 2), ("CONTENT:ASKED", 2, 4), ("CONTENT:OTHER", 1, 1), ("CONTENT:SKIPPED", 0, 2),
            ("TIMING:ANSWERED", 1, 2), ("TIMING:ASKED", 2, 4), ("TIMING:OTHER", 0, 1), ("TIMING:SKIPPED", 1, 2));
        // Each account counted once: A answered both kinds; B was asked CONTENT and answered nothing.
        Expect(result, "P.CLARIFICATION_ACCOUNTS", ("CONTENT", 1, 2), ("TIMING", 1, 1));
        Expect(result, "P.ACCEPTANCE_BY_ANSWERS", ("WITH_ANSWERS", 1, 1), ("WITHOUT_ANSWERS", 1, 3));
        Expect(result, "P.ACCEPTANCE_BY_ANSWERS_ACCOUNTS", ("WITH_ANSWERS", 1, 1), ("WITHOUT_ANSWERS", 1, 2));

        // Execution.
        Expect(result, "P.TASKS_DONE_7D", ("AI", 3, 4), ("MANUAL", 1, 3));
        Expect(result, "P.TASKS_DONE_7D_ACCOUNTS", ("", 1, 2));
        Expect(result, "P.ROUTINE_SLOTS_DONE", ("AI", 1, 2), ("MANUAL", 1, 1));
        // No account has Routines of both origins: zero over zero, not a rate.
        Expect(result, "P.ROUTINE_SLOTS_DONE_ACCOUNTS", ("", 0, 0));
        // An undone Carry and a Carry made while not due are not Carries of due work.
        Expect(result, "P.TASKS_CARRIED_OVER_TWICE", ("AI", 1, 4), ("MANUAL", 0, 3));
        Expect(result, "P.TASKS_CARRIED_OVER_TWICE_ACCOUNTS", ("AI", 1, 3), ("MANUAL", 0, 2));

        // Reconcile.
        Expect(result, "P.RECONCILE_SESSIONS", ("", 3, 2));
        Expect(result, "P.RECONCILE_DECISIONS_PER_SESSION", ("", 6, 3));
        Expect(result, "P.RECONCILE_DECISION_MIX", ("DONE", 2, 6), ("DROP", 1, 6), ("KEEP", 1, 6), ("MOVED", 1, 6),
            ("TODAY", 1, 6));
        Expect(result, "P.RECONCILE_DECISION_MIX_ACCOUNTS", ("DONE", 2, 2), ("DROP", 1, 2), ("KEEP", 1, 2), ("MOVED", 1, 2),
            ("TODAY", 1, 2));
        Expect(result, "P.RECONCILE_REVERTED", ("", 1, 6));
        Expect(result, "P.RECONCILE_REVERTED_ACCOUNTS", ("", 1, 2));

        // Satisfaction: closing and not answering are non-responses, never ratings.
        Expect(result, "P.SATISFACTION_PROMPTS", ($"{Surface}:ANSWERED", 4, 6), ($"{Surface}:CLOSED", 1, 6),
            ($"{Surface}:SHOWN", 1, 6));
        Expect(result, "P.SATISFACTION_RATING", ($"{Surface}:1", 1, 4), ($"{Surface}:2", 1, 4), ($"{Surface}:4", 1, 4),
            ($"{Surface}:5", 1, 4));
        Expect(result, "P.SATISFACTION_MEAN", (Surface, 12, 4));
        Expect(result, "P.SATISFIED_ACCOUNTS", ("", 1, 2));
        Expect(result, "P.LOW_RATING_REASONS", ("", 1, 2));

        // One reason: the internal one and the one outside the window are not shown; nothing names its writer.
        var reason = Assert.Single(result.Reasons);
        Assert.Equal(new LowRatingReasonDto(Surface, 2, new DateOnly(2025, 1, 20), "پیشنهادها خیلی کلی بود"), reason);
        var body = JsonSerializer.Serialize(result);
        foreach (var user in new[] { a, b, c, inside })
        {
            Assert.DoesNotContain(user.Id.ToString(), body);
            Assert.DoesNotContain(user.PhoneNumber, body);
        }

        // The same definitions over the same records give the same numbers.
        var again = await service.ComputeAsync(From, To, TestContext.Current.CancellationToken);
        Assert.Equal(JsonSerializer.Serialize(result.Figures), JsonSerializer.Serialize(again.Figures));

        // A window without records shows counts of zero or no row, never a rate.
        var empty = await service.ComputeAsync(From.AddYears(-5), To.AddYears(-5), TestContext.Current.CancellationToken);
        Expect(empty, "P.ACCOUNTS", ("", 0, 0));
        Expect(empty, "P.RECONCILE_DECISIONS_PER_SESSION", ("", 0, 0));
        Assert.Empty(empty.Figures.Single(x => x.Id == "P.FUNNEL_FLOWS").Rows);
        Assert.Empty(empty.Reasons);
        Assert.Equal(0, empty.InternalAccountCount);
    }

    [Fact]
    public void Every_figure_states_its_unit_numerator_denominator_window_and_missing_data()
    {
        Assert.Equal(ProductInsightCatalog.Figures.Count, ProductInsightCatalog.Figures.Select(x => x.Id).Distinct().Count());
        Assert.All(ProductInsightCatalog.Figures, x =>
        {
            Assert.StartsWith("P.", x.Id);
            Assert.True(x.DefinitionVersion > 0);
            Assert.All(new[] { x.UnitOfAnalysis, x.Numerator, x.Denominator, x.Window, x.MissingData, x.Segmentation },
                text => Assert.False(string.IsNullOrWhiteSpace(text)));
            // Every query is bounded by the window and keeps internal accounts out.
            Assert.Contains("@to", x.Sql);
            Assert.Contains("@excluded", x.Sql);
            Assert.Contains("@internal", x.Sql);
            // No figure reads user-written text or identifies an account.
            Assert.DoesNotContain("\"Title\"", x.Sql);
            Assert.DoesNotContain("\"PhoneNumber\"", x.Sql);
            Assert.DoesNotContain("SELECT \"UserId\" AS \"Segment\"", x.Sql);
        });
    }

    private static void Expect(OperationsInsightsDto result, string id,
        params (string Segment, long Numerator, long Denominator)[] rows)
    {
        var actual = result.Figures.Single(x => x.Id == id).Rows
            .Select(x => (x.Segment, x.Numerator, x.Denominator)).OrderBy(x => x.Segment, StringComparer.Ordinal);
        Assert.Equal(rows.OrderBy(x => x.Segment, StringComparer.Ordinal), actual);
    }

    private static async Task SeedPlanningAsync(AppDbContext db, Guid a, Guid b, Guid inside)
    {
        // F1 (A, 10 Jan): three questions, answered, then a draft; applied with exclusions; its Task stays.
        var asking = Attempt(a, Jan(10), Asking);
        var answered = Attempt(a, Jan(10, 9), x =>
        {
            x.PreviousAttemptId = asking.Id;
            x.ClarificationTurn = 1;
            x.AnswersJson = "[]";
            Drafted(x);
        });
        db.Add(asking);
        await db.SaveChangesAsync();
        var d1 = Draft(answered);
        db.AddRange(answered, d1,
            Event(a, "PlanningAttempt", asking.Id, "PLANNING_CLARIFICATION_ASKED", Jan(10), JsonSerializer.Serialize(new
            {
                flowId = asking.Id, turn = 1,
                questions = new[] { Asked("TIMING"), Asked("CONTENT"), Asked("TIMING") }
            })),
            Event(a, "PlanningAttempt", answered.Id, "PLANNING_CLARIFICATION_ANSWERED", Jan(10, 9), JsonSerializer.Serialize(new
            {
                flowId = asking.Id, turn = 1, draftNow = false,
                answers = new object[]
                {
                    new { kind = "TIMING", chosen = new[] { 1 }, other = false },
                    new { kind = "CONTENT", chosen = Array.Empty<int>(), other = true },
                    new { kind = "TIMING", chosen = Array.Empty<int>(), other = false }
                }
            })),
            Created(a, d1, asking.Id, Jan(10, 9)));
        await db.SaveChangesAsync();
        var first = await ApplyAsync(db, a, d1, Jan(10, 10), new
        {
            goalCount = 1, projectCount = 0, taskCount = 2, routineCount = 0, factCount = 0,
            excludedGoalCount = 0, excludedProjectCount = 0, excludedTaskCount = 1, excludedRoutineCount = 2
        });
        db.Add(Event(a, "Task", Guid.NewGuid(), "TASK_CREATED", Jan(10, 10), NewTask, confirmationId: first));

        // F2 (A, 12 Jan): a draft cancelled by the user.
        var f2 = Attempt(a, Jan(12), Drafted);
        var d2 = Draft(f2);
        db.AddRange(f2, d2, Created(a, d2, f2.Id, Jan(12)),
            Event(a, "PlanningDraft", d2.Id, "PLANNING_DRAFT_CANCELLED", Jan(12, 9), "{\"reason\":\"USER\"}"));

        // F3 (B, 6 Jan): applied before exclusions were recorded; its Task dropped two days later.
        var f3 = Attempt(b, Jan(6), Drafted);
        var d3 = Draft(f3);
        db.AddRange(f3, d3, Created(b, d3, f3.Id, Jan(6)));
        await db.SaveChangesAsync();
        var third = await ApplyAsync(db, b, d3, Jan(6, 9), new
        {
            goalCount = 0, projectCount = 0, taskCount = 1, routineCount = 0, factCount = 0
        }, version: 1);
        var dropped = Guid.NewGuid();
        db.AddRange(Event(b, "Task", dropped, "TASK_CREATED", Jan(6, 9), NewTask, confirmationId: third),
            Event(b, "Task", dropped, "TASK_DROPPED", Jan(8), "{}"));

        // F4 (B, 8 Jan): a question, then nothing. F5 (B, 9 Jan): a draft whose apply was submitted and never landed.
        var f4 = Attempt(b, Jan(8), Asking);
        var f5 = Attempt(b, Jan(9), Drafted);
        var d5 = Draft(f5);
        db.AddRange(f4, f5, d5, Created(b, d5, f5.Id, Jan(9)),
            Event(b, "PlanningAttempt", f4.Id, "PLANNING_CLARIFICATION_ASKED", Jan(8), JsonSerializer.Serialize(new
            {
                flowId = f4.Id, turn = 1, questions = new[] { Asked("CONTENT") }
            })));
        await db.SaveChangesAsync();
        db.Add(Confirmation(b, d5, ActionConfirmationStatuses.Submitted, Jan(9, 9)));

        // The internal account: a question and an applied draft that appear in no figure.
        var fi = Attempt(inside, Jan(10), Drafted);
        var di = Draft(fi);
        db.AddRange(fi, di, Created(inside, di, fi.Id, Jan(10)),
            Event(inside, "PlanningAttempt", fi.Id, "PLANNING_CLARIFICATION_ASKED", Jan(10), JsonSerializer.Serialize(new
            {
                flowId = fi.Id, turn = 1, questions = new[] { Asked("TIMING") }
            })));
        await db.SaveChangesAsync();
        await ApplyAsync(db, inside, di, Jan(10, 9), new
        {
            goalCount = 0, projectCount = 0, taskCount = 1, routineCount = 0, factCount = 0,
            excludedGoalCount = 3, excludedProjectCount = 0, excludedTaskCount = 0, excludedRoutineCount = 0
        });
        db.ChangeTracker.Clear();

        static object Asked(string kind) => new { kind, optionCount = 2, multiple = false };
    }

    private static async Task SeedExecutionAsync(AppDbContext db, Guid a, Guid b, Guid c, Guid inside)
    {
        // A: two AI Tasks (one done in three days) and two manual ones (one done in a day, one after ten).
        var aiDone = Task(a, true, Jan(5), 3);
        var aiCarried = Task(a, true, Jan(5), null);
        var manualLate = Task(a, false, Jan(5), 10);
        var manualDone = Task(a, false, Jan(5), 1);
        // B: one AI Task done. C: one AI done, one manual open, so C did better with AI work.
        db.AddRange(aiDone, aiCarried, manualLate, manualDone, Task(b, true, Jan(6), 2), Task(c, true, Jan(8), 1),
            Task(c, false, Jan(8), null), Task(inside, true, Jan(8), 1));

        // The AI Task was carried three times while due; the manual one three times, one taken back and one not due.
        db.AddRange(Enumerable.Range(0, 3).Select(i => Carry(a, aiCarried.Id, Jan(6 + i), wasDue: true)));
        var undone = Carry(a, manualLate.Id, Jan(6), wasDue: true);
        db.AddRange(undone, Carry(a, manualLate.Id, Jan(7), wasDue: true), Carry(a, manualLate.Id, Jan(8), wasDue: false));
        var undo = Event(a, "Task", manualLate.Id, "TASK_CARRY_UNDONE", Jan(6, 9), "{}");
        undo.CausationId = undone.EventId;
        db.Add(undo);

        // C's activity in the last week of the window (cohort week 3); A only changed a consent then.
        db.AddRange(Event(c, "Task", Guid.NewGuid(), "TASK_CREATED", Jan(28), NewTask),
            Event(a, "User", a, "AI_CONSENT_CHANGED", Jan(26),
                "{\"granted\":true,\"provider\":\"fixture\",\"noticeVersion\":\"1\"}"));

        // Routines: A's AI Routine done once and missed once (a pending slot and one after the window do not
        // count); C's manual Routine done once; the internal one done.
        var aiRoutine = Routine(a, true);
        var manualRoutine = Routine(c, false);
        var internalRoutine = Routine(inside, false);
        db.AddRange(aiRoutine, manualRoutine, internalRoutine,
            Occurrence(aiRoutine, new DateOnly(2025, 1, 10), OccurrenceStatuses.Done),
            Occurrence(aiRoutine, new DateOnly(2025, 1, 11), OccurrenceStatuses.Missed),
            Occurrence(aiRoutine, new DateOnly(2025, 1, 12), OccurrenceStatuses.Pending),
            Occurrence(aiRoutine, new DateOnly(2025, 2, 3), OccurrenceStatuses.Done),
            Occurrence(manualRoutine, new DateOnly(2025, 1, 20), OccurrenceStatuses.Done),
            Occurrence(internalRoutine, new DateOnly(2025, 1, 20), OccurrenceStatuses.Done));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task SeedReconcileAsync(AppDbContext db, Guid a, Guid b, Guid inside)
    {
        var s1 = Session(a, Jan(15));
        var s2 = Session(a, Jan(16));
        var s3 = Session(b, Jan(15));
        var si = Session(inside, Jan(15));
        db.AddRange(s1, s2, s3, si);
        await db.SaveChangesAsync();

        // S1: done, «امروز» on tap, moved through the preview; the completion taken back.
        var today = Decision(a, s1, "TASK_CARRIED", "{\"scope\":\"TASK\",\"wasDue\":false}");
        db.AddRange(Decision(a, s1, "TASK_COMPLETED"), today, Decision(a, s1, "TASK_CARRIED", "{\"scope\":\"TASK\",\"wasDue\":false}"),
            Decision(a, s1, "TASK_COMPLETION_UNDONE"),
            new ReconcileQuickAction
            {
                Id = Guid.NewGuid(), UserId = a, SessionId = s1.Id, TaskId = today.AggregateId,
                ActionType = ReconcileQuickActionTypes.CarryToToday, ResultingVersion = 2,
                PreviousPlannedDate = new DateOnly(2025, 1, 12),
                AppliedEventId = today.EventId, CreatedAt = s1.OpenedAt
            },
            // S2: kept. S3: dropped and done. The internal session: done.
            Decision(a, s2, "TASK_REVIEW_KEPT", "{\"reasonCodes\":[\"EXECUTION_OVERDUE\"]}"), Decision(b, s3, "TASK_DROPPED"), Decision(b, s3, "TASK_COMPLETED"),
            Decision(inside, si, "TASK_COMPLETED"));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task SeedFeedbackAsync(AppDbContext db, Guid a, Guid b, Guid c, Guid inside)
    {
        db.AddRange(
            Prompt(a, Jan(18), AiResponseFeedbackOutcomes.Answered, 5, null),
            Prompt(a, Jan(19), AiResponseFeedbackOutcomes.Answered, 4, null),
            Prompt(b, Jan(20), AiResponseFeedbackOutcomes.Answered, 2, "پیشنهادها خیلی کلی بود"),
            Prompt(b, Jan(21), AiResponseFeedbackOutcomes.Answered, 1, null),
            Prompt(b, Jan(22), AiResponseFeedbackOutcomes.Closed, null, null),
            Prompt(c, Jan(23), AiResponseFeedbackOutcomes.Shown, null, null),
            Prompt(inside, Jan(20), AiResponseFeedbackOutcomes.Answered, 1, "داخلی"),
            Prompt(a, To.AddDays(3), AiResponseFeedbackOutcomes.Answered, 1, "بیرون از بازه"));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task<Guid> ApplyAsync(AppDbContext db, Guid userId, PlanningDraft draft, DateTimeOffset at,
        object payload, int version = 2)
    {
        var confirmation = Confirmation(userId, draft, ActionConfirmationStatuses.Resolved, at);
        var result = new CommandResult
        {
            Id = Guid.NewGuid(), UserId = userId, IdempotencyRecordId = Guid.NewGuid(),
            CommandType = "APPLY_PLANNING_DRAFT", Status = "SUCCEEDED", CreatedAt = at
        };
        db.AddRange(confirmation, result);
        await db.SaveChangesAsync();
        var applied = Event(userId, "PlanningDraft", draft.Id, "PLANNING_DRAFT_APPLIED", at,
            JsonSerializer.Serialize(payload), confirmationId: confirmation.Id, resultId: result.Id);
        applied.EventVersion = version;
        db.Add(applied);
        await db.SaveChangesAsync();
        return confirmation.Id;
    }

    private static ActionConfirmation Confirmation(Guid userId, PlanningDraft draft, string status, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, PlanningDraftId = draft.Id, PlanningDraftRevision = 1,
        ActionType = "APPLY_PLANNING_DRAFT", PreviewHash = Hash, Status = status, CreatedAt = at.AddMinutes(-1),
        ExpiresAt = at.AddMinutes(14), ResolvedAt = status == ActionConfirmationStatuses.Resolved ? at : null
    };

    private const string NewTask = "{\"source\":\"AI_ASSISTED\",\"parentScope\":\"STANDALONE\",\"hasPlannedDate\":true,\"inSequence\":false}";

    private static DomainEvent Created(Guid userId, PlanningDraft draft, Guid flowId, DateTimeOffset at)
    {
        var created = Event(userId, "PlanningDraft", draft.Id, "PLANNING_DRAFT_CREATED", at, JsonSerializer.Serialize(new
        {
            generator = "fixture", contextScope = "NONE", proposalCount = 1, factCount = 0, flowId, clarificationTurns = 0
        }));
        created.EventVersion = 2;
        return created;
    }

    private static User User(string phone, DateTimeOffset created) => new()
    {
        Id = Guid.NewGuid(), PhoneNumber = phone, IsActive = true, SetupComplete = true, CreatedAt = created
    };

    private static PlanningAttempt Attempt(Guid userId, DateTimeOffset created, Action<PlanningAttempt> set)
    {
        var attempt = new PlanningAttempt
        {
            Id = Guid.NewGuid(), UserId = userId, ClientAttemptId = Guid.NewGuid().ToString("N"), RequestHash = Hash,
            Status = PlanningAttemptStatuses.Succeeded, Intention = "fixture", GeneratorKey = "fixture",
            ContextBuilderVersion = "fixture", ContextFingerprint = Hash, CreatedAt = created,
            UpdatedAt = created.AddSeconds(30), CompletedAt = created.AddSeconds(30)
        };
        set(attempt);
        return attempt;
    }

    private static void Asking(PlanningAttempt attempt)
    {
        attempt.Outcome = PlanningOutcomes.Clarification;
        attempt.ClarificationJson = "{\"questions\":[{\"id\":\"q1\",\"text\":\"?\"}]}";
    }

    private static void Drafted(PlanningAttempt attempt)
    {
        attempt.Outcome = PlanningOutcomes.Draft;
        attempt.DraftId = Guid.NewGuid();
    }

    private static PlanningDraft Draft(PlanningAttempt attempt) => new()
    {
        Id = attempt.DraftId!.Value, UserId = attempt.UserId, AttemptId = attempt.Id,
        Status = PlanningDraftStatuses.Expired, CurrentRevision = 1, SchemaVersion = "fixture",
        ContextFingerprint = Hash, CreatedAt = attempt.CompletedAt!.Value, UpdatedAt = attempt.CompletedAt.Value,
        ExpiresAt = attempt.CompletedAt.Value.AddDays(1),
        Revisions =
        [
            new PlanningDraftRevision
            {
                Id = Guid.NewGuid(), Revision = 1, CreatedAt = attempt.CompletedAt.Value,
                Origin = PlanningRevisionOrigins.Generated
            }
        ]
    };

    private static TaskItem Task(Guid userId, bool ai, DateTimeOffset created, int? doneAfterDays) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Title = "fixture", CreatedAt = created, UpdatedAt = created,
        PlannedDate = DateOnly.FromDateTime(created.UtcDateTime),
        Source = ai ? CreationSources.AiAssisted : CreationSources.Manual,
        Status = doneAfterDays is null ? TaskStatuses.Active : TaskStatuses.Completed,
        TerminalAt = doneAfterDays is { } days ? created.AddDays(days) : null,
        CompletedForLocalDate = doneAfterDays is { } after ? DateOnly.FromDateTime(created.AddDays(after).UtcDateTime) : null
    };

    private static DomainEvent Carry(Guid userId, Guid taskId, DateTimeOffset at, bool wasDue) =>
        Event(userId, "Task", taskId, "TASK_CARRIED", at, JsonSerializer.Serialize(new { scope = "TASK", wasDue }));

    private static Routine Routine(Guid userId, bool ai) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Title = "fixture", RecurrenceDefinition = "{\"type\":\"DAILY\"}",
        RecurrenceTimezone = "Asia/Tehran", EffectiveFromLocalDate = new DateOnly(2025, 1, 1),
        CreatedAt = Jan(1), UpdatedAt = Jan(1), Source = ai ? CreationSources.AiAssisted : CreationSources.Manual
    };

    private static RoutineOccurrence Occurrence(Routine routine, DateOnly date, string status) => new()
    {
        Id = Guid.NewGuid(), RoutineId = routine.Id, ScheduledLocalDate = date, Status = status,
        ResolvedAt = status == OccurrenceStatuses.Pending ? null : Jan(28), CreatedAt = Jan(1), UpdatedAt = Jan(1)
    };

    private static ReconcileSession Session(Guid userId, DateTimeOffset opened) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Status = ReconcileSessionStatuses.Completed, Severity = "LIGHT",
        RulesCatalogVersion = "fixture", Timezone = "Asia/Tehran", LocalDate = DateOnly.FromDateTime(opened.UtcDateTime),
        OpenedAt = opened, CompletedAt = opened.AddMinutes(10)
    };

    private static DomainEvent Decision(Guid userId, ReconcileSession session, string type, string payload = "{}") =>
        Event(userId, "Task", Guid.NewGuid(), type, session.OpenedAt.AddMinutes(2), payload, sessionId: session.Id);

    private static AiResponseFeedback Prompt(Guid userId, DateTimeOffset shown, string outcome, int? rating,
        string? reason) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Surface = Surface, SubjectId = Guid.NewGuid(),
        InstrumentVersion = AiResponseFeedbackInstrument.Version, Outcome = outcome, Rating = rating, Reason = reason,
        ShownOn = DateOnly.FromDateTime(shown.UtcDateTime), ShownAt = shown,
        RespondedAt = outcome == AiResponseFeedbackOutcomes.Shown ? null : shown.AddMinutes(1)
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
}
