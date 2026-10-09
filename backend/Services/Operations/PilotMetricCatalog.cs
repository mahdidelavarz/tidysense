namespace TidySense.Services.Operations;

/// <summary>
/// One H1/H2 metric. Its query is the definition: it returns rows of
/// <c>("Segment", "Numerator", "Denominator")</c> for the window <c>[@from, @to)</c> and one
/// population (<c>@internal</c> false: accounts outside <c>@excluded</c>; true: only those).
/// </summary>
public sealed record PilotMetric(string Id, int DefinitionVersion, string Hypothesis, string MetricClass,
    string UnitOfAnalysis, string Numerator, string Denominator, string Window, string MissingData,
    string Segmentation, string Sql);

/// <summary>A required metric that needs a research instrument and is therefore never computed here.</summary>
public sealed record ExternalPilotMetric(string Id, string Hypothesis, string Instrument);

/// <summary>
/// The pilot metric dictionary (Discussion 021). Definitions are versioned: changing a query
/// changes its <c>DefinitionVersion</c> and the catalog version. No threshold lives here.
/// Exclusion for every metric: accounts listed as operators or internal are reported apart.
/// Rows of R2/R3 records exist only inside their retention window; a window older than that
/// reports fewer rows, never invented ones.
/// </summary>
public static class PilotMetricCatalog
{
    public const string Version = "2026-10-08.2";

    public const string Behavioral = "BEHAVIORAL";
    public const string Operational = "OPERATIONAL";

    private const string NoSegment = "none";
    private const string Severity = "severity band stored when the session opened";
    private const string ZeroRows = "No matching record yields 0 / 0 or no row; a rate is never shown without its denominator.";
    private const string FlowWindow = "Flows whose first attempt was created in the window.";
    private const string SessionWindow = "Sessions opened in the window.";

    // A flow is the attempt the user started plus every attempt that answered its questions.
    private const string Flows = """
        WITH RECURSIVE chain AS (
            SELECT a."Id" AS "Root", a."Id", a."CreatedAt" AS "Started"
            FROM "PlanningAttempts" a
            WHERE a."PreviousAttemptId" IS NULL AND a."CreatedAt" >= @from AND a."CreatedAt" < @to
              AND ((a."UserId" = ANY(@excluded)) = @internal)
            UNION ALL
            SELECT c."Root", n."Id", c."Started"
            FROM "PlanningAttempts" n JOIN chain c ON n."PreviousAttemptId" = c."Id"
        ), flows AS (
            SELECT c."Root", c."Started",
                   MIN(a."CompletedAt") FILTER (WHERE a."Outcome" = 'DRAFT') AS "DraftedAt",
                   (ARRAY_AGG(a."DraftId") FILTER (WHERE a."DraftId" IS NOT NULL))[1] AS "DraftId",
                   (ARRAY_AGG(CASE WHEN a."Status" = 'FAILED' THEN 'FAILED:' || a."FailureCode"
                                   WHEN a."Status" = 'SUCCEEDED' THEN a."Outcome"
                                   WHEN a."Status" = 'CANCELLED' THEN 'CANCELLED'
                                   ELSE 'IN_FLIGHT' END
                              ORDER BY a."CreatedAt" DESC, a."Id" DESC))[1] AS "LastState"
            FROM chain c JOIN "PlanningAttempts" a ON a."Id" = c."Id"
            GROUP BY c."Root", c."Started"
        ), drafts AS (
            SELECT f."DraftId", d."Status", applied."OccurredAt" AS "AppliedAt",
                   applied."ConfirmationId", applied."PayloadJson" AS "Applied",
                   result."Status" AS "ResultStatus", cancelled."PayloadJson"->>'reason' AS "CancelReason"
            FROM flows f
            LEFT JOIN "PlanningDrafts" d ON d."Id" = f."DraftId"
            LEFT JOIN "DomainEvents" applied ON applied."AggregateType" = 'PlanningDraft'
                AND applied."AggregateId" = f."DraftId" AND applied."EventType" = 'PLANNING_DRAFT_APPLIED'
            LEFT JOIN "CommandResults" result ON result."Id" = applied."CommandResultId"
            LEFT JOIN "DomainEvents" cancelled ON cancelled."AggregateType" = 'PlanningDraft'
                AND cancelled."AggregateId" = f."DraftId" AND cancelled."EventType" = 'PLANNING_DRAFT_CANCELLED'
            WHERE f."DraftId" IS NOT NULL
        )

        """;

