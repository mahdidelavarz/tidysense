# Step 10 AI-Assisted Reconcile Acceptance Contract

**Status:** Implemented and verified with the sample explainer and a scripted provider on 2026-10-08, and against the real provider in one owner-run flow the same day. This contract applies to the optional AI explanation of a Reconcile session, its recommendations and their disposition. Facts, severity, rules, previews, confirmations and application stay as in `step-07-capture-reconcile-acceptance.md`; the AI runtime controls stay as in `step-09-ai-planning-acceptance.md` unless stated here.

## Canonical behavior

### Boundary

1. The explanation is the port `IReconcileExplainer`. `Ai:Reconcile:Provider` selects the deterministic sample explainer (`mock`, key `reconcile.sample`) or the model-backed `AiReconcileExplainer` (key `reconcile.explanation`, output family `RECONCILE`).
2. The deterministic evaluation always runs first and is the only input. If it fails, nothing is requested: there is no path from raw entities to a model.
3. A session's facts, severity, counts, lanes and rule matches are returned without waiting for, and are never changed by, an explanation. Removing every explanation leaves the session complete.
4. An explanation creates and changes nothing. A recommendation adds no authority: using one only prefills the ordinary Reconcile preview, which is built, confirmed, revalidated and applied exactly as without AI.

### Eligibility

5. An explanation is eligible only when at least one execution-lane decision matched a rule (`R1`, `R2`, `R3`, `R6`). Otherwise the session reports `NOT_ELIGIBLE`, a request returns `422 EXPLANATION_NOT_ELIGIBLE`, and no explainer is called. Decisions without a rule match keep their deterministic quick actions and get no AI text. The commitment-review and capture lanes are never explained.
6. An explanation is requested by the user, for an `OPEN` session they own. It is never started automatically.

### Input

7. The context is built by pure code from the evaluation: per owner group, one unit per loose Task or per sequence, each with its reason codes, rule ids, allowed actions, age in days, carry count, protection flag, days to deadline, member and blocked-member counts and the dropped-predecessor flag; plus severity, actionable count and oldest age.
8. The context contains no title, description, note, date or canonical id. Units are named by opaque references (`u1`, …); the server keeps which Tasks or sequence each one stands for.
9. `COMPLETE_TASK` is never listed among a unit's allowed actions. A unit is included only if it has at least one allowed action left.
10. At most 30 units are sent, whole units only. All of it is mandatory: when the request exceeds `MaxInputTokens` no call is made and the explanation fails with `CONTEXT_TOO_LARGE`.

### Output gate

11. An output is usable only if it passes, in order: transport completeness (finish reason `stop`, non-empty, at most 8,000 characters), the allowlisted wrapper removal, strict parsing, schema, text policy and semantic rules. Any failure rejects the whole output; it is not retried.
12. Schema: `summary` (text) and up to five `recommendations { unitRefs[], ruleId, actionType, explanation }`. An unknown field, a wrong type, an unknown rule or an action outside the six Reconcile action types fails. Allowed repairs are the three wrapper removals and `NORMALIZE_KNOWN_ENUM_CASE`.
13. Text policy: summary at most 400 characters, explanation at most 300; no digit in any script, no percent sign, no markup, no link, no control character. Every number the user sees comes from the deterministic facts.
14. Semantic rules: every reference exists; the units of one recommendation belong to one owner group and are of one kind; a sequence recommendation has exactly one unit; a unit appears in at most one recommendation; the rule matched every unit; the action is allowed for every unit. So a protected Task or one at deadline risk can never be recommended for Drop, alone or inside a bulk.
15. The same policy and semantic rules are applied to whatever any explainer returns before it is stored.
16. The model supplies no date. A recommended move asks the user for the date.

### Explanation lifecycle

17. An explanation is `RUNNING`, `READY`, `FAILED` or `CANCELLED`. One runs per session; asking again while one runs returns the same one.
18. A result is attached only if the explanation is still `RUNNING` and its session is still `OPEN`. A result that arrives after a cancellation or after the session closed is discarded.
19. Failure codes: `EXPLANATION_INVALID`, `AI_UNAVAILABLE`, `AI_BUDGET_EXHAUSTED`, `CONTEXT_TOO_LARGE`, `GENERATION_TIMEOUT`, `PROVIDER_ERROR`. A failure changes nothing else and can be followed by a new request.
20. Requesting while the global or the Reconcile kill switch is on returns `503 RECONCILE_AI_UNAVAILABLE`, stores nothing, and the session reports `DISABLED`. A user may request `ExplanationsPerUserPerDay` explanations; beyond that the request returns `429 AI_RATE_LIMITED` with `Retry-After`.
21. The Reconcile family has its own kill switch, retry switch, limits, daily budget and circuit; planning switches and planning spend do not affect it.

