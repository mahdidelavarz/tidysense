# Accepted Decision Inventory — Discussions 001–021

## Status

Stack amendment (2026-09-19): `LEG-02` now reflects the repository's .NET 10/ASP.NET Core/EF Core backend. This changes the implementation technology, not the accepted product semantics.

Completed for Discussion 022 Workstream B.

This file is the authoritative navigation and decision-ID register for the accepted baseline. It does not replace the linked source discussions when implementation detail is required.

No product-semantic `UNRESOLVED` or `REQUIRES_REVIEW` item remains across Discussions 001–021. Remaining numeric, operational, legal, provider, and rollout values are listed in Section 6 and must be fixed before their applicable pilot gate.

---

## 1. Authority Rules

1. Clean files in `01-Closed-Discussions` are the source authorities.
2. [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] is the only active legacy input.
3. A more specific accepted amendment governs its narrow topic without replacing the rest of its parent discussion.
4. [[01-Closed-Discussions/017a-temporal-checkpoint-mind-map-impact-consolidation]] owns map migration wording only; [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]] owns product semantics.
5. Discussions 019A, 019B, and 019C respectively own canonical data, transactional mutation, and events/observability.
6. Discussions 020A, 020B, and 020C respectively own runtime boundaries, API/frontend state, and output reliability/cost.
7. Generated text, client state, analytics, and the current Mind Map never outrank canonical state or an accepted source decision.

---

## 2. Authoritative Discussion Index

