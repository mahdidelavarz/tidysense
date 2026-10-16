# Step 9 AI Planning Runtime Acceptance Contract

**Status:** Implemented and verified with a scripted provider on 2026-10-03, and against the real provider on 2026-10-08. This contract applies to the model-backed planning generator, its output gate and runtime controls, the clarification turns and the AI operation record. Everything from attempt to apply stays as in `step-08-planning-acceptance.md` unless stated here.

## Canonical behavior

### Boundary

1. The planning generator is still the port `IPlanningGenerator`. `Ai:Planning:Provider` selects the deterministic sample generator (`mock`) or the model-backed `AiPlanningGenerator` (generator key `planning.standard`).
2. A provider is reached only through `IAiCompletionClient`: one system message and one user message in, text out. The request never contains a tool, function or connector definition, is never streamed, and an answer containing a tool call is rejected.
3. The prompt renderer and the output gate are pure: they read their arguments and nothing else. No AI component depends on the database, a command or a service; a reflection test fails otherwise.
4. Model output creates nothing. It becomes a draft revision, questions or a blocked-input notice; canonical entities are created only by the confirmed apply command of STEP-08.

### Input

5. Instructions live only in the system message. Everything written by the user or copied from product state (intention, answers, titles, planning details) is sent as JSON inside one delimited data block of the user message; characters that could close the block are escaped. Canonical ids are never sent.
6. The context is the one built for the attempt (STEP-08 statements 35–37). When the request exceeds `MaxInputTokens`, only history is reduced, in this order: the completed-task titles of the previous seven days, then the whole previous-seven-days summary. The reduction is recorded.
7. When the mandatory part alone does not fit, no call is made and the attempt fails with `CONTEXT_TOO_LARGE`. The mandatory part is never truncated.

### Output gate

8. An output is usable only if it passes, in order: transport completeness (finish reason `stop`, non-empty, at most 60,000 characters), the allowlisted wrapper removal, strict parsing, schema, policy, and the structural rules of every draft (STEP-08 statements 10–11). Any failure rejects the whole output.
9. Allowed repairs, each recorded by rule id: `REMOVE_UTF8_BOM`, `TRIM_SURROUNDING_WHITESPACE`, `REMOVE_SINGLE_JSON_CODE_FENCE`, `NORMALIZE_KNOWN_ENUM_CASE` (exact match ignoring letter case only), `NORMALIZE_YEAR_FIRST_DATE_SEPARATOR` and `PAD_YEAR_FIRST_MONTH_OR_DAY` (four-digit year first, numeric, calendar-valid). Nothing is invented, dropped, reparented or reclassified.
10. An unknown field, a duplicated property name, a wrong type, an unknown enum value or a date in any other form fails the schema. A review date supplied by the model is an unknown field.
11. A recurrence type outside the supported three is kept as written and never converted. Since STEP-22 the Routine is asked for again and otherwise left out (statement 13c); before, it was blocked in review (`UNSUPPORTED_RECURRENCE`).
12. The planning window, the review-date defaults and the context fingerprint are the server's; the model does not supply them.
13. A rejected output is never used, in whole or in part. When it failed parsing, the schema, the policy or the structural rules, the same request is sent once more with a `CORRECTION` section added to the system message; a second rejection, or a rejection that cannot be corrected (an incomplete response), ends the attempt with `DRAFT_INVALID`. (Owner decision of 2026-10-09; it replaces "a rejected output is not retried".)
13a. The correction is written by the gate: the path of the field (`draft.proposals[2].plannedDate`), the rule and the allowed values. It never repeats a field name or a value from the rejected output, so no model or user text becomes an instruction. It is at most 1,500 characters, is logged with the rejection, and is not stored. If the corrected request no longer fits `MaxInputTokens`, it is not sent.
13b. The system message states the shape exactly (closed value lists, required fields, date and time forms, number types, id references), so that the first answer passes.
13c. *(STEP-22, Discussion 029 §8.)* A well-formed draft that the user could not approve as handed over is a rejected output (gate `SEMANTIC`). This covers a blocking review issue of any item, or of the whole draft, judged with every item included, an empty Goal or Project among them. Its correction names each item by position (`draft.proposals[3]`) and the rule in the gate's words, and never repeats a title.
13d. With the rejection, the gate builds the same draft without those items:
    - each removed item takes everything under it;
    - a fact goes with its scope;
    - notes and warnings about removed items go too;
    - a sequence left with one member loses its order;
    - the removed items are listed in `removedItems` (entity type and title; a fact has no title).

    Nothing is re-dated, re-typed or re-parented.
