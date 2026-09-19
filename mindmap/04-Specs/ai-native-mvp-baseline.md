# AI-Native MVP Baseline

## Status

Completed for Discussion 022 Workstream C and accepted as the current scope authority for M1–M8 implementation planning.

This baseline defines the smallest coherent MVP that preserves the accepted `Plan → Execute → Adapt` thesis. The authority conditions recorded during Workstream C were subsequently satisfied by the final Discussion 022 resolution: Mind Map verification, formal-document reconciliation, ownership, source-of-truth freeze, and milestone planning gates are complete. Detailed behavior remains subordinate to its owning closed discussion, and M1 execution still requires its recorded owner and configuration approvals.

Decision-level traceability is maintained in [[02-Decisions/accepted-decision-inventory-001-021]]. Source discussions remain authoritative for detailed semantics.

---

## 1. Target Pilot User

The accepted discussions define a functional need state rather than a demographic diagnosis.

The pilot is for participants who:

- bring a real goal, direction, responsibility, or planning intention,
- benefit from help turning ambiguity into a credible short-horizon plan,
- are willing to review and explicitly confirm AI-assisted proposals,
- can use Today to record execution reality,
- may experience plan drift and need understandable, user-controlled adaptation,
- consent to a bounded, monitored pilot and its evidence collection.

The product must not infer diagnosis, motivation, capacity, personality, or Goal achievement from this need state.

Operationally, the retained authentication baseline currently requires an Iranian mobile number. Supported pilot locale, participant criteria, exclusions, consent language, and localized crisis resources must be locked before recruitment; they are pilot configuration, not hidden product targeting.

---

## 2. Core Product Promise

```txt
Turn an intention into a credible plan,
help the user execute it in Today,
and reduce real plan drift into fewer understandable,
user-approved adaptation decisions.
```

The complete MVP loop is:

```txt
Goal or intention
→ bounded Planning conversation
→ validated structured PlanningDraft
→ user review and explicit confirmation
→ deterministic canonical commit
→ Today execution through Tasks and RoutineOccurrences
→ deterministic Reconcile facts, eligibility, severity, and rules
→ optional bounded AI explanation and recommendation
→ user-confirmed adaptation
→ commit-time revalidation, transaction, events, and CommandResult
```

Planning is the first-value engine. Reconcile is not deferred; it is the adaptation engine required to complete the MVP thesis.

---

## 3. Baseline Status Vocabulary

- `MVP_REQUIRED` — visible product or correctness behavior required for the coherent loop.
- `PILOT_REQUIRED_NON_PRODUCT` — instrumentation, safety evidence, operations, governance, or tooling required before pilot exposure.
- `POST_PILOT` — explicitly deferred capability that is not required for the pilot thesis.
- `REMOVED` — excluded from the current baseline and forbidden to enter implementation by assumption.
- `UNRESOLVED` — an implementation or pilot value that requires an explicit owner and gate before use.

---

## 4. Final MVP Baseline Matrix

Each row has exactly one owning authority. In the `Primary authority; required dependencies` column, the first linked source is the primary authority for that baseline row. Any later linked sources are required dependencies or refinements and may not silently replace the primary owner's semantics. Detailed field ownership remains governed by [[02-Decisions/accepted-decision-inventory-001-021]].