### Currency

22. Each unit's evidence is hashed without its reference. The summary is shown as current only while the hash over all units equals the one stored with the explanation.
23. A recommendation is `OPEN` while every Task or sequence it points at still carries the evidence it was built on; otherwise it is `OUTDATED` and cannot be previewed (`409 RECOMMENDATION_OUTDATED`). A title edit does not change evidence.

### Disposition and application

24. A preview may carry `recommendationId`. The request must name the recommended action and, for Tasks, a non-empty subset of the recommended Tasks; for a sequence, that sequence. Anything else is `400`. A declined recommendation, or one whose explanation is not `READY`, returns `422 RECOMMENDATION_NOT_AVAILABLE`.
25. Requesting or viewing a preview is not a disposition.
26. Submitting the confirmation records the disposition first, in its own transaction: `ACCEPTED`, or `ACCEPTED_EDITED` when Tasks were left out. The command then runs as usual. A confirmation that turns out stale leaves an accepted recommendation and no change: acceptance is never evidence of application.
27. Declining records `REJECTED` once; repeating it is harmless.
28. Another user can neither request, see, use nor decline an explanation or recommendation (`404`).
29. The command submitted from a recommendation is linked to it whatever its result (`SUCCEEDED`, `CONFLICTED`, `FAILED_FINAL`); the latest submission wins. The client shows "applied" only from that result, never from the acceptance.
30. A recommendation nobody answered ends as `EXPIRED_WITHOUT_DECISION` when its session is completed or expires, or when a later explanation of the same session finishes (ready or failed). It records that no decision was captured, writes no decision event, and can no longer be previewed.
31. Every recommendation keeps the deterministic facts of each unit it points at, as they were when it was made: reason codes, rule ids, allowed actions, age, carry count, protection, days to deadline, member and blocked counts, the dropped-predecessor flag and evidence quality. The client shows them beside the Task or sequence as «واقعیت‌ها», apart from the rule («قاعده») and from the model's text («توضیح هوش مصنوعی»), above the line that nothing changes until a preview is confirmed.

## Events and records

- `RECONCILE_RECOMMENDATION_PRESENTED` (actor `SYSTEM_DETERMINISTIC`; `actionType`, `unitCount`, `explainer`), `RECONCILE_RECOMMENDATION_ACCEPTED` (actor `USER`; `actionType`, `edited`) and `RECONCILE_RECOMMENDATION_REJECTED` (actor `USER`; `actionType`). Each carries the recommendation as `ProposalId`, the rule id and catalog version, and the session; the accepted event also carries the confirmation. AI is never an actor.
- `ActionConfirmations.ReconcileRecommendationId` links a preview to the recommendation it came from. Task events of the confirmed command are unchanged and keep actor `USER`.
- `ReconcileExplanations` (R3) holds the status, explainer key, context-builder version, context fingerprint, a count-only manifest and the summary. `ReconcileRecommendations` holds the rule, action, targets, evidence fingerprint, the evidence itself (`EvidenceJson`), explanation text, disposition (`PENDING`, `ACCEPTED`, `ACCEPTED_EDITED`, `REJECTED`, `CANCELLED`, `EXPIRED_WITHOUT_DECISION`) and `ResultingCommandResultId`.
- Every provider call or blocked operation is an `AiInvocations` row with `ReconcileExplanationId`. No prompt or response is stored.

## API surface

- `POST /api/v1/reconcile/sessions/{id}/explanation`, `POST /api/v1/reconcile/sessions/{id}/explanation/cancel`; both return the session.
- `POST /api/v1/reconcile/recommendations/{id}/dismiss`.
- `ReconcileSessionDto` adds `ai { availability, sample, explanation { id, status, failureCode, isCurrent, summary, recommendations[], createdAt } }`; a recommendation has `ruleId`, `actionType`, `taskIds`, `sequenceId`, `explanation`, `evidence[]`, `status`, `commandStatus` and `tasks[] { id, title }` (read for display; never sent to an explainer).
- `POST /api/v1/reconcile/sessions/{id}/previews` additionally accepts `recommendationId`.