13e. This reduced draft is used when no answer is asked for again, or when the answer asked for again is unusable, including a transient failure of that call. Its call is recorded `SUCCEEDED` with repair rule `REMOVE_INVALID_ITEMS`. `DRAFT_INVALID` remains only when nothing would be left, when the whole draft is at fault, or when no reduced draft exists. This replaces "a rejected output is never used, in whole or in part" for this one case: the gate, not the model, decides what is left.
13f. *(STEP-22.)* Other slips the gate cures the same way: asked for again once, and otherwise handled by the gate as follows.
    - **An invalid sequence** loses only its order, without a resend (`DROP_INVALID_SEQUENCE`).
    - **Too many Goals, Projects, Tasks, Routines or proposals:** the later items are left out and named.
    - **A planning detail that breaks the catalogue** (`FACT_INVALID`) is left out and named.
    - **Notes and warnings** that break their rules or limits are dropped; they are not items.
    - **A first week with more than 21 occurrences** loses its last Routines, then its last dated Tasks, named.
    - **A Persian date in the text** of a draft or of questions that names a day its month does not have, or a weekday that is not that date's weekday (`PlanningTextDates`), is asked for again; otherwise the text is kept as written.

    A repeated `draftId`, a wrong type or an unknown field still rejects the whole output.
13g. *(STEP-24 and its follow-up, 029 §3 notes.)* These rules apply to a draft planned inside a Goal or Project, mostly to the next week.
    - **A Task that repeats an open Task** of the scope (same title, ignoring spaces and ZWNJ) is left out without a resend (`DROP_DUPLICATE_TASK`). **A Routine that repeats an active Routine** is treated the same way (`DROP_DUPLICATE_ROUTINE`).
    - **An existing Task given a day** (`existingTaskRef`) is read for its date only. A parent, a sequence or another Project on it is not read, and the Task keeps its own place (`KEEP_EXISTING_TASK_PLACE`). An unknown ref, or the same Task twice, rejects the output.
    - **A next week that asks more than one question, or asks about availability** (CONSTRAINT, RECURRENCE), is a policy rejection asked for again, so the model drafts instead.
    - **A next week that proposes a new Project** while the Goal has active Projects is asked for again. Otherwise the new Project is left out and named, with its Tasks.
    - **The calendar** also gives the seven days after the window (`afterWindow`). A day the user names just beyond the window then has its real Persian date; before this, «جمعه» on a Friday was written «جمعه ۳۰ مهر» (a Thursday).

### One logical operation

14. An operation makes at most two provider calls: the first and one retry. The retry follows a transient failure (connection failure, call timeout, HTTP 408/429/5xx) or a correctable rejected output (statement 13), and only while `Ai:Planning:RetryEnabled` is true. A retry spent on a transient failure leaves none for a rejection. The second row records the reason in `RetryReason`. There is no other retry at any layer.
15. Provider, model, prompt, schema, context-builder and repair-policy versions are fixed for the whole operation. There is no fallback to another provider or model.
16. Before every call, the retry included, these are checked against the current configuration: global, planning and provider kill switches; the spend-cap latch; the circuit; the daily budget. A blocked operation makes no call.
17. Each call runs under `InvocationTimeoutSeconds` inside `OperationDeadlineSeconds`; connecting is limited by `ConnectionTimeoutSeconds`. A call that times out may be retried; the deadline ends the operation.
18. The circuit is per provider and output family. Only provider-availability failures move it. After `CircuitFailureThreshold` consecutive failures no call is made for `CircuitOpenSeconds`; then one call is let through.
19. The daily budget is the day's recorded cost (UTC day) plus the estimated cost of the next call, from the configured token prices, against `DailyBudgetUsd`.
20. HTTP 402 from the provider is its hard spend cap: no retry, calls stop for `SpendCapLatchMinutes`, and a critical log line `AI_PROVIDER_SPEND_CAP_REACHED` is written.
21. Concurrent calls are limited by `MaxConcurrentInvocations`.

### Attempt

22. Starting an attempt while the global or the planning kill switch is on returns `503 PLANNING_AI_UNAVAILABLE` and stores nothing. Manual creation is unaffected.
23. A user may start `AttemptsPerUserPerHour` and `AttemptsPerUserPerDay` distinct attempts; beyond that the request returns `429 AI_RATE_LIMITED` with `Retry-After`. A replay of the same `clientAttemptId` is answered and not counted.
24. Additional failure codes: `AI_UNAVAILABLE` (kill switch, open circuit or missing configuration when the operation ran), `AI_BUDGET_EXHAUSTED` (daily budget or provider spend cap), `CONTEXT_TOO_LARGE`. `PROVIDER_ERROR`, `GENERATION_TIMEOUT` and `DRAFT_INVALID` keep their meaning. Internal failure classes are not exposed.
25. Cancelling an attempt cancels the provider call in flight. A result that arrives anyway is discarded as before.

