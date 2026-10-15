namespace TidySense.Services.Operations;

/// <summary>
/// The «سنجش محصول» figures (Discussion 027 §5): whether the product is useful, from what it already
/// records. Like the pilot dictionary, each figure is a versioned SQL definition returning
/// <c>("Segment", "Numerator", "Denominator")</c> for the window <c>[@from, @to)</c> and one population;
/// changing a query changes its version and the catalog version. There are no thresholds, no
/// per-account rows and no user text: reason texts are read separately (027 §4, §5).
/// </summary>
public static class ProductInsightCatalog
{
    public const string Version = "2026-10-14.1";

    private const string Insight = "INSIGHT";
    private const string NoSegment = "none";
    private const string ZeroRows = "No matching record yields 0 / 0 or no row; a rate is never shown without its denominator.";

    // Accounts that existed at the end of the window, of the population.
    private const string Accounts = """
        WITH accounts AS (
            SELECT u."Id", u."CreatedAt" FROM "Users" u
            WHERE u."CreatedAt" < @to AND ((u."Id" = ANY(@excluded)) = @internal)
        ), active AS (
            -- Doing something: work, Reconcile or planning. Opening the application is not activity.
            SELECT e."UserId", e."OccurredAt" FROM "DomainEvents" e
            WHERE (e."Actor" = 'USER' AND e."EventType" NOT IN ('AI_CONSENT_CHANGED', 'RECONCILE_PROMPT_RESOLVED'))
               OR e."EventType" IN ('PLANNING_DRAFT_CREATED', 'PLANNING_CLARIFICATION_ASKED')
        )

        """;

    // Planning flows started in the window, each with its account, its draft and how far it went.
    private const string Funnel = """
        WITH RECURSIVE chain AS (
            SELECT a."Id" AS "Root", a."Id", a."UserId"
            FROM "PlanningAttempts" a
            WHERE a."PreviousAttemptId" IS NULL AND a."CreatedAt" >= @from AND a."CreatedAt" < @to
              AND ((a."UserId" = ANY(@excluded)) = @internal)
            UNION ALL
            SELECT c."Root", n."Id", c."UserId" FROM "PlanningAttempts" n JOIN chain c ON n."PreviousAttemptId" = c."Id"
        ), flows AS (
            SELECT c."Root", c."UserId", (ARRAY_AGG(a."DraftId") FILTER (WHERE a."DraftId" IS NOT NULL))[1] AS "DraftId"
            FROM chain c JOIN "PlanningAttempts" a ON a."Id" = c."Id"
            GROUP BY c."Root", c."UserId"
        ), stages AS (
            SELECT f."Root", f."UserId", f."DraftId" IS NOT NULL AS "Draft", ap."OccurredAt" AS "AppliedAt", ap."ConfirmationId",
                   EXISTS (SELECT 1 FROM "DomainEvents" x WHERE x."AggregateType" = 'PlanningDraft'
                       AND x."AggregateId" = f."DraftId" AND x."EventType" = 'PLANNING_DRAFT_CANCELLED') AS "Cancelled",
                   EXISTS (SELECT 1 FROM "ActionConfirmations" c WHERE c."PlanningDraftId" = f."DraftId"
                       AND c."Status" IN ('SUBMITTED', 'RESOLVED')) AS "Submitted"
            FROM flows f
            LEFT JOIN LATERAL (
                SELECT e."OccurredAt", e."ConfirmationId" FROM "DomainEvents" e
                JOIN "CommandResults" r ON r."Id" = e."CommandResultId"
                WHERE e."AggregateType" = 'PlanningDraft' AND e."AggregateId" = f."DraftId"
                  AND e."EventType" = 'PLANNING_DRAFT_APPLIED' AND r."Status" = 'SUCCEEDED'
                LIMIT 1) ap ON TRUE
        ), reached AS (
            SELECT s."UserId", v."Segment", v."Reached"
            FROM stages s CROSS JOIN LATERAL (VALUES
                ('STARTED', TRUE),
                ('DRAFT', s."Draft"),
                ('DECIDED', s."AppliedAt" IS NOT NULL OR s."Cancelled"),
                ('ACCEPTED', s."AppliedAt" IS NOT NULL OR s."Submitted"),
                ('APPLIED', s."AppliedAt" IS NOT NULL),
                ('ALIVE_7D', s."AppliedAt" IS NOT NULL AND s."AppliedAt" + INTERVAL '7 days' <= @now AND NOT EXISTS (
                    SELECT 1 FROM "DomainEvents" made
                    JOIN "DomainEvents" undone ON undone."AggregateType" = made."AggregateType" AND undone."AggregateId" = made."AggregateId"
                    WHERE made."ConfirmationId" = s."ConfirmationId"
                      AND made."EventType" IN ('GOAL_CREATED', 'PROJECT_CREATED', 'TASK_CREATED', 'ROUTINE_CREATED')
                      AND undone."EventType" IN ('GOAL_ABANDONED', 'PROJECT_STOPPED', 'TASK_DROPPED', 'ROUTINE_STOPPED')
                      AND undone."OccurredAt" < s."AppliedAt" + INTERVAL '7 days'))
            ) v("Segment", "Reached")
        )

        """;