Persian UI terms: the card is «توضیح هوش مصنوعی», asking is «توضیح بده», the rule label is «قاعده», declining is «نمی‌خواهم».

## H2 evidence available from stored data

Deterministic availability (sessions opened); eligibility (sessions with a rule match); explanation availability (`ReconcileExplanations` by status and failure code among eligible sessions); recommendation disposition, unchanged and edited acceptance (`ReconcileRecommendations.Disposition`, the accepted and rejected events); applied, accepted-but-conflicted and accepted-but-failed recommendations (`ResultingCommandResultId` joined to `CommandResults.Status`); recommendations left without a decision (`EXPIRED_WITHOUT_DECISION`); manual escape (confirmations without a recommendation in sessions that have a failed, cancelled or absent explanation); severity band (stored on the session when it opened).

## Recorded deviations and assumptions

Chosen during implementation. The owner reviewed the comparison with the Mind Map on 2026-10-08, agreed to keep the deviations below, and asked for the recommendation outcomes, the command-result link, the stored evidence and the fact display to be brought in line (statements 29–31).

- **User-requested, not automatic.** 020A allows attaching an explanation after the facts are returned; this step starts one only when the user asks, to keep cost and exposure bounded.
- **Execution lane only.** Goal Continuation and Project review are closed deterministic checkpoints (017 §3); nothing about them is explained or recommended.
- **No titles are sent.** 020A lists notes, descriptions, imported messages and narrative as excluded; titles are treated the same, because they are user-written text. The client joins titles to recommendations locally.
- **No digits in AI text.** A stricter reading of "no invented metric" and "no fabricated confidence"; it may reject otherwise acceptable outputs.
- **Recommendations are limited to the six existing Reconcile actions.** `SPLIT_TASK`, `REVIEW_CONFLICTING_TASKS`, Routine and Project actions (R4, R5) do not exist deterministically, so they cannot be recommended.
- **Acceptance is recorded at confirmation submit**, not when a preview is opened.
- **`CANCELLED` is allowed but never produced.** 019C lists it as an outcome; there is no user act that cancels a recommendation other than declining it.
- **Evidence quality is always `SUFFICIENT`**, as on session facts: absence and calibration are not tracked (STEP-07), and no included rule depends on them.
- **The consequence summary is the confirmation preview**, linked through the confirmation, not copied onto the recommendation.
- **The result link has no foreign key**, so R1 command results and R3 recommendations stay independently deletable.
- **Whole explanation is one request.** Recommendation chunking is the five-recommendation limit; there is no paging.
- **No separate `REVIEW_WITH_AI` sequence action.** The explanation card covers sequences and Tasks alike.
- **Session status is unchanged.** 020B's `FACTS_READY` is represented by the session plus `ai.explanation` being absent, running or failed.
- **Explanation text is stored** (R3, with the session) because the user must be able to reread it; it contains no user text by construction of the context.
- **The sample explainer is the default** and is labelled «نمونه» in the client.
- **Shared runtime.** The call discipline of STEP-09 was extracted unchanged into `AiOperationRunner`, and the wrapper removal and strict parse into `AiOutputText`, used by both families.
- **Kill-switch audit** covers `RECONCILE` and `RECONCILE_RETRY` in the same log line as STEP-09.
- **`auth-e2e.ps1` now pins both AI providers to `mock`.** The isolated browser backend runs as Development and otherwise picks up a real provider from the developer's user-secrets.

## Verification evidence