### Clarification

26. A succeeded attempt has an outcome: `DRAFT`, `CLARIFICATION` or `INPUT_BLOCKED`. Attempt statuses are unchanged. Only `DRAFT` has a draft.
27. A clarification has one to four questions (three before STEP-22), at most 300 characters each, and an optional message of at most 500 characters, used to state a boundary. A blocked input has a reason (`TOO_VAGUE`, `CONTRADICTORY`, `UNSUPPORTED_REQUEST`, `MISSING_CONSTRAINT`) and a message.
28. Answering is a new attempt with `previousAttemptId`. It takes the intention and the planning context from the attempt that asked, whatever the request sends. Answers belong to that attempt's questions, are at most 500 characters, and at least one is required unless `draftNow` is sent.
29. A clarification is answered once (`409 CLARIFICATION_ALREADY_ANSWERED` otherwise) and only by its owner. An attempt without questions cannot be answered (`422 CLARIFICATION_NOT_PENDING`).
30. A flow has at most three clarification turns. On the fourth request, or with `draftNow`, the generator is told not to ask; a question returned anyway fails the attempt with `DRAFT_INVALID`.
31. Questions that are the user's latest planning activity and less than 24 hours old are returned by `GET /planning/active` as `clarification`. They do not block a new flow; starting one abandons them.
32. `GET /planning/active` also returns `sampleGenerator`, so the client never presents a sample draft as model output and says when text is sent to an AI service.

### Record

33. Every provider call, and every operation that was blocked before a call, writes one `AiInvocations` row (R4) and one structured log line. Fields are listed in `backend/logging-observability.md`. No prompt, response or user text is stored.

### Questions with options (STEP-18, Discussion 028 §2; amended by STEP-22, Discussion 029 §7)

*Since STEP-22:*
- a question has no options or exactly two;
- the kinds are `TIMING`, `RECURRENCE`, `CONSTRAINT`, `CONTENT`, `OWNERSHIP` and `CONTRADICTION` (`ENTITY_TYPE` removed, so the gate rejects it);
- the product-added free-text answer is «خودت بنویس», and its spellings count as an "other" option;
- a turn has up to four questions and four answers;
- the measurement events allow four items.

Statements 27a–28c below keep their STEP-18 wording otherwise.

27a. A question has `id`, `text` (1–300), `reason` (null or one line of 1–120), `kind` (`TIMING`, `RECURRENCE`, `CONSTRAINT`, `CONTENT`, `OWNERSHIP`, `ENTITY_TYPE`, `CONTRADICTION`), `options` (none, or 2–7 labels of 1–40 characters, one line each, all different once spaces, zero-width joiners and punctuation are ignored) and `multiple` (true only with options).
27b. The gate rejects the whole output for an unknown or missing kind, a broken option count or label, a duplicate label, `multiple` without options, or an option that only means "something else" or "write your own" (`PlanningClarificationRules.IsOther`: «چیز دیگر…», «سایر», «غیره», «خودم می‌نویسم», "Other" and their spellings). «نمی‌دانم» and «هیچ‌کدام» are real answers and pass. Its correction names the rule and never repeats a label. Labels are model output: the client shows them as plain text only.
28a. An answer is `{ questionId, options[], text }`: the zero-based positions of the chosen options, the «چیز دیگر…» text, or both. Positions must be offered by that question, each once, and at most one unless the question is `multiple`; otherwise `400`. An answer with neither is a skipped question. The server, not the client, turns positions into labels: the model receives each answer as `{ questionId, chosen[labels], text }`.
28b. Measurement (027 §5, 028 §2.5) is recorded as two R1 events with kinds, counts and positions only, never a label or a text: `PLANNING_CLARIFICATION_ASKED` (actor `SYSTEM_DETERMINISTIC`, aggregate the asking attempt; `flowId`, `turn`, `questions[{kind, optionCount, multiple}]`) when questions are stored, and `PLANNING_CLARIFICATION_ANSWERED` (actor `USER`; `flowId`, `turn`, `draftNow`, `answers[{kind, chosen[], other}]`, one per question asked, in order) when they are answered or skipped with «بدون پاسخ بساز». `PLANNING_DRAFT_CREATED` version 2 adds `flowId` and `clarificationTurns`. `flowId` is the first attempt of the flow, so the events of one flow still join after the attempts are purged (R3).
28c. Output schema `2026-10-14.1`, prompt `2026-10-14.1`. The prompt states the question shape, the kinds, when to offer options and that the program adds «چیز دیگر…» itself.
28d. *(STEP-22.)* Output schema `2026-10-15.1`, prompt `2026-10-15.1`, repair policy `2026-10-15.1`.
    - **Sequences:** Task proposals may carry `sequenceKey` and `sequenceOrder`. A sequence has two or more Tasks with one owner and distinct positive orders; otherwise it is `SEQUENCE_INVALID`. Apply creates one durable sequence per key from the approved Tasks, if two or more remain.
    - **Calendar:** the data block holds `calendar`, computed by the renderer with `PersianCalendar`. It has today and each window day with their Persian date, Persian weekday and ISO weekday, the end of this and the next Persian month, the next Nowruz, and the ISO numbers of the Iranian week.
    - **Prompt rules:** the dates of 029 §4 (target dates and deadlines up to 24 months ahead, planned dates and Routine starts inside the window); the structure meanings and the long-intention shape of 029 §5; the question rules of 029 §7.
    - **New draft rules:** `DATE_TOO_FAR` and `EMPTY_PARENT`; an undated Task whose deadline has passed is `DATE_IN_PAST`; a Routine starting after the window is `DATE_OUTSIDE_WINDOW`.