    // Clarification measurement (028 §2.5): kinds and answer types only.
    private const string Questions = """
        WITH asked AS (
            SELECT e."UserId", q->>'kind' AS "Kind" FROM "DomainEvents" e CROSS JOIN LATERAL jsonb_array_elements(e."PayloadJson"->'questions') q
            WHERE e."EventType" = 'PLANNING_CLARIFICATION_ASKED' AND e."OccurredAt" >= @from AND e."OccurredAt" < @to
              AND ((e."UserId" = ANY(@excluded)) = @internal)
        ), answered AS (
            SELECT e."UserId", a->>'kind' AS "Kind", jsonb_array_length(a->'chosen') > 0 AS "Chosen", (a->>'other')::boolean AS "Other"
            FROM "DomainEvents" e CROSS JOIN LATERAL jsonb_array_elements(e."PayloadJson"->'answers') a
            WHERE e."EventType" = 'PLANNING_CLARIFICATION_ANSWERED' AND e."OccurredAt" >= @from AND e."OccurredAt" < @to
              AND ((e."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    // Tasks created in the window whose first seven days have passed, by where they came from.
    private const string Execution = """
        WITH tasks AS (
            SELECT t."Id", t."UserId", t."Source" = 'AI_ASSISTED' AS "Ai",
                   (t."Status" = 'COMPLETED' AND t."TerminalAt" < t."CreatedAt" + INTERVAL '7 days') AS "Done7"
            FROM "Tasks" t
            WHERE t."CreatedAt" >= @from AND t."CreatedAt" < @to AND t."CreatedAt" + INTERVAL '7 days' <= @now
              AND ((t."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    // Reconcile decisions of sessions opened in the window: one per Task the session changed or kept.
    private const string Decisions = """
        WITH sessions AS (
            SELECT s."Id", s."UserId" FROM "ReconcileSessions" s
            WHERE s."OpenedAt" >= @from AND s."OpenedAt" < @to AND ((s."UserId" = ANY(@excluded)) = @internal)
        ), decisions AS (
            SELECT e."EventId", s."UserId",
                   CASE e."EventType" WHEN 'TASK_COMPLETED' THEN 'DONE' WHEN 'TASK_DROPPED' THEN 'DROP'
                        WHEN 'TASK_REVIEW_KEPT' THEN 'KEEP'
                        ELSE CASE WHEN EXISTS (SELECT 1 FROM "ReconcileQuickActions" q
                                  WHERE q."AppliedEventId" = e."EventId" AND q."ActionType" = 'CARRY_TO_TODAY')
                                  THEN 'TODAY' ELSE 'MOVED' END END AS "Kind"
            FROM "DomainEvents" e JOIN sessions s ON s."Id" = e."ReconcileSessionId"
            WHERE e."AggregateType" = 'Task'
              AND e."EventType" IN ('TASK_COMPLETED', 'TASK_CARRIED', 'TASK_DROPPED', 'TASK_REVIEW_KEPT')
        )

        """;

    // Satisfaction prompts shown in the window (027 §4).
    private const string Feedback = """
        WITH prompts AS (
            SELECT f."UserId", f."Surface", f."Outcome", f."Rating", f."Reason" FROM "AiResponseFeedback" f
            WHERE f."ShownAt" >= @from AND f."ShownAt" < @to AND ((f."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    // Drafts created in the window, by whether their flow answered a question and whether they were applied.
    private const string AnsweredDrafts = """
        WITH drafts AS (
            SELECT e."UserId", e."AggregateId" AS "DraftId", e."PayloadJson"->>'flowId' AS "FlowId" FROM "DomainEvents" e
            WHERE e."EventType" = 'PLANNING_DRAFT_CREATED' AND e."EventVersion" = 2
              AND e."OccurredAt" >= @from AND e."OccurredAt" < @to AND ((e."UserId" = ANY(@excluded)) = @internal)
        ), classified AS (
            SELECT d."UserId", d."DraftId",
                   EXISTS (SELECT 1 FROM "DomainEvents" a CROSS JOIN LATERAL jsonb_array_elements(a."PayloadJson"->'answers') x
                       WHERE a."EventType" = 'PLANNING_CLARIFICATION_ANSWERED' AND a."PayloadJson"->>'flowId' = d."FlowId"
                         AND (jsonb_array_length(x->'chosen') > 0 OR (x->>'other')::boolean)) AS "Answered",
                   EXISTS (SELECT 1 FROM "DomainEvents" e JOIN "CommandResults" r ON r."Id" = e."CommandResultId"
                       WHERE e."AggregateType" = 'PlanningDraft' AND e."AggregateId" = d."DraftId"
                         AND e."EventType" = 'PLANNING_DRAFT_APPLIED' AND r."Status" = 'SUCCEEDED') AS "Applied"
            FROM drafts d
        )

        """;

    // Routine occurrences resolved for a date in the window (UTC dates), by the Routine's origin.
    private const string Occurrences = """
        WITH slots AS (
            SELECT r."UserId", r."Source" = 'AI_ASSISTED' AS "Ai", o."Status" = 'DONE' AS "Done"
            FROM "RoutineOccurrences" o JOIN "Routines" r ON r."Id" = o."RoutineId"
            WHERE o."Status" IN ('DONE', 'MISSED')
              AND o."ScheduledLocalDate" >= (@from AT TIME ZONE 'UTC')::date AND o."ScheduledLocalDate" < (@to AT TIME ZONE 'UTC')::date
              AND ((r."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    // Tasks created in the window with the number of Carries made while due and not taken back.
    private const string Carried = """
        WITH carried AS (
            SELECT t."UserId", t."Source" = 'AI_ASSISTED' AS "Ai",
                   (SELECT COUNT(*) FROM "DomainEvents" c
                    WHERE c."AggregateType" = 'Task' AND c."AggregateId" = t."Id" AND c."EventType" = 'TASK_CARRIED'
                      AND (c."PayloadJson"->>'wasDue')::boolean
                      AND NOT EXISTS (SELECT 1 FROM "DomainEvents" u WHERE u."EventType" = 'TASK_CARRY_UNDONE' AND u."CausationId" = c."EventId")) AS "Carries"
            FROM "Tasks" t
            WHERE t."CreatedAt" >= @from AND t."CreatedAt" < @to AND ((t."UserId" = ANY(@excluded)) = @internal)
        )

        """;

    private static PilotMetric Figure(string id, string unit, string numerator, string denominator, string window,
        string segmentation, string sql, string missing = ZeroRows) =>
        new(id, 1, "PRODUCT", Insight, unit, numerator, denominator, window, missing, segmentation, sql);

    public static readonly IReadOnlyList<PilotMetric> Figures =
    [
        // ---- People ----
        Figure("P.ACCOUNTS", "account", "accounts registered in the window", "accounts registered by the end of the window",
            "Registration time.", NoSegment, Accounts + """
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "CreatedAt" >= @from)::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM accounts
            """),
        Figure("P.ACTIVATION", "account", "accounts that reached a first plan applied by a succeeded command",
            "accounts registered by the end of the window", "Everything before the end of the window.", NoSegment, Accounts + """
            SELECT '' AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "DomainEvents" e JOIN "CommandResults" r ON r."Id" = e."CommandResultId"
                       WHERE e."UserId" = a."Id" AND e."EventType" = 'PLANNING_DRAFT_APPLIED' AND r."Status" = 'SUCCEEDED'
                         AND e."OccurredAt" < @to))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM accounts a
            """),
        Figure("P.WEEKLY_ACTIVE", "account", "accounts that did work, reconciled or planned in the last seven days of the window",
            "accounts registered by the end of the window", "The seven days before the end of the window.", NoSegment, Accounts + """
            SELECT '' AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM active e WHERE e."UserId" = a."Id"
                       AND e."OccurredAt" >= @to - INTERVAL '7 days' AND e."OccurredAt" < @to))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM accounts a
            """),
        Figure("P.COHORT_RETENTION", "account", "accounts of the cohort active in that week after it registered",
            "accounts in the cohort", "Accounts registered in the window, grouped by their registration week (UTC weeks from Saturday); weeks 0–4 that have begun.",
            "<cohort week start, yyyy-mm-dd>:<weeks since, 0–4>", Accounts + """
            , cohorts AS (
                SELECT a."Id", (date_trunc('week', (a."CreatedAt" AT TIME ZONE 'UTC') + INTERVAL '2 days') - INTERVAL '2 days') AS "Week"
                FROM accounts a WHERE a."CreatedAt" >= @from
            )
            SELECT to_char(c."Week", 'YYYY-MM-DD') || ':' || w."N" AS "Segment",
                   COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM active e WHERE e."UserId" = c."Id"
                       AND e."OccurredAt" >= (c."Week" + w."N" * INTERVAL '7 days') AT TIME ZONE 'UTC'
                       AND e."OccurredAt" < (c."Week" + (w."N" + 1) * INTERVAL '7 days') AT TIME ZONE 'UTC'))::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM cohorts c CROSS JOIN generate_series(0, 4) AS w("N")
            WHERE (c."Week" + w."N" * INTERVAL '7 days') AT TIME ZONE 'UTC' <= @now
            GROUP BY c."Week", w."N" ORDER BY c."Week", w."N"
            """),

        // ---- Planning ----
        Figure("P.FUNNEL_FLOWS", "planning flow", "flows that reached the stage", "flows started",
            "Flows whose first attempt was created in the window.",
            "STARTED, DRAFT, DECIDED (applied, cancelled or replaced), ACCEPTED (an apply was submitted), APPLIED (by a succeeded command), ALIVE_7D (applied at least seven days ago and nothing it created dropped, abandoned or stopped within them)",
            Funnel + """
            SELECT "Segment", COUNT(*) FILTER (WHERE "Reached")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM reached GROUP BY "Segment" ORDER BY "Segment"
            """, "A flow applied less than seven days ago is not yet ALIVE_7D."),
        Figure("P.FUNNEL_ACCOUNTS", "account", "accounts with at least one flow that reached the stage", "accounts that started a flow",
            "Flows whose first attempt was created in the window.", "the stages of P.FUNNEL_FLOWS", Funnel + """
            SELECT "Segment", COUNT(*) FILTER (WHERE "Reached")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM (SELECT "UserId", "Segment", bool_or("Reached") AS "Reached" FROM reached GROUP BY "UserId", "Segment") x
            GROUP BY "Segment" ORDER BY "Segment"
            """),
        Figure("P.REMOVED_BEFORE_ACCEPTING", "proposed item", "proposals left out before the draft was applied",
            "proposals of the type in applied drafts", "Drafts applied in the window (PLANNING_DRAFT_APPLIED version 2).",
            "GOAL, PROJECT, TASK, ROUTINE", """
            WITH applied AS (
                SELECT e."UserId", e."PayloadJson" AS p FROM "DomainEvents" e
                WHERE e."EventType" = 'PLANNING_DRAFT_APPLIED' AND e."EventVersion" = 2
                  AND e."OccurredAt" >= @from AND e."OccurredAt" < @to AND ((e."UserId" = ANY(@excluded)) = @internal)
            )
            SELECT t."Segment", COALESCE(SUM((p->>t."Excluded")::int), 0)::bigint AS "Numerator",
                   COALESCE(SUM((p->>t."Excluded")::int + (p->>t."Created")::int), 0)::bigint AS "Denominator"
            FROM applied CROSS JOIN (VALUES ('GOAL', 'excludedGoalCount', 'goalCount'), ('PROJECT', 'excludedProjectCount', 'projectCount'),
                ('TASK', 'excludedTaskCount', 'taskCount'), ('ROUTINE', 'excludedRoutineCount', 'routineCount')) t("Segment", "Excluded", "Created")
            GROUP BY t."Segment" ORDER BY t."Segment"
            """, "Drafts applied before STEP-14 (version 1) carry no exclusions and are left out, never counted as zero."),
        Figure("P.REMOVED_BEFORE_ACCEPTING_ACCOUNTS", "account", "accounts that left out at least one proposal of the type",
            "accounts with an applied draft", "Drafts applied in the window (PLANNING_DRAFT_APPLIED version 2).",
            "GOAL, PROJECT, TASK, ROUTINE", """
            WITH applied AS (
                SELECT e."UserId", e."PayloadJson" AS p FROM "DomainEvents" e
                WHERE e."EventType" = 'PLANNING_DRAFT_APPLIED' AND e."EventVersion" = 2
                  AND e."OccurredAt" >= @from AND e."OccurredAt" < @to AND ((e."UserId" = ANY(@excluded)) = @internal)
            )
            SELECT t."Segment", COUNT(DISTINCT "UserId") FILTER (WHERE (p->>t."Excluded")::int > 0)::bigint AS "Numerator",
                   COUNT(DISTINCT "UserId")::bigint AS "Denominator"
            FROM applied CROSS JOIN (VALUES ('GOAL', 'excludedGoalCount'), ('PROJECT', 'excludedProjectCount'),
                ('TASK', 'excludedTaskCount'), ('ROUTINE', 'excludedRoutineCount')) t("Segment", "Excluded")
            GROUP BY t."Segment" ORDER BY t."Segment"
            """),
        Figure("P.CLARIFICATION", "clarification question", "questions of the kind, by what happened to them",
            "ASKED: all questions asked; ANSWERED and SKIPPED: questions of the kind asked; OTHER: questions of the kind answered",
            "Questions asked or answered in the window.",
            "<kind>:ASKED, <kind>:ANSWERED (an option or own words), <kind>:OTHER («چیز دیگر…» written), <kind>:SKIPPED (left empty when answering or drafting now)",
            Questions + """
            , kinds AS (SELECT "Kind", COUNT(*) AS "Asked" FROM asked GROUP BY "Kind"),
              given AS (SELECT "Kind", COUNT(*) FILTER (WHERE "Chosen" OR "Other") AS "Answered",
                               COUNT(*) FILTER (WHERE "Other") AS "Other",
                               COUNT(*) FILTER (WHERE NOT "Chosen" AND NOT "Other") AS "Skipped"
                        FROM answered GROUP BY "Kind")
            SELECT k."Kind" || ':' || v."Part" AS "Segment", v."Numerator"::bigint AS "Numerator", v."Denominator"::bigint AS "Denominator"
            FROM kinds k LEFT JOIN given g ON g."Kind" = k."Kind"
            CROSS JOIN LATERAL (VALUES
                ('ASKED', k."Asked", (SELECT COUNT(*) FROM asked)),
                ('ANSWERED', COALESCE(g."Answered", 0), k."Asked"),
                ('OTHER', COALESCE(g."Other", 0), COALESCE(g."Answered", 0)),
                ('SKIPPED', COALESCE(g."Skipped", 0), k."Asked")) v("Part", "Numerator", "Denominator")
            ORDER BY 1
            """, "A question whose flow was abandoned is ASKED and neither ANSWERED nor SKIPPED."),
        Figure("P.CLARIFICATION_ACCOUNTS", "account", "accounts that answered at least one question of the kind (an option or own words)",
            "accounts asked a question of the kind", "Questions asked or answered in the window.", "<kind>", Questions + """
            SELECT k."Kind" AS "Segment",
                   COUNT(DISTINCT k."UserId") FILTER (WHERE EXISTS (SELECT 1 FROM answered a
                       WHERE a."UserId" = k."UserId" AND a."Kind" = k."Kind" AND (a."Chosen" OR a."Other")))::bigint AS "Numerator",
                   COUNT(DISTINCT k."UserId")::bigint AS "Denominator"
            FROM asked k GROUP BY k."Kind" ORDER BY 1
            """),
        Figure("P.ACCEPTANCE_BY_ANSWERS", "planning draft", "drafts applied by a succeeded command", "drafts created",
            "Drafts created in the window (PLANNING_DRAFT_CREATED version 2).",
            "WITH_ANSWERS (its flow answered at least one question), WITHOUT_ANSWERS (no question, or none answered)", AnsweredDrafts + """
            SELECT CASE WHEN "Answered" THEN 'WITH_ANSWERS' ELSE 'WITHOUT_ANSWERS' END AS "Segment",
                   COUNT(*) FILTER (WHERE "Applied")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM classified GROUP BY 1 ORDER BY 1
            """),
        Figure("P.ACCEPTANCE_BY_ANSWERS_ACCOUNTS", "account", "accounts with at least one such draft applied",
            "accounts with a draft of the segment", "Drafts created in the window (PLANNING_DRAFT_CREATED version 2).",
            "the segments of P.ACCEPTANCE_BY_ANSWERS", AnsweredDrafts + """
            SELECT CASE WHEN "Answered" THEN 'WITH_ANSWERS' ELSE 'WITHOUT_ANSWERS' END AS "Segment",
                   COUNT(DISTINCT "UserId") FILTER (WHERE "Applied")::bigint AS "Numerator", COUNT(DISTINCT "UserId")::bigint AS "Denominator"
            FROM classified GROUP BY 1 ORDER BY 1
            """),

        // ---- Execution of AI-created and manual work ----
        Figure("P.TASKS_DONE_7D", "Task", "Tasks completed within seven days of being created", "Tasks created",
            "Tasks created in the window at least seven days ago.", "AI (created by an applied plan), MANUAL", Execution + """
            SELECT CASE WHEN "Ai" THEN 'AI' ELSE 'MANUAL' END AS "Segment",
                   COUNT(*) FILTER (WHERE "Done7")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM tasks GROUP BY 1 ORDER BY 1
            """, "A Task created less than seven days ago is not yet counted."),
        Figure("P.TASKS_DONE_7D_ACCOUNTS", "account", "accounts whose AI-created Tasks were done within seven days at a higher rate than their manual ones",
            "accounts with Tasks of both origins", "Tasks created in the window at least seven days ago.", NoSegment, Execution + """
            , rates AS (
                SELECT "UserId", AVG(CASE WHEN "Done7" THEN 1.0 ELSE 0 END) FILTER (WHERE "Ai") AS "Ai",
                       AVG(CASE WHEN "Done7" THEN 1.0 ELSE 0 END) FILTER (WHERE NOT "Ai") AS "Manual"
                FROM tasks GROUP BY "UserId"
            )
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "Ai" > "Manual")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM rates WHERE "Ai" IS NOT NULL AND "Manual" IS NOT NULL
            """),
        Figure("P.ROUTINE_SLOTS_DONE", "Routine occurrence", "occurrences done", "occurrences resolved (done or missed)",
            "Occurrences scheduled for a date in the window (UTC dates).", "AI (Routine created by an applied plan), MANUAL", Occurrences + """
            SELECT CASE WHEN "Ai" THEN 'AI' ELSE 'MANUAL' END AS "Segment",
                   COUNT(*) FILTER (WHERE "Done")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM slots GROUP BY 1 ORDER BY 1
            """),
        Figure("P.ROUTINE_SLOTS_DONE_ACCOUNTS", "account", "accounts whose AI-created Routine occurrences were done at a higher rate than their manual ones",
            "accounts with resolved occurrences of both origins", "Occurrences scheduled for a date in the window (UTC dates).", NoSegment, Occurrences + """
            , rates AS (
                SELECT "UserId", AVG(CASE WHEN "Done" THEN 1.0 ELSE 0 END) FILTER (WHERE "Ai") AS "Ai",
                       AVG(CASE WHEN "Done" THEN 1.0 ELSE 0 END) FILTER (WHERE NOT "Ai") AS "Manual"
                FROM slots GROUP BY "UserId"
            )
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "Ai" > "Manual")::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM rates WHERE "Ai" IS NOT NULL AND "Manual" IS NOT NULL
            """),
        Figure("P.TASKS_CARRIED_OVER_TWICE", "Task", "Tasks carried more than twice while due (undone Carries left out)", "Tasks created",
            "Tasks created in the window.", "AI, MANUAL", Carried + """
            SELECT CASE WHEN "Ai" THEN 'AI' ELSE 'MANUAL' END AS "Segment",
                   COUNT(*) FILTER (WHERE "Carries" > 2)::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM carried GROUP BY 1 ORDER BY 1
            """),
        Figure("P.TASKS_CARRIED_OVER_TWICE_ACCOUNTS", "account", "accounts with at least one Task of the origin carried more than twice while due",
            "accounts with Tasks of the origin", "Tasks created in the window.", "AI, MANUAL", Carried + """
            SELECT CASE WHEN "Ai" THEN 'AI' ELSE 'MANUAL' END AS "Segment",
                   COUNT(DISTINCT "UserId") FILTER (WHERE "Carries" > 2)::bigint AS "Numerator", COUNT(DISTINCT "UserId")::bigint AS "Denominator"
            FROM carried GROUP BY 1 ORDER BY 1
            """),

        // ---- Reconcile ----
        Figure("P.RECONCILE_SESSIONS", "Reconcile session", "sessions opened", "distinct accounts that opened one",
            "Sessions opened in the window.", NoSegment, Decisions + """
            SELECT '' AS "Segment", COUNT(*)::bigint AS "Numerator", COUNT(DISTINCT "UserId")::bigint AS "Denominator" FROM sessions
            """),
        Figure("P.RECONCILE_DECISIONS_PER_SESSION", "Reconcile session", "decisions taken", "sessions opened",
            "Sessions opened in the window.", NoSegment, Decisions + """
            SELECT '' AS "Segment", (SELECT COUNT(*) FROM decisions)::bigint AS "Numerator", (SELECT COUNT(*) FROM sessions)::bigint AS "Denominator"
            """),
        Figure("P.RECONCILE_DECISION_MIX", "Reconcile decision", "decisions of the kind", "decisions taken",
            "Sessions opened in the window.",
            "DONE, TODAY («امروز» on tap), MOVED (to a date through the preview), KEEP, DROP", Decisions + """
            SELECT "Kind" AS "Segment", COUNT(*)::bigint AS "Numerator", (SUM(COUNT(*)) OVER ())::bigint AS "Denominator"
            FROM decisions GROUP BY "Kind" ORDER BY "Kind"
            """),
        Figure("P.RECONCILE_DECISION_MIX_ACCOUNTS", "account", "accounts that took at least one decision of the kind",
            "accounts that took a decision", "Sessions opened in the window.", "the kinds of P.RECONCILE_DECISION_MIX", Decisions + """
            SELECT "Kind" AS "Segment", COUNT(DISTINCT "UserId")::bigint AS "Numerator",
                   (SELECT COUNT(DISTINCT "UserId") FROM decisions)::bigint AS "Denominator"
            FROM decisions GROUP BY "Kind" ORDER BY "Kind"
            """),
        Figure("P.RECONCILE_REVERTED", "Reconcile decision", "decisions taken back with «بازگردان»", "decisions taken",
            "Sessions opened in the window.", NoSegment, Decisions + """
            SELECT '' AS "Segment",
                   (SELECT COUNT(*) FROM "DomainEvents" u JOIN sessions s ON s."Id" = u."ReconcileSessionId"
                    WHERE u."EventType" IN ('TASK_COMPLETION_UNDONE', 'TASK_CARRY_UNDONE'))::bigint AS "Numerator",
                   (SELECT COUNT(*) FROM decisions)::bigint AS "Denominator"
            """),
        Figure("P.RECONCILE_REVERTED_ACCOUNTS", "account", "accounts that took back at least one decision with «بازگردان»",
            "accounts that took a decision", "Sessions opened in the window.", NoSegment, Decisions + """
            SELECT '' AS "Segment",
                   (SELECT COUNT(DISTINCT u."UserId") FROM "DomainEvents" u JOIN sessions s ON s."Id" = u."ReconcileSessionId"
                    WHERE u."EventType" IN ('TASK_COMPLETION_UNDONE', 'TASK_CARRY_UNDONE'))::bigint AS "Numerator",
                   (SELECT COUNT(DISTINCT "UserId") FROM decisions)::bigint AS "Denominator"
            """),

        // ---- Satisfaction (027 §4) ----
        Figure("P.SATISFACTION_PROMPTS", "satisfaction prompt", "prompts that ended so", "prompts shown on the surface",
            "Prompts shown in the window.", "<surface>:ANSWERED, <surface>:CLOSED (closed without an answer), <surface>:SHOWN (no answer yet)",
            Feedback + """
            SELECT "Surface" || ':' || "Outcome" AS "Segment", COUNT(*)::bigint AS "Numerator",
                   (SUM(COUNT(*)) OVER (PARTITION BY "Surface"))::bigint AS "Denominator"
            FROM prompts GROUP BY "Surface", "Outcome" ORDER BY 1
            """, "A closed or unanswered prompt is a non-response, never a low rating."),
        Figure("P.SATISFACTION_RATING", "satisfaction answer", "answers with the rating (1 بد to 5 عالی)", "answers on the surface",
            "Prompts shown in the window.", "<surface>:<1–5>", Feedback + """
            SELECT "Surface" || ':' || "Rating" AS "Segment", COUNT(*)::bigint AS "Numerator",
                   (SUM(COUNT(*)) OVER (PARTITION BY "Surface"))::bigint AS "Denominator"
            FROM prompts WHERE "Outcome" = 'ANSWERED' GROUP BY "Surface", "Rating" ORDER BY 1
            """),
        Figure("P.SATISFACTION_MEAN", "satisfaction answer", "sum of ratings (the mean is numerator / denominator)", "answers on the surface",
            "Prompts shown in the window.", "<surface>", Feedback + """
            SELECT "Surface" AS "Segment", COALESCE(SUM("Rating"), 0)::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM prompts WHERE "Outcome" = 'ANSWERED' GROUP BY "Surface" ORDER BY 1
            """),
        Figure("P.SATISFIED_ACCOUNTS", "account", "accounts whose answers average 4 or more", "accounts that answered",
            "Prompts shown in the window.", NoSegment, Feedback + """
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "Mean" >= 4)::bigint AS "Numerator", COUNT(*)::bigint AS "Denominator"
            FROM (SELECT "UserId", AVG("Rating") AS "Mean" FROM prompts WHERE "Outcome" = 'ANSWERED' GROUP BY "UserId") x
            """),
        Figure("P.LOW_RATING_REASONS", "satisfaction answer", "ratings of 1 or 2 that came with a reason", "ratings of 1 or 2",
            "Prompts shown in the window.", NoSegment, Feedback + """
            SELECT '' AS "Segment", COUNT(*) FILTER (WHERE "Reason" IS NOT NULL AND "Reason" <> '')::bigint AS "Numerator",
                   COUNT(*)::bigint AS "Denominator"
            FROM prompts WHERE "Outcome" = 'ANSWERED' AND "Rating" <= 2
            """)
    ];
}