| ID | Capability or boundary | Status | Primary authority; required dependencies | Mind Map section | Milestone | Pilot gate |
|---|---|---|---|---|---|---|
| `B-01` | Complete `Plan → Execute → Adapt` loop | `MVP_REQUIRED` | [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]]; [[01-Closed-Discussions/011-ai-native-mvp-scope-and-mindmap-update]] | Product Vision; MVP Core Loop | M0–M7 | H1 and H2 must both be measurable |
| `B-02` | Functional pilot participant profile and consented bounded cohort | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]]; [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | Product Vision; Traction Metrics | M0, M8, M9 | recruitment, consent, exclusions, and locale locked |
| `B-03` | OTP identity, secure JWT cookie, ownership, and session revocation | `MVP_REQUIRED` | [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]; [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]] | User Flow; AI Guardrails; Implementation | M1 | auth/security integration and production-profile tests pass |
| `B-04` | Manual creation and manual fallback remain available | `MVP_REQUIRED` | [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]; [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]] | MVP Core Loop; User Flow | M2, M4–M7 | Manual Escape Success meets locked threshold |
| `B-05` | Canonical Goal, Project, Task, Routine, and RoutineOccurrence model; no canonical Plan | `MVP_REQUIRED` | [[01-Closed-Discussions/012-core-product-model]]; [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]] | Data Model; Current Decisions | M1–M3 | ownership/lifecycle/database invariant tests pass |
| `B-06` | Active temporal visibility, explicit Backlog, date provenance, and review/execution distinction | `MVP_REQUIRED` | [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]; [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]; [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]] | MVP Core Loop; User Flow; Data Model | M1–M6 | timezone, capping, provenance, and zero-added-question tests pass |
| `B-07` | Global/contextual/manual Planning entry with bounded clarification and safety exit | `MVP_REQUIRED` | [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]] | User Flow; AI Responsibilities | M4–M5 | reviewable draft reachability and crisis routing pass |
| `B-08` | Structured, editable PlanningDraft with justified hierarchy, limits, warnings, and seven-day detailed horizon | `MVP_REQUIRED` | [[01-Closed-Discussions/014-ai-planning-output-contract]]; [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]] | MVP Core Loop; User Flow; AI Guardrails | M4–M5 | H1 reviewable/useful/non-trivial draft gates pass |
| `B-09` | Specific preview, warning acknowledgement, explicit confirmation, expected versions, and commit-time revalidation | `MVP_REQUIRED` | [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]; [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]; [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]] | MVP Core Loop; AI Guardrails; Current Decisions | M2, M4, M6–M7 | zero unauthorized/stale-confirmation mutation |
| `B-10` | Today as derived execution-only view | `MVP_REQUIRED` | [[01-Closed-Discussions/015-task-and-routine-execution-model]]; [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]] | MVP Core Loop; User Flow | M2–M3 | complete end-to-end execution slice passes |
| `B-11` | Task complete, Drop, Carry, Restore, correction, history, and overdue semantics | `MVP_REQUIRED` | [[01-Closed-Discussions/015-task-and-routine-execution-model]]; [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]] | User Flow; Current Decisions; Data Events | M2, M6–M7 | lifecycle, correction, reversibility, and event tests pass |
| `B-12` | Routine definition, daily occurrence identity, effective local dates, stop, continuation, and execution | `MVP_REQUIRED` | [[01-Closed-Discussions/015-task-and-routine-execution-model]]; [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]] | User Flow; Data Model; Data Events | M3 | recurrence/timezone/uniqueness tests pass |
| `B-13` | Deterministic Reconcile facts, eligibility, cleanup, severity, prompt suppression, and permanent Today access | `MVP_REQUIRED` | [[01-Closed-Discussions/016-reconcile-trigger-and-severity]] | MVP Core Loop; User Flow; Current Decisions | M6 | H2 deterministic availability and severity tests pass |
| `B-14` | Separate commitment-review lane, grouped checkpoints, and bounded Goal Continuation | `MVP_REQUIRED` | [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]; [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]] | User Flow; AI Guardrails | M6 | no review/severity conflation or repeated-prompt violation |
| `B-15` | Rule-gated AI Reconcile explanation and recommendation over structured deterministic evidence | `MVP_REQUIRED` | [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]; [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]; [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]] | AI Responsibilities; AI Guardrails | M7 | H2 comprehension, application, regret, and manual-escape gates pass |
| `B-16` | Protected-item filtering, bulk preview, parent consequence disclosure, and reversible adaptation | `MVP_REQUIRED` | [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]; [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]] | User Flow; AI Guardrails | M6–M7 | zero protection bypass and partial bulk mutation |
| `B-17` | Explicit AI failure, cancellation, late-result discard, degraded state, retry boundary, and manual continuation | `MVP_REQUIRED` | [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]; [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]; [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]] | User Flow; AI Guardrails | M4–M7 | failure visibility and Manual Escape Success pass |
| `B-18` | Domain safety, minimal context, hostile-input isolation, crisis fallback, and zero crisis leakage | `MVP_REQUIRED` | [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]; [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | Product Vision; AI Guardrails | M5, M7, M9 | Crisis Safety Readiness hard gate passes |
| `B-19` | Optimistic concurrency, idempotency, scoped locks, all-or-nothing bulk, staged parent transitions, and transactional outbox | `MVP_REQUIRED` | [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]] | Data Model; Data Events; Implementation | M1 onward | concurrency, replay, atomicity, and outbox tests pass |
| `B-20` | Semantic events and linked proposal, confirmation, session, rule, recommendation, operation, and CommandResult evidence | `MVP_REQUIRED` | [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] | Data Events; Traction Metrics | M1 onward | every H1/H2 denominator reproducible from accepted events |
| `B-21` | Retention classes, access boundaries, privacy deletion, restricted crisis data, and raw-content minimization | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] | AI Guardrails; Data Events; Implementation | M1, M5, M8–M9 | privacy/retention/access review passes |
| `B-22` | Provider-neutral AI ports, bounded/versioned context builders, Context Scope Manifest, and no model tools | `MVP_REQUIRED` | [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]; [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] | AI Responsibilities; AI Guardrails | M5, M7 | architecture, no-tool, and context-scope tests pass |
| `B-23` | Explicit API resources, immutable revisions, polling, errors, frontend state machines, refresh, and lost-response recovery | `MVP_REQUIRED` | [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]] | User Flow; Current Decisions | M4–M7 | contract, reconnect, cancellation, and duplicate-invocation tests pass |
| `B-24` | Strict output validation, allowlisted repair, bounded retry/timeout/rate/circuit controls, pinned artifacts, and spend caps | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]] | AI Guardrails; Implementation | M5, M7, M9 | reliability/adversarial tests and provider hard-cap verification pass |
| `B-25` | H1/H2 instrumentation, metric dictionary, denominator mapping, immutable severity segmentation, and analysis package | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | Traction Metrics; Data Events | M8 | thresholds/classifiers lock before outcome review |
| `B-26` | Crisis corpus, localized resources, restricted observability audit, and Product + Safety + Engineering sign-off | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | AI Guardrails; Implementation | M8–M9 | whole-pilot crisis hard gate passes |
| `B-27` | Monitoring, incident response, support, kill-switch, rollback, spend-cap, and pilot-auth runbooks/drills | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]; [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]; [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] | Implementation / Delivery Plan | M8–M9 | readiness checklist and drills pass |
| `B-28` | Decision-to-Canvas, spec, code, event, test, and gate traceability | `PILOT_REQUIRED_NON_PRODUCT` | [[01-Closed-Discussions/022-updated-mvp-implementation-plan]] | All sections | M0 onward | no accepted decision or metric lacks implementation evidence |