## API surface

- `POST /api/v1/planning/attempts` additionally accepts `previousAttemptId`, `answers[] { questionId, text }` and `draftNow`, and may return `429` and `503`.
- `PlanningAttemptDto` adds `outcome` and `clarification { questions[], blockReason, message, turn }`.
- `PlanningActiveDto` adds `clarification` and `sampleGenerator`.
- STEP-18: `PlanningQuestion` adds `reason`, `kind`, `options`, `multiple`; `answers[]` items add `options` (positions) and `text` becomes optional.

Persian UI terms: the questions screen is «سه پرسش کوتاه» (by count, up to «چهار پرسش کوتاه»), draft now is «بدون پاسخ بساز» (STEP-18; before, «همین حالا پیش‌نویس بساز»), the own-words answer is «خودت بنویس» (STEP-22; before, «چیز دیگر…»).

## Recorded deviations and assumptions

Confirmed with the owner on 2026-10-03 unless marked otherwise.

- **Provider:** DeepSeek V4 Flash through its OpenAI-compatible endpoint. Model id and base URL are configuration (`deepseek-v4-flash`, `https://api.deepseek.com`).
- **Thinking mode is switched off** for DeepSeek (`Ai:Providers:deepseek:DisableThinking`, sent as `thinking: disabled`). The field is sent only for a provider configured that way. *(Chosen during the smoke run on 2026-10-08.)*
- **JSON mode, not schema-constrained output.** The provider guarantees syntactically valid JSON only, so the local gate is the only schema authority.
- **Provider safeguards.** The provider has no separate moderation endpoint. Its content filter is honoured: a filtered answer is unusable. Product boundaries (no diagnosis, treatment, legal or financial strategy) are stated in the system prompt and are not otherwise enforced on the text of a draft.
- **No `DomainSafetyClassificationPort`.** The 2026-09-19 amendment removed the dedicated classifier and crisis route.
- **Provider-side hard spend cap is the prepaid account balance.** It must be kept low in the provider console; the application cannot verify its value.
- **Kill switches are configuration.** A change is audited as a log line with scope, value and time; the actor is the configuration source. A persisted switch with a named operator and reason belongs to STEP-11.
- **No separate response-start timeout.** Responses are not streamed, so the call timeout covers it.
- **Token estimate** is half the character count of the request, a deliberately high figure for Persian text; actual usage reported by the provider replaces it in the record.
- **`INPUT_BLOCKED` ends the flow.** The user rewrites the intention or goes manual; it cannot be answered (013 also allows returning to clarification).
- **Clarification with the sample generator** exists only through the development fixtures `clarify`, `clarify-always` and `input-blocked`.
- **No new product event** for a clarification, a rejected output or an AI failure; they are operational records. `PLANNING_DRAFT_CREATED` already names the generator.
- **Raw prompts and responses are not stored**, not even short-lived.
- **Sending text to the provider** is disclosed on the planning screen. Consent and data-location review for the pilot are STEP-12 matters. *(Not yet discussed with the owner.)* **Superseded by STEP-13 (Discussion 027):** no consent step and no disclosure line in planning; the privacy page discloses without naming the provider.
- **The generation timeout of the runner is 120 seconds and a lost attempt is failed after 3 minutes**, so the runtime's own deadline (100 seconds) is the one that reports.

