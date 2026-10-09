# Pilot Metric Dictionary

**Catalog version:** `2026-10-09.1` (adds `H1.USEFULNESS_RESPONSE` and `H2.UNDERSTANDING_RESPONSE`; `2026-10-08.2` added `H2.ELIGIBLE_START_RATE`). **State:** lock candidate. The content below is the proposed v1: the owner accepted the non-triviality classifier and the seven-day reversal window as v1 on 2026-10-09. It becomes `PILOT_LOCKED` when the Pilot Research owner signs its row in the Contract Freeze Register, which must happen before any pilot data is collected; from then on a change follows the register's change procedure. No threshold, cohort or observation window is set here; those belong to the signed analysis plan (STEP-12).

The definitions are code: [`PilotMetricCatalog.cs`](../../backend/Services/Operations/PilotMetricCatalog.cs). Each metric is one SQL query, and that query is the definition. This page explains how to read them. Changing a query changes its `DefinitionVersion` and the catalog version; a locked catalog changes only through the freeze register's change procedure.

## Rules that hold for every metric

- **Counts, not rates.** Every row is `(segment, numerator, denominator)`. A rate is never stored or shown without its denominator.
- **Window.** `[from, to)` on the anchoring record: the first attempt of a planning flow, the opening of a Reconcile session, or the creation of a command result.
- **Population.** Accounts listed in `Operations:OperatorPhones` or `Operations:InternalPhones` are computed separately ("internal") and never enter the primary rows. Seeded, demo and QA accounts must be listed there before collection.
- **Stages stay apart.** A flow, a reviewable draft, a disposition, a submitted command and an applied result are different rows. Acceptance is never counted as application: applied means a linked `CommandResult` with status `SUCCEEDED`.
- **Missing data.** No matching record gives `0 / 0` or no row. A record removed by retention is reported as `RECORD_PURGED` where that can be told, never guessed.
- **Retention bounds the window.** Planning attempts and drafts are R3 (30 days after they end), Reconcile sessions and pilot answers R2 (180 days). A window older than that under-reports; compute and archive before the boundary. In practice the H1 figures of a week must be archived within 30 days.
- **Classes.** `BEHAVIORAL` and `OPERATIONAL` rows are computed from what happened. `SELF_REPORT` rows are answers to an in-app question and say what a person reported, nothing more.
- **Descriptive only.** Nothing here supports a causal claim (021 §16).

## H1 — AI-assisted creation

A **flow** is the attempt the user started plus every attempt that answered its clarifying questions. A replayed `clientAttemptId` is the same attempt.

| Id | Numerator / denominator | Segments | Source |
|---|---|---|---|
| `H1.FLOWS_STARTED` | flows / distinct accounts | — | `PlanningAttempts` |
| `H1.REVIEWABLE_DRAFT` | flows that reached a draft / flows | — | `PlanningAttempts.Outcome`, `DraftId` |
| `H1.FLOW_OUTCOME` | flows by how their latest attempt ended / flows | `DRAFT`, `CLARIFICATION` (unanswered), `INPUT_BLOCKED`, `FAILED:<code>`, `CANCELLED`, `IN_FLIGHT` | `PlanningAttempts` |
| `H1.TIME_TO_DRAFT_SECONDS` | median seconds from first attempt to draft, answering time included / flows with a draft | — | `PlanningAttempts` |
| `H1.DRAFT_DISPOSITION` | drafts by disposition / drafts | `APPLIED`, `CANCELLED_BY_USER`, `SUPERSEDED`, `EXPIRED_WITHOUT_DECISION`, `PENDING`, `RECORD_PURGED` | `PlanningDrafts`, `PLANNING_DRAFT_APPLIED`, `PLANNING_DRAFT_CANCELLED` |
| `H1.ACCEPTANCE` | applied drafts by confirmed revision / drafts | `UNCHANGED` (revision 1), `EDITED`, `RECORD_PURGED` | `ActionConfirmations.PlanningDraftRevision` |
| `H1.APPLIED_PLAN` | flows whose draft was applied by a succeeded command / flows | — | `PLANNING_DRAFT_APPLIED` → `CommandResults` |
| `H1.APPLY_SUBMISSIONS` | apply commands by result / apply commands | command status | `CommandResults` (`APPLY_PLANNING_DRAFT`) |
| `H1.NON_TRIVIAL_PLAN` | applied drafts that created ≥ 2 entities with ≥ 1 Task or Routine / applied drafts | — | `PLANNING_DRAFT_APPLIED` payload counts |
| `H1.REVERSAL_7D` | applied drafts with a created entity dropped, abandoned or stopped inside 7 days / applied drafts older than 7 days | — | creation events by `ConfirmationId`, terminal events |
| `H1.USEFULNESS_RESPONSE` | applied drafts by the answer to the usefulness question / drafts applied by a succeeded command | `1` to `5`, `NO_RESPONSE` | `PilotFeedbackResponses` (`H1_USEFULNESS`) |