---

## 5. Canonical Model and Lifecycle Baseline

### Goal

- Desired real-world outcome.
- May own Projects, Tasks, and Routines.
- Achievement or abandonment is user-authorized and never inferred from activity.
- Active Goal retains a review checkpoint and bounded continuation cadence.

### Project

- Bounded effort that may belong to one Goal.
- May own Tasks and Routines.
- Completion/stop requires explicit active-child resolution and preserves history.

### Task

- One-time executable item owned by Goal, Project, or neither.
- Active placement is `SCHEDULED` or `BACKLOG` with an execution or review checkpoint.
- Complete, Drop, Carry, Restore, and correction preserve identity and audit history.

### Routine

- Recurring intent owned by Goal, Project, or neither.
- Uses explicit recurrence timezone and inclusive effective local-date bounds.
- Stop is terminal; continuation creates a new linked Routine.

### RoutineOccurrence

- Daily execution fact identified by `(routineId, scheduledLocalDate)`.
- At most one occurrence per Routine per local day.
- Resolves from `PENDING` to `DONE` or `MISSED`; never carries forward as debt.

---

## 6. Authority and Mutation Baseline

```txt
AI output
≠ permission

user confirmation
≠ successful mutation

accepted recommendation
≠ applied recommendation
```

Every consequential mutation requires:

1. authenticated ownership and permission evaluation,
2. current canonical state and expected versions,
3. a specific server-authoritative preview,
4. visible consequences, warnings, and selected entity set,
5. explicit user confirmation,
6. immediate commit-time revalidation,
7. deterministic transactional mutation,
8. durable event intent and authoritative CommandResult.

---

## 7. Pilot Evidence and Decision Baseline

### H1 — AI-Assisted Creation

The pilot must establish whether users can reach a useful, credible, non-trivial first plan through bounded AI assistance. Evidence includes reviewable-draft reachability, usefulness, edited/unchanged disposition, deterministic application, trust comprehension, time to draft, and regret/reversal.

### H2 — AI-Assisted Reconcile

The pilot must establish whether users can reduce unresolved work into fewer understandable, user-approved decisions while deterministic facts and mutation authority remain intact. Evidence includes severity-segmented availability, recommendation disposition, application, unresolved-work reduction, understanding, manual escape, and regret/reopening.

### Hard-gate rule

Safety, privacy, reliability, authorization, event completeness, and manual-escape gates override positive H1/H2 conversion or productivity metrics. An inconclusive result is not weak success and does not authorize broad rollout.

---

## 8. POST_PILOT Register

These capabilities are not required for the pilot and require an explicit later decision before implementation:

| Capability | Status | Reason/source boundary |
|---|---|---|
| Multiple daily slots within one Routine | `POST_PILOT` | MVP uses separate named Routines per daily slot. |
| Broader recurrence patterns and advanced scheduling | `POST_PILOT` | Daily occurrence and bounded recurrence semantics are sufficient for MVP. |
| Automatic cross-provider fallback | `POST_PILOT` | Forbidden in pilot by Discussion 020C. |
| Model tool/function calling | `POST_PILOT` | Forbidden in MVP by Discussion 020A. |
| Refresh tokens and per-device session management | `POST_PILOT` | Excluded by retained authentication baseline. |
| PWA/offline-first behavior | `POST_PILOT` | Old decisions were not retained; requires a new current decision. |
| Permanent deletion/archive UX and advanced recovery | `POST_PILOT` | MVP preserves history and uses bounded reversible actions. |
| Calendar integration, exact time blocks, reminders, and Task dependency graph | `POST_PILOT` | Not required for the accepted product thesis. |

---

## 9. REMOVED Register

The following must not enter the MVP through legacy code, a stale spec, client convenience, or provider capability:

- canonical persisted Plan,
- old Goal/Task-only product model,
- Done/Carry/Drop-only Reconcile flow,
- stored derived Goal progress or inferred Goal achievement,
- stored `carryCount` as the source of truth,
- generic opaque update events without meaningful changed fields,
- direct AI mutation, repository access, command execution, or hidden tools,
- partial or invalid AI output as a reviewable resource,
- fuzzy or intent-changing repair,
- raw/free-text or imported-content Reconcile context,
- automatic lifecycle inference from silence, inactivity, emotion, motivation, or assumed capacity,
- ordinary analytics or personalization based on crisis records,
- client-supplied authorization, consequence, version, or completion authority,
- partial-success bulk mutation,
- automatic provider fallback during the pilot,
- implementation sequencing from the legacy Phase 1 plan.

---

## 10. UNRESOLVED Configuration Register

These values need explicit owners and deadlines. They do not reopen product semantics.