    private const string Sessions = """
        WITH sessions AS (
            SELECT s."Id", s."UserId", s."Status", s."Severity", s."ActionableBacklogCount",
                   EXISTS (SELECT 1 FROM "RuleMatches" m WHERE m."SessionId" = s."Id") AS "Eligible"
            FROM "ReconcileSessions" s
            WHERE s."OpenedAt" >= @from AND s."OpenedAt" < @to AND ((s."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    public static readonly IReadOnlyList<PilotMetric> Metrics =
    [
        new("H1.FLOWS_STARTED", 1, "H1", Behavioral, "planning flow",
            "flows started", "distinct accounts that started one", FlowWindow, ZeroRows, NoSegment,
            Flows + """
            SELECT '' AS "Segment", COUNT(*)::bigint AS "Numerator",
                   (SELECT COUNT(DISTINCT a."UserId") FROM "PlanningAttempts" a JOIN flows f ON f."Root" = a."Id")::bigint AS "Denominator"
            FROM flows
            """),
        new("H1.REVIEWABLE_DRAFT", 1, "H1", Behavioral, "planning flow",
            "flows that reached a reviewable draft", "flows started", FlowWindow, ZeroRows, NoSegment,
            Flows + """
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "DraftId" IS NOT NULL)::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM flows
            """),
        new("H1.FLOW_OUTCOME", 1, "H1", Operational, "planning flow",
            "flows whose latest attempt ended in the segment", "flows started", FlowWindow, ZeroRows,
            "latest attempt: DRAFT, CLARIFICATION (questions left unanswered), INPUT_BLOCKED, FAILED:<code>, CANCELLED, IN_FLIGHT",
            Flows + """
            SELECT f."LastState" AS "Segment", COUNT(*)::bigint AS "Numerator",
                   (SELECT COUNT(*) FROM flows)::bigint AS "Denominator"
            FROM flows f GROUP BY f."LastState" ORDER BY f."LastState"
            """),
        new("H1.TIME_TO_DRAFT_SECONDS", 1, "H1", Behavioral, "planning flow with a draft",
            "median seconds from the first attempt to the draft, the user's answering time included",
            "flows that reached a draft", FlowWindow, "No draft yields 0 over 0 flows.", NoSegment,
            Flows + """
            SELECT '' AS "Segment",
                   COALESCE(ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("DraftedAt" - "Started")))), 0)::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM flows WHERE "DraftId" IS NOT NULL
            """),
        new("H1.DRAFT_DISPOSITION", 1, "H1", Behavioral, "planning draft",
            "drafts with the disposition", "drafts created by the flows", FlowWindow,
            "A draft purged by retention without an apply or cancel event is RECORD_PURGED.",
            "APPLIED, CANCELLED_BY_USER, SUPERSEDED, EXPIRED_WITHOUT_DECISION, PENDING, RECORD_PURGED",
            Flows + """
            SELECT x."Segment", COUNT(*)::bigint AS "Numerator", (SELECT COUNT(*) FROM drafts)::bigint AS "Denominator"
            FROM (SELECT CASE WHEN "AppliedAt" IS NOT NULL THEN 'APPLIED'
                              WHEN "CancelReason" = 'USER' THEN 'CANCELLED_BY_USER'
                              WHEN "CancelReason" = 'SUPERSEDED' THEN 'SUPERSEDED'
                              WHEN "Status" = 'REVIEWABLE' THEN 'PENDING'
                              WHEN "Status" IS NULL THEN 'RECORD_PURGED'
                              ELSE 'EXPIRED_WITHOUT_DECISION' END AS "Segment" FROM drafts) x
            GROUP BY x."Segment" ORDER BY x."Segment"
            """),
        new("H1.ACCEPTANCE", 1, "H1", Behavioral, "planning draft",
            "applied drafts, by whether the confirmed revision was the generated one", "drafts created by the flows",
            FlowWindow, "An applied draft whose confirmation was purged is RECORD_PURGED.",
            "UNCHANGED (revision 1), EDITED (a later revision), RECORD_PURGED",
            Flows + """
            SELECT x."Segment", COUNT(*)::bigint AS "Numerator", (SELECT COUNT(*) FROM drafts)::bigint AS "Denominator"
            FROM (SELECT CASE WHEN c."Id" IS NULL THEN 'RECORD_PURGED'
                              WHEN c."PlanningDraftRevision" = 1 THEN 'UNCHANGED' ELSE 'EDITED' END AS "Segment"
                  FROM drafts d LEFT JOIN "ActionConfirmations" c ON c."Id" = d."ConfirmationId"
                  WHERE d."AppliedAt" IS NOT NULL) x
            GROUP BY x."Segment" ORDER BY x."Segment"
            """),
        new("H1.APPLIED_PLAN", 1, "H1", Behavioral, "planning flow",
            "flows whose draft was applied by a succeeded command", "flows started", FlowWindow, ZeroRows, NoSegment,
            Flows + """
            SELECT '' AS "Segment", (SELECT COUNT(*) FROM drafts WHERE "ResultStatus" = 'SUCCEEDED')::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM flows
            """),
        new("H1.APPLY_SUBMISSIONS", 1, "H1", Operational, "apply command",
            "apply commands with the result", "apply commands recorded", "Commands recorded in the window.", ZeroRows,
            "command result status: SUCCEEDED, CONFLICTED, FAILED_FINAL, FAILED_RETRYABLE",
            """
            SELECT r."Status" AS "Segment", COUNT(*)::bigint AS "Numerator", (SUM(COUNT(*)) OVER ())::bigint AS "Denominator"
            FROM "CommandResults" r
            WHERE r."CommandType" = 'APPLY_PLANNING_DRAFT' AND r."CreatedAt" >= @from AND r."CreatedAt" < @to
              AND ((r."UserId" = ANY(@excluded)) = @internal)
            GROUP BY r."Status" ORDER BY r."Status"
            """),
        new("H1.NON_TRIVIAL_PLAN", 1, "H1", Behavioral, "applied planning draft",
            "applied drafts that created at least two entities, at least one of them a Task or a Routine (classifier v0)",
            "applied drafts", FlowWindow, ZeroRows, NoSegment,
            Flows + """
            SELECT '' AS "Segment",
                   COUNT(*) FILTER (WHERE ("Applied"->>'goalCount')::int + ("Applied"->>'projectCount')::int
                           + ("Applied"->>'taskCount')::int + ("Applied"->>'routineCount')::int >= 2
                       AND ("Applied"->>'taskCount')::int + ("Applied"->>'routineCount')::int >= 1)::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM drafts WHERE "AppliedAt" IS NOT NULL
            """),
        new("H1.REVERSAL_7D", 1, "H1", Behavioral, "applied planning draft",
            "applied drafts with a created entity dropped, abandoned or stopped inside seven days (UNCLASSIFIED_REVERSAL: no attribution is recorded)",
            "applied drafts whose seven days have passed", FlowWindow,
            "A draft applied less than seven days ago is not yet counted.", NoSegment,
            Flows + """
            SELECT '' AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (
                       SELECT 1 FROM "DomainEvents" made
                       JOIN "DomainEvents" undone ON undone."AggregateType" = made."AggregateType"
                           AND undone."AggregateId" = made."AggregateId"
                       WHERE made."ConfirmationId" = d."ConfirmationId"
                         AND made."EventType" IN ('GOAL_CREATED', 'PROJECT_CREATED', 'TASK_CREATED', 'ROUTINE_CREATED')
                         AND undone."EventType" IN ('GOAL_ABANDONED', 'PROJECT_STOPPED', 'TASK_DROPPED', 'ROUTINE_STOPPED')
                         AND undone."OccurredAt" < d."AppliedAt" + INTERVAL '7 days'))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM drafts d WHERE d."AppliedAt" IS NOT NULL AND d."AppliedAt" + INTERVAL '7 days' <= @now
            """),

        new("H2.ELIGIBLE_START_RATE", 1, "H2", Behavioral, "account and local date on which Reconcile was eligible when the account looked",
            "such days on which the account opened a session", "such days",
            "Days first seen eligible in the window.",
            "A day on which the account never loaded the application is not an exposure and is not counted.",
            "severity band at the first eligible look of the day",
            """
            SELECT e."Severity" AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ReconcileSessions" s
                       WHERE s."UserId" = e."UserId" AND s."LocalDate" = e."LocalDate"))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM "ReconcileExposures" e
            WHERE e."FirstSeenAt" >= @from AND e."FirstSeenAt" < @to AND ((e."UserId" = ANY(@excluded)) = @internal)
            GROUP BY e."Severity" ORDER BY e."Severity"
            """),
        new("H2.SESSIONS_OPENED", 1, "H2", Behavioral, "Reconcile session",
            "sessions opened", "distinct accounts that opened one", SessionWindow, ZeroRows, Severity,
            Sessions + """
            SELECT "Severity" AS "Segment", COUNT(*)::bigint AS "Numerator", COUNT(DISTINCT "UserId")::bigint AS "Denominator"
            FROM sessions GROUP BY "Severity" ORDER BY "Severity"
            """),
        new("H2.DETERMINISTIC_AVAILABILITY", 1, "H2", Operational, "open-session command",
            "open commands that returned a session (opened, or the one already open)", "open commands recorded",
            "Commands recorded in the window.", ZeroRows, NoSegment,
            """
            SELECT '' AS "Segment",
                   COUNT(*) FILTER (WHERE r."Status" = 'SUCCEEDED' OR r."ErrorCode" = 'RECONCILE_SESSION_ALREADY_OPEN')::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM "CommandResults" r
            WHERE r."CommandType" = 'OPEN_RECONCILE_SESSION' AND r."CreatedAt" >= @from AND r."CreatedAt" < @to
              AND ((r."UserId" = ANY(@excluded)) = @internal)
            """),
        new("H2.ELIGIBLE_SESSIONS", 1, "H2", Behavioral, "Reconcile session",
            "sessions with at least one rule match", "sessions opened", SessionWindow, ZeroRows, Severity,
            Sessions + """
            SELECT "Severity" AS "Segment", COUNT(*) FILTER (WHERE "Eligible")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM sessions GROUP BY "Severity" ORDER BY "Severity"
            """),
        new("H2.EXPLANATION_REQUESTED", 1, "H2", Behavioral, "eligible Reconcile session",
            "eligible sessions in which an explanation was requested", "eligible sessions", SessionWindow, ZeroRows,
            Severity,
            Sessions + """
            SELECT s."Severity" AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ReconcileExplanations" e WHERE e."SessionId" = s."Id"))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM sessions s WHERE s."Eligible" GROUP BY s."Severity" ORDER BY s."Severity"
            """),
        new("H2.EXPLANATION_AVAILABLE", 1, "H2", Operational, "eligible Reconcile session that asked",
            "sessions that received a ready explanation", "eligible sessions in which one was requested",
            SessionWindow, ZeroRows, Severity,
            Sessions + """
            SELECT s."Severity" AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ReconcileExplanations" e
                       WHERE e."SessionId" = s."Id" AND e."Status" = 'READY'))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM sessions s
            WHERE s."Eligible" AND EXISTS (SELECT 1 FROM "ReconcileExplanations" e WHERE e."SessionId" = s."Id")
            GROUP BY s."Severity" ORDER BY s."Severity"
            """),
        new("H2.EXPLANATION_OUTCOME", 1, "H2", Operational, "explanation request",
            "explanations that ended in the segment", "explanations requested in the sessions", SessionWindow, ZeroRows,
            "READY, RUNNING, CANCELLED, FAILED:<code>",
            Sessions + """
            SELECT x."Segment", COUNT(*)::bigint AS "Numerator", (SUM(COUNT(*)) OVER ())::bigint AS "Denominator"
            FROM (SELECT CASE WHEN e."Status" = 'FAILED' THEN 'FAILED:' || e."FailureCode" ELSE e."Status" END AS "Segment"
                  FROM "ReconcileExplanations" e JOIN sessions s ON s."Id" = e."SessionId") x
            GROUP BY x."Segment" ORDER BY x."Segment"
            """),
        new("H2.RECOMMENDATION_DISPOSITION", 1, "H2", Behavioral, "recommendation",
            "recommendations with the disposition", "recommendations presented in the sessions", SessionWindow, ZeroRows,
            "PENDING, ACCEPTED (unchanged), ACCEPTED_EDITED, REJECTED, CANCELLED, EXPIRED_WITHOUT_DECISION",
            Sessions + """
            SELECT r."Disposition" AS "Segment", COUNT(*)::bigint AS "Numerator", (SUM(COUNT(*)) OVER ())::bigint AS "Denominator"
            FROM "ReconcileRecommendations" r
            JOIN "ReconcileExplanations" e ON e."Id" = r."ExplanationId" JOIN sessions s ON s."Id" = e."SessionId"
            GROUP BY r."Disposition" ORDER BY r."Disposition"
            """),
        new("H2.RECOMMENDATION_APPLICATION", 1, "H2", Behavioral, "accepted recommendation",
            "accepted recommendations by the result of the command submitted from them", "accepted recommendations",
            SessionWindow, "Acceptance without a linked command result is ACCEPTED_NO_RESULT; it is never counted as applied.",
            "APPLIED, ACCEPTED_CONFLICTED, ACCEPTED_FAILED, ACCEPTED_NO_RESULT",
            Sessions + """
            SELECT x."Segment", COUNT(*)::bigint AS "Numerator", (SUM(COUNT(*)) OVER ())::bigint AS "Denominator"
            FROM (SELECT CASE WHEN c."Status" IS NULL THEN 'ACCEPTED_NO_RESULT'
                              WHEN c."Status" = 'SUCCEEDED' THEN 'APPLIED'
                              WHEN c."Status" = 'CONFLICTED' THEN 'ACCEPTED_CONFLICTED'
                              ELSE 'ACCEPTED_FAILED' END AS "Segment"
                  FROM "ReconcileRecommendations" r
                  JOIN "ReconcileExplanations" e ON e."Id" = r."ExplanationId" JOIN sessions s ON s."Id" = e."SessionId"
                  LEFT JOIN "CommandResults" c ON c."Id" = r."ResultingCommandResultId"
                  WHERE r."Disposition" IN ('ACCEPTED', 'ACCEPTED_EDITED')) x
            GROUP BY x."Segment" ORDER BY x."Segment"
            """),
        new("H2.MANUAL_ESCAPE", 1, "H2", Behavioral, "Reconcile session whose explanation failed",
            "such sessions in which a confirmation without a recommendation was applied",
            "sessions with a failed explanation and no ready one", SessionWindow, ZeroRows, Severity,
            Sessions + """
            SELECT s."Severity" AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ActionConfirmations" c
                       WHERE c."ReconcileSessionId" = s."Id" AND c."ReconcileRecommendationId" IS NULL
                         AND c."Status" = 'RESOLVED'))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM sessions s
            WHERE EXISTS (SELECT 1 FROM "ReconcileExplanations" e WHERE e."SessionId" = s."Id" AND e."Status" = 'FAILED')
              AND NOT EXISTS (SELECT 1 FROM "ReconcileExplanations" e WHERE e."SessionId" = s."Id" AND e."Status" = 'READY')
            GROUP BY s."Severity" ORDER BY s."Severity"
            """),
        new("H2.UNRESOLVED_WORK_REDUCTION", 1, "H2", Behavioral, "completed Reconcile session",
            "actionable items at opening minus actionable items at completion, summed", "actionable items at opening, summed",
            SessionWindow, "A session that was not completed by the user is not counted.", Severity,
            Sessions + """
            SELECT s."Severity" AS "Segment",
                   COALESCE(SUM(s."ActionableBacklogCount" - (done."PayloadJson"->>'actionableBacklogCount')::int), 0)::bigint AS "Numerator",
                   COALESCE(SUM(s."ActionableBacklogCount"), 0)::bigint AS "Denominator"
            FROM sessions s
            JOIN "DomainEvents" done ON done."ReconcileSessionId" = s."Id" AND done."EventType" = 'RECONCILE_SESSION_COMPLETED'
            WHERE s."Status" = 'COMPLETED'
            GROUP BY s."Severity" ORDER BY s."Severity"
            """),
        new("H2.DECISION_COMPRESSION", 1, "H2", Behavioral, "applied Reconcile confirmation",
            "Tasks changed or kept by applied confirmations", "applied confirmations (descriptive only; never a pass criterion)",
            SessionWindow, ZeroRows, NoSegment,
            Sessions + """
            SELECT '' AS "Segment", COALESCE(SUM((ev."PayloadJson"->>'affectedCount')::int), 0)::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM "DomainEvents" ev JOIN sessions s ON s."Id" = ev."ReconcileSessionId"
            WHERE ev."EventType" = 'RECONCILE_ACTION_CONFIRMED'
            """),
        new("H2.USER_CONTRIBUTION", 1, "H2", Behavioral, "Reconcile session",
            "sessions of the single most active account", "sessions opened", SessionWindow, ZeroRows, NoSegment,
            Sessions + """
            SELECT '' AS "Segment", COALESCE(MAX(x."Count"), 0)::bigint AS "Numerator", COALESCE(SUM(x."Count"), 0)::bigint AS "Denominator"
            FROM (SELECT COUNT(*) AS "Count" FROM sessions GROUP BY "UserId") x
            """)
    ];

    public static readonly IReadOnlyList<ExternalPilotMetric> External =
    [
        new("H1.USEFUL_FIRST_PLAN", "H1", "Locked usefulness question, joined to H1.APPLIED_PLAN, H1.NON_TRIVIAL_PLAN and the observation window."),
        new("H1.TRUST_BOUNDARY_COMPREHENSION", "H1", "Comprehension check cross-checked against moderated observation."),
        new("H1.REGRET_ATTRIBUTION", "H1", "User attribution of each H1.REVERSAL_7D reversal (regret, context changed, unclassified)."),
        new("H2.UNDERSTANDING_SCORE", "H2", "Post-session understanding question and moderated observation."),
        new("H2.REOPEN_OR_REGRET", "H2", "User attribution after an applied Reconcile action; no reversal reason is recorded.")
    ];
}