`H1.NON_TRIVIAL_PLAN` is classifier v1 (accepted by the owner on 2026-10-09): an applied draft that created at least two entities, at least one of them a Task or a Routine. It is deterministic and uses structure only, as 021 §5 requires. `H1.REVERSAL_7D` uses a seven-day window (accepted the same day) and is an `UNCLASSIFIED_REVERSAL` count: the product records no reason, so it is not regret (021 §8). A Routine stopped because its Project ended counts as reversed. `H1.USEFULNESS_RESPONSE` reports every answer and the unanswered plans apart; which answers count as "positive" is an analysis decision and is not set here.

## H2 — AI-assisted Reconcile

Every session metric is segmented by the severity band stored when the session opened (`NONE`, `LIGHT`, `MEDIUM`, `RECOVERY`); bands are never merged.

| Id | Numerator / denominator | Source |
|---|---|---|
| `H2.ELIGIBLE_START_RATE` | eligible account-days on which a session was opened / eligible account-days | `ReconcileExposures`, `ReconcileSessions` |
| `H2.SESSIONS_OPENED` | sessions / distinct accounts | `ReconcileSessions` |
| `H2.DETERMINISTIC_AVAILABILITY` | open commands that returned a session / open commands | `CommandResults` (`OPEN_RECONCILE_SESSION`) |
| `H2.ELIGIBLE_SESSIONS` | sessions with a rule match / sessions | `RuleMatches` |
| `H2.EXPLANATION_REQUESTED` | eligible sessions that asked / eligible sessions | `ReconcileExplanations` |
| `H2.EXPLANATION_AVAILABLE` | sessions that got a ready explanation / eligible sessions that asked | `ReconcileExplanations.Status` |
| `H2.EXPLANATION_OUTCOME` | explanations by end state (`READY`, `RUNNING`, `CANCELLED`, `FAILED:<code>`) / explanations | `ReconcileExplanations` |
| `H2.RECOMMENDATION_DISPOSITION` | recommendations by disposition / recommendations | `ReconcileRecommendations.Disposition` |
| `H2.RECOMMENDATION_APPLICATION` | accepted recommendations by command result (`APPLIED`, `ACCEPTED_CONFLICTED`, `ACCEPTED_FAILED`, `ACCEPTED_NO_RESULT`) / accepted | `ResultingCommandResultId` → `CommandResults` |
| `H2.MANUAL_ESCAPE` | sessions where a confirmation without a recommendation was applied / sessions with a failed explanation and no ready one | `ActionConfirmations` |
| `H2.UNRESOLVED_WORK_REDUCTION` | actionable at opening − actionable at completion, summed / actionable at opening, summed (completed sessions) | `ReconcileSessions`, `RECONCILE_SESSION_COMPLETED` payload |
| `H2.DECISION_COMPRESSION` | Tasks affected / applied confirmations | `RECONCILE_ACTION_CONFIRMED` payload |
| `H2.UNDERSTANDING_RESPONSE` | completed sessions by the answer to the understanding question / completed sessions of the same band and kind; segment `<band>:<EXPLAINED or DETERMINISTIC>:<1 to 5 or NO_RESPONSE>` | `PilotFeedbackResponses` (`H2_UNDERSTANDING`), `ReconcileExplanations` |
| `H2.USER_CONTRIBUTION` | sessions of the most active account / sessions | `ReconcileSessions` |