| Configuration package | Required output | Blocking gate |
|---|---|---|
| Pilot cohort, consent, locale, observation window, minimum exposures | signed pilot protocol | recruitment/M9 |
| H1/H2 thresholds, classifiers, exclusions, decision matrix inputs | signed threshold-lock package | analysis start |
| Crisis resources, localization, corpus, reviewer identities | Crisis Safety Readiness package | any real-user AI exposure |
| OTP/JWT/SMS operational values | production auth configuration record | pilot auth gate |
| Provider/model/artifact selection and budgets | pinned runtime artifact bundle | M5 real-provider enablement |
| Retry, timeout, rate, circuit, token, and spend limits | reliability/cost configuration | M5/M7/M9 |
| Retention duration, deletion/anonymization, and legal basis | privacy/retention schedule | data collection/pilot |
| UX chunk size, Undo duration, and final copy | reviewed UX contract | affected slice lock |
| Framework/package versions and migrations | technical foundation and migration plan | M1 slice lock |
| Owners, incident/support paths, rollback and kill-switch drills | operational readiness package | M9 |

---

## 11. Scope-Cut Rule

A cut is invalid when it removes any of:

- manual planning fallback,
- Today execution,
- deterministic Reconcile,
- explicit confirmation and commit-time revalidation,
- crisis fail-closed behavior,
- manual escape from AI failure,
- events required for H1/H2 and hard gates,
- Planning while retaining only Adapt,
- Adapt while retaining only Planning.

Any such cut requires reopening its authoritative discussion rather than editing this baseline silently.

---

## 12. Baseline Completion Result

- Every `MVP_REQUIRED` capability has an authoritative source and implementation milestone.
- Every `PILOT_REQUIRED_NON_PRODUCT` item has a blocking gate.
- Deferred and removed work is explicit.
- No product-semantic conflict or open question remains across Discussions 001–021.
- Remaining `UNRESOLVED` items are configuration, evidence, ownership, legal, or rollout packages governed by Discussion 022 and its implementation/readiness packages.

Workstream C is complete. Discussion 022 subsequently completed the migration ledger, Canvas migration, repository-wide reconciliation, cross-role verification, source-of-truth freeze, implementation planning, and final closure. The next operational step is M1 owner and configuration approval through [[05-Implementation/m1-entry-package]] and [[05-Implementation/m1-configuration-register]].

---

## خلاصهٔ فارسی

Baseline نهایی MVP حلقهٔ کامل `Plan → Execute → Adapt` را الزامی می‌کند. کاربر نیت یا هدف واقعی خود را وارد می‌کند، AI یک PlanningDraft محدود و ساختاریافته پیشنهاد می‌دهد، کاربر آن را بازبینی و تأیید می‌کند، سیستم تغییرات را به‌صورت deterministic ثبت می‌کند، Today اجرای واقعی را نشان می‌دهد و Reconcile بر اساس facts و ruleهای قطعی، adaptation قابل‌فهم و قابل‌تأیید پیشنهاد می‌کند.

موجودیت‌های canonical شامل Goal، Project، Task، Routine و RoutineOccurrence هستند. AI هیچ اختیار مستقیم برای mutation ندارد و confirmation نیز بدون revalidation و CommandResult به معنای موفقیت نیست. manual fallback، Today، deterministic Reconcile، crisis fail-closed، eventهای لازم برای validation و مسیر خروج از خرابی AI قابل حذف نیستند.

قابلیت‌های ضروری محصول، الزامات غیرمحصولی pilot، موارد post-pilot، موارد حذف‌شده و configurationهای حل‌نشده جدا شده‌اند. هر قابلیت منبع، بخش Mind Map، milestone و pilot gate مشخص دارد. شرایط authority این baseline توسط بسته‌شدن Discussion 022 و تکمیل migration و verification برآورده شده‌اند؛ مرحلهٔ فعلی تأیید owner و configurationهای M1 برای شروع اجرای کنترل‌شده است.