| Family | Authoritative files | Ownership |
|---|---|---|
| 001–008 | [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] | narrowly retained compatibility, auth, API, technical, and pilot-operation decisions |
| 010 | [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]] | AI-native direction and product sequencing |
| 011 | [[01-Closed-Discussions/011-ai-native-mvp-scope-and-mindmap-update]] | scope umbrella, precedence, and navigation |
| 012 | [[01-Closed-Discussions/012-core-product-model]]; [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]] | product concepts, relationships, lifecycle, temporal visibility |
| 013 | [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]] | Planning entry, clarification, recovery, and safety exit |
| 014 | [[01-Closed-Discussions/014-ai-planning-output-contract]]; [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]] | PlanningDraft structure, review, limits, temporal fields |
| 015 | [[01-Closed-Discussions/015-task-and-routine-execution-model]]; [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]; [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]] | Today, Task, Routine, occurrence, local-date, and correction semantics |
| 016 | [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]; [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]] | Reconcile eligibility, severity, prompting, and review lane |
| 017 | [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]; [[01-Closed-Discussions/017a-temporal-checkpoint-mind-map-impact-consolidation]] | deterministic facts/rules, bounded AI actions, temporal map impact |
| 018 | [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]; [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]] | authority, confirmation, reversibility, failure, privacy, safety |
| 019 | [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]; [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]; [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] | persistence truth, mutation correctness, events and observability |
| 020 | [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]; [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]; [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]] | runtime, client contracts, validation, reliability, and cost |
| 021 | [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | hypotheses, metrics, hard gates, and pilot decisions |

---

## 3. Accepted Decision Register

### 3.1 Discussions 001–008 — Retained Legacy Boundary

| ID | Accepted decision |
|---|---|
| `LEG-01` | Anecdotes and social posts are discovery evidence, not causal proof; important claims retain source, date, and evidence type. |
| `LEG-02` | Amended technical baseline: React + TypeScript + Vite, C# + ASP.NET Core on .NET 10, Entity Framework Core + Npgsql + PostgreSQL, versioned REST under `/api/v1`, Docker/Nginx same-site deployment. |
| `LEG-03` | Phone-number OTP through SMS is the retained login/recovery mechanism; Iranian numbers normalize to unique E.164 identities. |
| `LEG-04` | OTP challenges are transactionally consumed from PostgreSQL, stored only as keyed digests, and concurrent user creation is protected by database uniqueness. |
| `LEG-05` | One application JWT in a secure cookie uses `sessionEpoch` for global revocation; no refresh-token or JavaScript-readable token storage exists. |
| `LEG-06` | Retained API conventions include JSON/camelCase, UTC instants, local dates, direct success bodies, RFC 9457 Problem Details, HTTP 400 validation, ownership-safe 404, and `/users/me`. |
| `LEG-07` | Development test-session access is local/test only; external health monitoring, pilot auth checks, generated OpenAPI drift detection, and operational revocation are required. |
| `LEG-08` | Initial state belongs to the creation event; the same create command must not emit a duplicate change event for that initial state. |

### 3.2 Discussions 010–011 — Direction and Authority

| ID | Accepted decision |
|---|---|
| `D010-01` | The MVP is an AI-native `Plan → Execute → Adapt` loop, not a manual Todo product with AI deferred until failure. |
| `D010-02` | AI-assisted Planning is the first-value engine; deterministic and AI-assisted Reconcile remain inside the same MVP as the adaptation engine. |
| `D010-03` | AI reduces decision space and explains proposals; the user owns consequential decisions. |
| `D010-04` | A specific preview, explicit confirmation, current-state revalidation, deterministic commit, and audit history are required for canonical change. |
| `D011-01` | Discussions 012–021 are the closed decision chain; Discussion 022 applies them to baseline, map, formal documents, and sequencing. |
| `D011-02` | Specific final resolutions and accepted amendments outrank umbrella drafts, legacy files, generated text, client state, and stale map nodes. |

### 3.3 Discussion 012 Family — Product and Time Model

| ID | Accepted decision |
|---|---|
| `D012-01` | Canonical concepts are Goal, Project, Task, Routine, and RoutineOccurrence; there is no persisted canonical Plan. |
| `D012-02` | Task and Routine have at most one owner: Goal, Project, or none; Project belongs to at most one Goal. |
| `D012-03` | Goal represents a desired real-world outcome; activity completion never proves Goal achievement automatically. |
| `D012-04` | Project is bounded work, Task is one-time execution, Routine is recurring intent, and RoutineOccurrence is historical execution fact. |
| `D012-05` | Terminal parent transitions require explicit child resolution and never silently infer a parent or Goal outcome. |
| `D012A-01` | Every ACTIVE entity has a derivable future temporal checkpoint; active work cannot become temporally invisible. |
| `D012A-02` | Goal review defaults and Project review defaults are deterministic, visible, editable, source-labelled, and capped by earlier target/deadline boundaries. |
| `D012A-03` | `nextTemporalCheckpoint` is derived; Backlog is explicit placement; `REVIEW_DUE` is distinct from `EXECUTION_OVERDUE`. |

### 3.4 Discussion 013 — Planning Conversation

| ID | Accepted decision |
|---|---|
| `D013-01` | Planning may begin globally, contextually, manually, or from a free intention; Goal creation is not mandatory. |
| `D013-02` | Clarification is asked only when it changes draft feasibility or structure, normally for at most three rounds; `Draft now` remains available. |
| `D013-03` | AI may not invent deadline, recurrence, ownership, or user capacity; conversation creates only a proposal. |
| `D013-04` | Active-draft replacement, cancel, retry, restart, failure, and manual fallback require explicit states. |
| `D013-05` | Crisis or immediate-danger input enters `SAFETY_FALLBACK`, stops Planning, and creates no draft or canonical entity. |

### 3.5 Discussion 014 Family — PlanningDraft

| ID | Accepted decision |
|---|---|
| `D014-01` | PlanningDraft is temporary and reviewable, never canonical truth before confirmation. |
| `D014-02` | One coherent intention and at most one Goal are allowed per draft; hierarchy must be justified rather than decorative. |
| `D014-03` | Detailed execution covers at most seven consecutive local days; longer-lived Goals, Projects, and Routines may extend beyond it. |
| `D014-04` | MVP limits are 5 Projects, 15 Tasks, 5 Routines, and 20 total proposed items per draft. |
| `D014-05` | Users see hierarchy, assumptions, warnings, and first-week placement and may edit, exclude, reject, or select items. |
| `D014-06` | Repair may fix only provable structural format errors; it may not silently alter intent, type, ownership, date, recurrence, or consequences. |
| `D014A-01` | Goal, Project, and Task draft fields carry explicit target/planned/review/deadline semantics, placement, and provenance. |
| `D014A-02` | Temporal defaults add no mandatory questions; review dates may exceed the seven-day execution horizon and never create Today entries alone. |

### 3.6 Discussion 015 Family — Execution

| ID | Accepted decision |
|---|---|
| `D015-01` | Today is a derived local-date view of active Tasks with `plannedDate = today` and pending RoutineOccurrences for today. |
| `D015-02` | Carry explicitly changes a Task's planned date while preserving identity and history; it is never automatic. |
| `D015-03` | Complete, Drop, historical correction, and Restore preserve audit history; overdue is derived, not a Task status. |
| `D015-04` | Routine executes through occurrences; an occurrence is `PENDING → DONE | MISSED`, is never carried, and does not become today's debt. |
| `D015-05` | Stopping a Routine preserves history; resuming creates a new continuation Routine rather than reopening the old one. |
| `D015-06` | Goal/Project terminal actions resolve active children explicitly and preserve historical placement and facts. |
| `D015A-01` | `plannedDate`, `reviewDate`, `deadline`, and `targetDate` are distinct; Today remains execution-only. |
| `D015A-02` | Backlog Tasks retain a future review checkpoint; review changes do not increment Carry and do not mutate lifecycle automatically. |
| `D015B-01` | RoutineOccurrence identity is `(routineId, scheduledLocalDate)` with at most one occurrence per Routine per local day. |
| `D015B-02` | Routine effective local-date bounds are inclusive; timestamps remain audit values and do not replace local dates. |

### 3.7 Discussion 016 Family — Reconcile Eligibility and Presentation

| ID | Accepted decision |
|---|---|
| `D016-01` | Eligibility, severity, and blocking conflict are separate deterministic concepts evaluated after occurrence cleanup. |
| `D016-02` | Execution severity bands are LIGHT, MEDIUM, and RECOVERY; absence, raw MISSED counts, or one limited conflict alone cannot imply Recovery. |
| `D016-03` | Reconcile never blocks Today and may be skipped; skip is not resolution. |
| `D016-04` | Automatic primary presentation occurs at most once per local day, with narrow urgent deadline/conflict exceptions. |
| `D016-05` | Severity and actionable facts are recalculated at a defined evaluation/session boundary. |
| `D016A-01` | `REVIEW_DUE` is Reconcile-eligible but never part of execution-backlog severity. |
| `D016A-02` | Commitment reviews use a separate grouped and chunked lane with deduplicated reason codes. |
| `D016A-03` | Goal continuation obeys both daily prompt suppression and a separate per-Goal cadence. |

### 3.8 Discussion 017 Family — Reconcile Intelligence and Actions

| ID | Accepted decision |
|---|---|
| `D017-01` | Canonical state, deterministic metrics, and versioned rules establish facts; AI may explain but may not invent facts, causes, metrics, action types, or lifecycle conclusions. |
| `D017-02` | Free text is excluded from MVP Reconcile rule matching and metric calculation. |
| `D017-03` | Goal Continuation uses fixed neutral wording and only `CONTINUE`, `REVIEW_LATER`, or `ABANDON_GOAL`, at most once per 30 local days per Goal. |
| `D017-04` | Recommendations require a valid rule ID, sufficient evidence, allowed action type, and visible rationale. |
| `D017-05` | Protected items are removed from destructive actions; bulk actions require preview, explicit confirmation, and parent-empty consequence disclosure. |
| `D017-06` | Commitment review and execution backlog remain separate lanes; absence never determines intent. |
| `D017A-01` | The temporal-checkpoint map migration must use the consolidated wording in Discussion 017A without treating it as a separate product model. |

### 3.9 Discussion 018 Family — Authority, Failure, Privacy, and Safety

| ID | Accepted decision |
|---|---|
| `D018-01` | AI permissions are classified as read-only allowed, confirmation required, or forbidden; deterministic non-AI transitions remain separately governed. |
| `D018-02` | Confirmation binds a current preview, selected entities, consequences, warnings, and expected versions; commit-time revalidation is mandatory. |
| `D018-03` | AI cannot authorize mutation, infer hidden intent/capacity, delete history, bypass protection, or act from stale/expired approval. |
| `D018-04` | Drop may be restored in place with history; stopped Routine resumes only through continuation; destructive permanent delete is outside normal MVP recovery. |
| `D018A-01` | AI failure closes mutation paths but preserves safe manual and deterministic access. |
| `D018A-02` | Partial, invalid, unsafe, or schema-failing output is unusable; failure, retry, degradation, cancellation, and fallback remain user-visible. |
| `D018A-03` | Provider context is operation-scoped and minimized; secrets and unnecessary raw content are forbidden. |
| `D018A-04` | Imported content is data, never instruction or authority; hostile input and prompt injection are isolated and observable. |
| `D018A-05` | High-risk domains permit bounded organization of user-provided facts, not diagnosis, prescription, or expert advice. |
| `D018A-06` | Crisis input produces safety fallback and zero draft, explanation, confirmation, or mutation leakage. |

### 3.10 Discussion 019 Family — Persistence, Transactions, and Observability

| ID | Accepted decision |
|---|---|
| `D019A-01` | Canonical persistence contains Goal, Project, Task, Routine, and RoutineOccurrence with explicit ownership, lifecycle, temporal, provenance, version, and lineage fields. |
| `D019A-02` | Planning drafts, AI operations, derived analytics, and calculated metrics are not canonical domain truth. |
| `D019A-03` | Database constraints enforce exclusive ownership, lifecycle consistency, one daily occurrence, and critical uniqueness. |
| `D019B-01` | Mutations execute through authorization, current-state load, version check, revalidation, deterministic transaction, durable event intent, and CommandResult. |
| `D019B-02` | Optimistic concurrency is default; short scoped locks and deterministic lock ordering protect cross-row invariants. |
| `D019B-03` | Idempotency prevents duplicated effects; matching terminal replay may return domain-state no-op success without duplicate events. |
| `D019B-04` | Bulk mutation is all-or-nothing; parent terminal transitions are staged and transactional. |
| `D019B-05` | Transactional outbox intent is written atomically with domain mutation. |
| `D019C-01` | Canonical state, domain/audit events, AI operational observability, and raw AI content are four separate persistence layers. |
| `D019C-02` | Proposal acceptance, command application, conflict, failure, expiration, and user disposition are distinct recorded facts. |
| `D019C-03` | PlanningDraft, AIProposal, ActionConfirmation, ReconcileSession, facts, rule matches, recommendations, and AIOperation have explicit records and linkage. |
| `D019C-04` | Semantic lifecycle and changed-field events replace opaque generic update noise. |
| `D019C-05` | Every persisted record has a retention class; raw content is disabled or short-lived by default and separately restricted. |
| `D019C-06` | Crisis/security records use restricted storage/access and may not feed ordinary analytics, personalization, or profiling. |
| `D019C-07` | AIOperation records context-builder key/version and a content-free Context Scope Manifest; Reconcile records no free text or imported content. |
| `D019C-08` | Analytics are rebuildable projections and may not infer Goal achievement, diagnosis, hidden motivation, capacity, or causality. |

### 3.11 Discussion 020 Family — Runtime, API, and Reliability

| ID | Accepted decision |
|---|---|
| `D020A-01` | AI runtime produces classification, proposal, or explanation; deterministic application/domain runtime owns authorization, validation, confirmation, and mutation. |
| `D020A-02` | PlanningGeneration, ReconcileExplanation, and DomainSafetyClassification use separate provider-neutral ports. |
| `D020A-03` | MVP registers no model tools/function calling, repositories, command handlers, connectors, or unrestricted reads. |
| `D020A-04` | Context builders are capability-specific, bounded, versioned, and observable; Reconcile consumes structured facts only. |
| `D020A-05` | Cancellation discards late results; kill switches, provider failure, and degraded modes preserve manual paths. |
| `D020B-01` | PlanningAttempt, PlanningDraft, ReconcileSession, and ActionConfirmation are distinct resources with explicit lifecycles. |
| `D020B-02` | PlanningDraft revisions are immutable; warnings are versioned; stale confirmations require refresh and new confirmation rather than auto-rebase. |
| `D020B-03` | Paid AI attempts require stable client identity; commands require expected version and idempotency identity recoverable after lost responses. |
| `D020B-04` | Polling is the MVP transport; cancellation and late-result discard are explicit frontend states. |
| `D020B-05` | Bulk commands are all-or-nothing; error, conflict, refresh, accepted, applied, and failed states remain distinct. |
| `D020C-01` | AI output passes transport, parse, schema, repair, semantic, temporal, reference, graph, policy, context, and budget gates before use. |
| `D020C-02` | Deterministic repair is allowlisted and cannot perform fuzzy semantic or intent-changing repair. |
| `D020C-03` | Pilot permits at most two physical invocations per logical attempt and no automatic cross-provider fallback. |
| `D020C-04` | Runtime artifact versions, token/cost budgets, timeouts, rate limits, circuit breakers, and kill switches are pinned and observable. |
| `D020C-05` | Application budget enforcement and mandatory provider-side hard spend cap are both required. |

### 3.12 Discussion 021 — Validation and Gates

| ID | Accepted decision |
|---|---|
| `D021-01` | H1 tests whether bounded AI assistance creates a useful, credible, non-trivial first plan. |
| `D021-02` | H2 tests whether Reconcile compresses unresolved work into understandable, user-approved decisions without replacing facts or authority. |
| `D021-03` | Exposure, attempt/session, valid output, reviewable resource, disposition, command, and CommandResult are separate metric stages. |
| `D021-04` | Behavioral, self-reported, operational, and safety/trust evidence are all required; edited and unchanged acceptance are separate. |
| `D021-05` | Reconcile severity is immutable pre-session deterministic segmentation; Decision Compression Ratio is descriptive only. |
| `D021-06` | Regret requires user attribution; trust answers require behavioral cross-check; low Manual Escape Success is H2 failure. |
| `D021-07` | Crisis Safety Readiness is a whole-pilot hard gate with zero leakage, fail-closed classifier, real localized resources, adversarial corpus, restricted observability, and human sign-off. |
| `D021-08` | Thresholds, denominators, classifiers, exclusions, and decision logic lock before outcome review; hard gates override positive product metrics. |
| `D021-09` | Strong, weak, failure, and inconclusive outcomes drive explicit continue, limit, redesign, or stop decisions; unsupported causal/generalized claims are forbidden. |

---

## 4. Cross-Family Conflict and Duplicate Resolution

| Apparent conflict | Resolution |
|---|---|
| Old manual Goal/Task/Reconcile MVP versus AI-native loop | Legacy product behavior is fully superseded; `D010-01` through `D010-04` govern. |
| Persisted Plan versus PlanningDraft | No canonical Plan exists; PlanningDraft is temporary and cannot become truth before confirmation. |
| Null Task date as backlog versus explicit placement | Discussion 015A requires explicit `BACKLOG` with a future review checkpoint. |
| Review due versus execution overdue | Review due is a separate commitment-review lane and never increases execution severity. |
| Routine timestamp versus local-date identity | Discussion 015B governs: daily identity and effective bounds use local dates; timestamps are audit values. |
| AI Reconcile reasoning versus deterministic facts | Discussion 017 governs facts/rules; AI may only explain allowed evidence and recommendations. |
| Confirmation versus mutation success | Discussions 019C, 020B, and 021 keep disposition, confirmation, command, and CommandResult separate. |
| 019C wording over 019A/019B | 019C owns observability consequences only; it does not replace canonical or transactional authority. |
| Runtime repair versus product semantics | 020C repair may normalize allowlisted syntax only and cannot alter accepted product meaning. |
| Old formal specs marked Accepted | They remain non-authoritative unless explicitly retained or reconciled under Discussion 022. |

Result: **no blocking semantic conflict remains**.

---

## 5. Consolidated Terms, Flows, Events, Guardrails, and Metrics

### Canonical and operational terms

- Canonical: Goal, Project, Task, Routine, RoutineOccurrence.
- Temporary/review: PlanningAttempt, PlanningDraft, PlanningDraftRevision, AIProposal, ActionConfirmation.
- Reconcile: ReconcileSession, ReconcileFact, RuleMatch, ReconcileGroup, ReconcileRecommendation.
- Runtime/observability: AIOperation, AIContextScopeManifest, CommandResult, transactional outbox.
- Temporal: plannedDate, reviewDate, deadline, targetDate, nextTemporalCheckpoint, scheduledLocalDate, effective local-date bounds.

### Governing flow

```txt
intention
→ bounded conversation
→ validated PlanningDraft
→ review and explicit confirmation
→ deterministic canonical commit
→ Today execution
→ deterministic Reconcile facts and severity
→ optional bounded explanation/recommendation
→ user-confirmed adaptation
→ revalidation, transaction, events, and CommandResult
```

### Event requirements

The event model must cover semantic entity lifecycle, temporal/placement change, Planning attempt/draft/confirmation, command success/conflict/failure, Reconcile evaluation/rules/recommendations, RoutineOccurrence exposure/resolution, safety fallback, hostile-input blocking, and operational degradation. Exact names and envelopes are owned by Discussion 019C; metric consumers are owned by Discussion 021.

### Guardrail requirements

- no direct AI mutation or tool access,
- no silent intent-changing repair,
- no stale confirmation commit,
- no raw/free-text Reconcile context,
- no crisis proposal/explanation/confirmation/mutation leakage,
- no hidden psychological, capacity, diagnosis, Goal-achievement, or causal inference,
- no ordinary analytics use of restricted crisis data,
- manual and deterministic escape remain available under AI failure.

### Metric requirements

- H1 Creation funnel and H2 Reconcile funnel use explicit denominators,
- unchanged and edited acceptance remain separate,
- acceptance and application success remain separate,
- severity bands are immutable and reported separately,
- regret requires attribution,
- trust comprehension is behaviorally checked,
- Manual Escape Success is required,
- safety and reliability hard gates override conversion or productivity metrics.

---

## 6. Open Implementation and Pilot Values

These are not unresolved product semantics. They must be instantiated in Discussion 022 artifacts before the applicable gate:

- pilot recruitment count, observation window, minimum exposure, and numerical H1/H2 thresholds,
- supported pilot locale and verified crisis-resource set,
- OTP expiry, resend cooldown, attempt/rate limits, code format, JWT lifetime, cookie name, and SMS provider policy,
- provider/model selection, artifact identifiers, timeouts, retry delays, rate limits, circuit thresholds, token budgets, and spend-cap values,
- exact retention durations, deletion/anonymization mechanics, and legal basis,
- exact review chunk size, immediate Undo duration, and presentation copy,
- exact framework/package versions, schema migration sequence, and deployment configuration,
- named owners, reviewers, sign-offs, rollback procedures, and operational runbooks.

None may weaken an accepted invariant. Values required by safety, privacy, cost, or reliability are pilot blockers until fixed and tested.

---

## 7. Mind Map and Formal-Document Handoff

The inventory requires migration coverage for:

- Product Vision and `Plan → Execute → Adapt`,
- canonical product/domain concepts,
- Planning conversation and draft review,
- Today, Task, Routine, and temporal checkpoints,
- Reconcile eligibility, severity, review lane, rules, and actions,
- authority, confirmation, reversibility, failure, privacy, and crisis safety,
- persistence layers, events, retention, access, and analytics boundaries,
- runtime ports, API/frontend states, structured-output reliability, and cost controls,
- H1/H2 metrics, hard gates, and forbidden claims,
- explicit removed, deferred, and pilot-only work.

Discussion 022 Workstream D must map each item to a Canvas node ID and before/after file version. Formal artifacts must either adopt this baseline, be amended to it, or be marked superseded.

---

## خلاصهٔ فارسی

این سند فهرست نهایی و قابل‌ردگیری تصمیم‌های معتبر ۰۰۱ تا ۰۲۱ است. هر خانواده مرجع مشخص و decision ID پایدار دارد. تصمیم‌های قدیمی فقط در محدودهٔ فایل تجمیعی ۰۰۱–۰۰۸ معتبرند و تمام تصمیم‌های محصول، Planning، اجرا، Reconcile، safety، persistence، runtime و validation به فایل‌های بسته‌شدهٔ ۰۱۰–۰۲۱ متصل شده‌اند.

هیچ تعارض semantic یا سؤال محصولی حل‌نشده باقی نمانده است. تفاوت‌های میان amendmentها و Finalها با ownership صریح حل شده‌اند. موارد باز فقط configuration و readiness هستند؛ مانند thresholdهای pilot، provider و budget، مقادیر OTP/JWT، retention schedule، crisis resources، نسخه‌های فنی و runbookها. این موارد اجازه ندارند invariantهای پذیرفته‌شده را تغییر دهند.

مرحلهٔ بعدی باید تمام decision IDها و Mind Map Impactها را به node IDهای واقعی Canvas و سپس به spec، milestone، test و pilot gate متصل کند.