- [Gate and context tests](../backend.Tests/ReconcileExplanationGateTests.cs): only rule-matched decisions, no free text or identifier in the context or the rendered request, an all-mandatory budget; a session without a rule match; evidence hashes that follow facts and ignore titles and position; a valid output and its allowed repairs; incomplete answers; unknown fields, types, rules and actions including completion; a protected Drop alone or inside a bulk, an unmatched rule, mixed owners and kinds, a reused unit, too many recommendations; digits, percent signs, markup and links; the sample explainer inside the same rules.
- [Runtime tests](../backend.Tests/AiReconcileRuntimeTests.cs), through the real adapter, renderer, gate and controls with only the HTTP transport scripted: one tool-free non-streamed call over structured evidence and a metadata-only record; rejected outputs neither retried nor attached; each kill switch; family-separate switch, budget and circuit; one retry and never more than two calls; evidence too large; cancellation; the dependency rule.
- [PostgreSQL/API tests](../backend.Tests/AiReconcileModuleTests.cs): no request without a rule match; an explanation attached to rule-matched evidence, cross-user isolation, a widened request refused, an edited acceptance applied only through the confirmed preview with its events; an accepted recommendation whose confirmation is stale, an outdated recommendation, a declined one, and the manual path afterwards; the facts stored with a recommendation and the command result linked to it, succeeded and conflicted; unanswered recommendations expiring when replaced and when the session ends; invalid and failing explainers leaving the session usable; a cancelled explanation and one for a closed session never attached; the kill switch and daily limit over HTTP with deterministic Reconcile still working; a model-backed explanation through the API with its `AiInvocations` rows.
- [Migration round trip](../backend.Tests/DeliveryMigrationTests.cs) from the Step 9 baseline through both Step 10 migrations, including the one-running-per-session index, the outcome, disposition, target and evidence constraints, and a down migration with an expired recommendation.
- [Reconcile page tests](../frontend/src/features/reconcile/components/ReconcilePage.test.tsx): the explanation offered as an option with its disclosure, rule and AI text shown apart, a Task left out before the ordinary preview, Tasks named from the recommendation itself, a date asked before a recommended move, the facts beside each Task or sequence, accepted shown as applied only when the command succeeded, declining, cancelling, and failed, rate-limited, outdated and switched-off states with the lanes still present.
- [Browser acceptance](../frontend/e2e/reconcile.spec.ts): the lane visible first, an explanation requested, its recommendation previewed with a chosen date, confirmed, and the Task moved once.
- Verified 2026-10-08: `./dev.ps1 check` passed with 204 backend tests (2 skipped: the two real-provider smokes) and 54 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 12 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes. The explanation screenshot was inspected.

- Real-provider run, 2026-10-08, model `deepseek-v4-flash` (thinking disabled), by the owner through the UI with `Ai:Reconcile:Provider` set to `deepseek`, on two Tasks overdue for more than seven days that were inserted into the development database for the test:
  - One `AiInvocations` row: family `RECONCILE`, sequence 1, outcome `SUCCEEDED`, no gate, no repair rule; 1,120 input / 151 output tokens in 2.2 s; recorded cost 518 millionths of a dollar at the configured prices.
  - The explanation (`reconcile.explanation`) became `READY` with a 142-character summary and one consolidated recommendation: rule `R2`, `REPLAN_TASKS`, both Tasks. Its text contained no digit and named no cause.
  - The owner previewed it, chose a date and confirmed: `RECONCILE_RECOMMENDATION_PRESENTED` (system), then `RECONCILE_RECOMMENDATION_ACCEPTED` (user) and two `TASK_CARRIED` events (user) in one transaction; both Tasks moved to the chosen date.
  - The card showed «اختیاری», not «نمونه». This run was made before statements 29–31 existed, so that recommendation has no stored facts and no command-result link.

## Not covered by this evidence

- **One real-provider call.** Only a single successful explanation was made against the real provider; the env-gated test `Real_provider_smoke_returns_an_explanation_that_passes_the_gate` was not run (`TIDYSENSE_AI_SMOKE_KEY` was not set). How often the model keeps to the no-digit rule and the reference rules, and every failure path against the real provider, are unknown.
- There is no evaluation set for the prompt, and the forbidden-rationale boundaries (motivation, capacity, judgement) are stated in the system prompt only; the gate cannot check the meaning of Persian text.
- Timeouts, the spend-cap latch and the concurrency limit are covered for this family only through the shared runner's STEP-09 tests.
- Explanations of sessions that are never reopened are not swept; `RUNNING` rows of a lost process are closed only when their session is read.
- H2 queries are described above but not written or reproduced; the metric dictionary belongs to STEP-11.
- Screen-reader and keyboard behaviour of the card was exercised only through role-based automated tests.
- The `Reconcile` freeze-register rows remain `DRAFT`.