## Verification evidence

- [Output gate tests](../backend.Tests/PlanningOutputGateTests.cs): a valid output with server-owned window and defaults; incomplete, empty, oversized and truncated text; wrapper removal and its limits; unknown fields, duplicate names and wrong types; exact versus fuzzy enum values; unsupported recurrence kept for review; year-first versus ambiguous or impossible dates; missing, duplicate and incompatible references, self-reference, cycle, two exclusive parents and limits; clarification and blocked-input bounds; a question when none is allowed.
- [Runtime tests](../backend.Tests/AiPlanningRuntimeTests.cs), through the real adapter, renderer, gate and controls with only the HTTP transport scripted: one tool-free non-streamed call with user text only in the data block; a metadata-only record; one retry under the same pinned configuration; never more than two calls; no retry for permanent failures; a rejected output asked for once more with the gate's correction, within the two-call limit and the retry switch, and never counted by the circuit; truncated, filtered, tool-calling and malformed answers; each kill switch; a switch set between call and retry; retry switched off; circuit open, blocked and released; budget precheck, earlier spend, and the spend-cap latch; context reduction order and mandatory-floor overflow; hostile text unable to close the data block or widen the schema; questions allowed and refused; call timeout versus operation deadline; cancellation; the dependency rule.
- [Planning PostgreSQL/API tests](../backend.Tests/PlanningModuleTests.cs): a clarification answered once by its owner and ending in a draft; three turns and `draftNow`; a blocked input; the kill switch and the rate limit over HTTP with manual creation still working; a model-backed attempt through the API (draft, output rejected twice, provider down, cancelled call) with its six `AiInvocations` rows and no canonical entity.
- [Migration round trip](../backend.Tests/DeliveryMigrationTests.cs) from the Step 8 baseline, including the outcome, clarification-turn, answered-once and call-sequence constraints.
- [Phase tests](../frontend/src/features/planning/types/planning.phase.test.ts) and [Planning page tests](../frontend/src/features/planning/components/PlanningPage.test.tsx): questions shown and answered as a continuation, resumed questions, draft now, edit, manual path, a blocked input, an unavailable and a rate-limited assistant.
- [Browser acceptance](../frontend/e2e/planning.spec.ts): questions before a draft, kept across a reload, answered, then the draft.
- Verified 2026-10-03: `./dev.ps1 check` passed with 171 backend tests (1 skipped: the real-provider smoke) and 51 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 11 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes. The clarification screenshot was inspected.

- Real-provider smoke, 2026-10-08, model `deepseek-v4-flash` with thinking disabled (`DisableThinking`, added that day because the provider reasons by default):
  - The owner ran one flow through the UI: an intention, three clarifying questions, answers, then a reviewable draft. Its two `AiInvocations` rows show outcome `SUCCEEDED`, sequence 1, no repair rule, no context reduction; 1,908 input / 164 output tokens in 2.2 s for the questions and 2,100 / 758 tokens in 4.7 s for the draft; recorded cost 770 and 1,540 millionths of a dollar at the configured prices (0.3 / 1.2 USD per million tokens). The attempts carry generator `planning.standard` and outcomes `CLARIFICATION` then `DRAFT`.
  - The env-gated test `Real_provider_smoke_returns_an_output_that_passes_the_gate` passed with the same key.
  - `GET /planning/active` on the running backend returned `sampleGenerator: false`.

## Not covered by this evidence

- Against the real provider only the successful paths were exercised. Cancellation, timeouts, the retry, the circuit, the kill switches and the 402 spend-cap response are verified with the scripted provider only; the 402 mapping follows the provider's documentation.
- The quality of drafts was judged on one flow by the owner. There is no evaluation set for the prompt.
- The token prices in tracked `appsettings.json` were `0` until 2026-10-08; they are now the DeepSeek prices of this run (0.3 / 1.2 USD per million tokens). An environment with another provider or other prices must set its own before the daily budget means anything.
- The audit line for a kill-switch change and the connection timeout have no automated test.
- Circuit state, the spend-cap latch and the concurrency limit are per process and reset on restart.
- The `Planning Attempt/Draft/revisions` freeze-register row remains `DRAFT`.
- Screen-reader and keyboard behaviour of the questions screen was exercised only through role-based automated tests.