`H2.ELIGIBLE_START_RATE` counts an account-day once: the first time that day the account's overview was read while Reconcile was eligible, with the band at that moment. The client reads the overview on every page, so this is "used the application on an eligible day", not "looked at the offer"; a day the account never opened the application is not an exposure. `H2.DECISION_COMPRESSION` is descriptive and never a pass criterion (021 §6). `H2.USER_CONTRIBUTION` exists so a few accounts cannot dominate a conclusion unnoticed; capping is an analysis decision. `H2.MANUAL_ESCAPE` covers a failed explanation; an AI path that was switched off or never asked leaves the session an ordinary deterministic one. `H2.UNDERSTANDING_RESPONSE` keeps sessions that had a ready AI explanation (`EXPLAINED`) apart from those that did not, so the answer is never read as a verdict on an explanation the user did not see.

## In-app instruments

Two optional questions, each asked once, answered on a scale of 1 (lowest) to 5 (highest). The wording is part of the instrument version (`PilotInstruments.Version` = 1 on the server, `pilotInstrumentVersion` in the client); an answer sent under another version is refused, so no answer is counted under a wording the person did not read. The exact wording and how it is shown are in [`pilot-research-protocol.md`](pilot-research-protocol.md).

| Instrument | Asked | Subject |
|---|---|---|
| `H1_USEFULNESS` | under the result, right after a planning draft was applied | the draft |
| `H2_UNDERSTANDING` | on the closed-session screen, right after the user ended a Reconcile session | the session |

Not answering is a valid outcome and is reported as `NO_RESPONSE`. A second answer about the same subject changes nothing. The question is not shown again on a later visit.

## Required metrics the product does not compute

Listed by the API as `external` so they are never mistaken for zero:

| Id | What is needed |
|---|---|
| `H1.USEFUL_FIRST_PLAN` | a composite the analysis plan defines: a positive `H1.USEFULNESS_RESPONSE` joined to `H1.APPLIED_PLAN`, `H1.NON_TRIVIAL_PLAN` and the observation window. The response is now collected; the positive threshold is not set here |
| `H1.TRUST_BOUNDARY_COMPREHENSION` | moderated session: comprehension questions cross-checked against observed behavior |
| `H1.REGRET_ATTRIBUTION` | moderated session: the participant attributes each reversal |
| `H2.UNDERSTANDING_SCORE` | `H2.UNDERSTANDING_RESPONSE` cross-checked against moderated observation; the score rule belongs to the analysis plan |
| `H2.REOPEN_OR_REGRET` | moderated session: the participant attributes outcomes after an applied action; no reversal reason is recorded |

The moderated sessions are described in [`pilot-research-protocol.md`](pilot-research-protocol.md). They have not been held.

## Consumers

| Consumer | Uses |
|---|---|
| operator page `/operations` | all computed metrics, for the last 7, 28 or 90 days |
| Pilot Research owner (analysis package) | `GET /api/v1/operations/metrics?days=N`, archived with its `catalogVersion` |
| `backend.Tests/OperationsMetricsTests.cs` | exact reproduction of every numerator and denominator from a fixed fixture |

Operational AI figures (calls, latency, tokens, cost, failure classes, gates) are not pilot metrics; they come from `AiInvocations` through `GET /api/v1/operations/ai` and are described in [`../backend/logging-observability.md`](../backend/logging-observability.md).
