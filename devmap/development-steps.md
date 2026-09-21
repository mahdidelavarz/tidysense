# Canonical Development Steps

This is the stable execution roadmap. It is derived from the consolidated product baseline, Discussion 022, the dependency graph, current code, and verified evidence. Step IDs are permanent; amend scope/status without casual renumbering.

The STEP IDs intentionally do not reuse ambiguous M4–M6 labels. Discussion 022 declares its amended M1–M8 sequence authoritative, while older implementation dependency/exit artifacts assign those labels differently. This roadmap follows Discussion 022 and preserves the compatible dependency constraints; `CON-013` records the source-document cleanup required before STEP-07.

## Execution protocol

When asked to **Start Step N**, read that step, verify all dependencies are `DONE`, load only its linked DevMap/Mind Map context and relevant code, implement only its scope, run its verification, update evidence/status, then stop. **Continue Step N** resumes unfinished checklist items only. **Review Step N** audits the completion criteria without implementing new scope. Never begin the next step automatically.

Status values: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Scaffolding alone never qualifies as `DONE`.

---

## STEP-01 — Local and Technical Baseline Stabilization

**Goal:** Provide a repeatable PostgreSQL → backend → frontend development baseline and prove the existing canonical read slice.

**Scope:** PostgreSQL/Npgsql restoration, Guid/temporal/API baseline, JWT-cookie/sessionEpoch scaffolding, Kavenegar boundary, Project ownership-safe read, OpenAPI-generated types, real-PostgreSQL test harness, local scripts/secrets/readiness and frontend proxy.

**Out of scope:** Complete authentication, write modules, outbox/events/idempotency framework, Goal/Task/Routine/Today/Reconcile/AI features.

**Required DevMap context:** [active conventions](context/active-conventions.md), [local development](workflows/local-development.md), [backend summary](context/backend-summary.md), [environments](operations/environments-and-configuration.md).

**Required Mind Map context:** [MVP baseline](../mindmap/04-Specs/ai-native-mvp-baseline.md), [technical foundation ADR](../mindmap/02-Decisions/ADR-002-phase-1-technical-foundation.md), [M1 entry package](../mindmap/05-Implementation/m1-entry-package.md), [implementation plan](../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md).

**Dependencies:** Consolidated source-of-truth baseline (M0 documentation).

**Implementation checklist:**

- [x] Establish canonical PostgreSQL schema/provider and real integration database.
- [x] Establish Guid, DateTimeOffset/DateOnly, `/api/v1`, Problem Details and generated OpenAPI transport.
- [x] Establish JWT-cookie/sessionEpoch and Kavenegar boundaries without obsolete session/IPPanel architecture.
- [x] Prove ownership-safe Project read vertically.
- [x] Persist safe local configuration and provide repository-local startup/check commands.
- [x] Verify live PostgreSQL, backend readiness/API, Vite proxy and frontend build/test chain.

**Verification:** `./dev.ps1 check`; live `/health/ready`; direct and Vite-proxied protected `/api/v1` request; generated OpenAPI/types.

**Completion criteria:** Local restart-safe workflow passes; real PostgreSQL is exercised; no tracked secrets or SQL Server infrastructure remain; existing proof slice and generated contracts compile.

**Status:** `DONE`

**Evidence:** [local guide](../README.md), [developer commands](../dev.ps1), [PostgreSQL health check](../backend/Infrastructure/Health/PostgresHealthCheck.cs), [integration tests](../backend.Tests/ProjectReadSliceTests.cs), [Vite proxy](../frontend/vite.config.ts), [canonical migration](../backend/Migrations/20260920071457_CanonicalM1FoundationPostgres.cs).

---

## STEP-02 — Authentication Completion

**Goal:** Deliver a manually testable, race-safe browser authentication flow that satisfies the canonical OTP/JWT/session contract.

**Scope:** OTP request/verification; create-or-login; JWT HttpOnly cookie; sessionEpoch validation; canonical `/api/v1/users/me`; logout/logout-all; development test-session/OTP mechanism; transactional OTP consumption; duplicate-consumption and duplicate-user protection; request limits; unsafe-method Origin/Referer and JSON controls; Kavenegar production adapter; frontend authentication/session bootstrap; integration/E2E/manual login evidence.

**Out of scope:** Refresh tokens, per-device/session inventory, individual-session revocation, non-auth onboarding features, product domain modules.

**Required DevMap context:** [auth/security/transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [error contract](shared/error-contract.md), [backend testing](backend/testing.md), [frontend routing/state](frontend/routing-state-api.md), [forms/pages](frontend/forms-components-pages.md).

**Required Mind Map context:** [authentication specification](../mindmap/04-Specs/auth-phase-1.md), [retained auth/API decisions](../mindmap/01-Closed-Discussions/001-008-legacy-surviving-decisions.md), [M1 configuration register](../mindmap/05-Implementation/m1-configuration-register.md), [transaction/concurrency rules](../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md), [API contract index](../mindmap/04-Specs/api-contracts-phase-1.md).

**Dependencies:** STEP-01.

**Implementation checklist:**

- [x] Guid User/OTP schema, unique normalized phone, HMAC OTP digest foundation.
- [x] JWT cookie issuance, sessionEpoch claim validation, logout and logout-all backend scaffolding.
- [x] Kavenegar-only production adapter boundary.
- [ ] Align request/verification/current-user responses and routes with the canonical contract, including `202` request and `/api/v1/users/me`.
- [ ] Make OTP validation/attempt update/consumption and create-or-load User one safe relational transaction.
- [ ] Add row-lock/equivalent duplicate OTP consumption protection and recover cleanly from duplicate-user races.
- [ ] Add backend-owned resend/request/verification rate limits and generic privacy-safe responses.
- [ ] Enforce JSON and approved Origin/Referer rules on unsafe cookie-authenticated requests.
- [ ] Add a development/test-only authentication mechanism with a production-profile unavailability test.
- [ ] Complete Kavenegar timeout/error behavior without exposing provider details.
- [ ] Implement Persian/RTL login, OTP, current-user bootstrap, reload persistence, logout and revoked/expired-session states.
- [ ] Add auth unit, real-PostgreSQL race, API security, frontend behavior and browser integration tests.
- [ ] Manually verify new-user login, returning-user login, reload, logout and logout-all.

**Verification:** Auth-focused xUnit and real-PostgreSQL concurrency tests; WebApplicationFactory cookie/CSRF/privacy tests; frontend tests; browser login against local PostgreSQL; production-profile test proves dev auth endpoint is absent; full `./dev.ps1 check`.

**Completion criteria:** Every checklist item passes; JWT is never exposed to JavaScript; duplicate consumption/user creation is safe; current-user/logout behavior survives reload and manual verification; no obsolete session architecture remains.

**Status:** `IN_PROGRESS`

**Evidence:** Existing scaffolding in [AuthController](../backend/Controllers/Auth/AuthController.cs), [AuthService](../backend/Services/AuthService.cs), [OtpService](../backend/Services/OtpService.cs), [JWT validation](../backend/Common/Auth/JwtCookieEvents.cs), and [Kavenegar adapter](../backend/Infrastructure/Sms/KavenegarSmsSender.cs). Remaining checklist is not yet evidenced.

---

## STEP-03 — M1 Delivery Contract Lock

**Goal:** Complete the reusable delivery guarantees required before canonical write modules spread.

**Scope:** Optimistic version contract, transaction/idempotency/CommandResult foundations, durable event/outbox intent, event envelope, stable error/validation contract, ownership test patterns, observability/privacy baseline, migration/rollback evidence, M1 contract freeze.

**Out of scope:** Goal/Project/Task writes, domain-specific terminal workflows, AI orchestration, production deployment orchestration under DEC-011.

**Required DevMap context:** [architecture](02-architecture.md), [backend architecture](backend/architecture.md), [transactions](backend/auth-security-transactions.md), [persistence](backend/domain-model-and-persistence.md), [logging](backend/logging-observability.md), [API errors](backend/api-validation-errors.md), [Definition of Done](quality/definition-of-done.md).

**Required Mind Map context:** [M1 plan](../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md), [transactions/idempotency](../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md), [events/observability/retention](../mindmap/01-Closed-Discussions/019c-events-ai-observability-and-retention.md), [API/frontend states](../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md), [contract freeze register](../mindmap/05-Implementation/contract-freeze-register.md).

**Dependencies:** STEP-02.

**Implementation checklist:** Define and test reusable version/idempotency/CommandResult behavior; add durable event intent/outbox and envelope; lock stable error codes/validation; prove ownership/concurrency/outbox atomicity on real PostgreSQL; document migration rollback and freeze evidence.

**Verification:** Domain/application tests, real-PostgreSQL constraint/concurrency/outbox tests, API contract tests, migration upgrade/rollback review, contract-freeze evidence review.

**Completion criteria:** M1 exit evidence is recorded and reusable write contracts are locked without introducing a product module prematurely.

**Status:** `NOT_STARTED`

**Evidence:** None; current Project-read and Problem Details evidence is partial input only.

---

## STEP-04 — Canonical Goal and Project Modules

**Goal:** Deliver the user-owned parent resources needed by Task, Routine and Planning.

**Scope:** Goal and canonical Project CRUD/lifecycle, optional Project→Goal relationship, review snapshots, ownership, optimistic versions, terminal previews/child-resolution rules, API/frontend flows and semantic events.

**Out of scope:** Task/Routine implementation, stored derived Goal progress, inferred Goal achievement, Planning/Reconcile behavior.

**Required DevMap context:** [module loop](04-module-implementation-loop.md), [persistence](backend/domain-model-and-persistence.md), [API errors](backend/api-validation-errors.md), [frontend feature structure](frontend/stack-architecture-folder.md), [forms/pages](frontend/forms-components-pages.md).

**Required Mind Map context:** [canonical core model](../mindmap/01-Closed-Discussions/012-core-product-model.md), [canonical data/invariants](../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md), [transactions](../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md), [parent-owned task amendment](../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md), [backend domain reference](../mindmap/05-Implementation/backend-domain-package/dotnet-ef-core-reference.md).

**Dependencies:** STEP-03.

**Implementation checklist:** Lock acceptance scenarios; implement Goal and complete Project invariants/lifecycles; add PostgreSQL migration/constraints; implement owner-scoped commands/queries/previews/events; expose versioned APIs; regenerate types; build Persian/RTL frontend states; test terminal/stale/cross-user behavior.

**Verification:** Domain, migration, ownership, concurrency, API, generated-contract, frontend and browser acceptance tests.

**Completion criteria:** Both parent modules meet the module checklist and terminal behavior never infers Goal achievement or leaves illegal child states.

**Status:** `NOT_STARTED`

**Evidence:** Existing Project read is only a proof pattern, not module completion.

---

## STEP-05 — Task and Today Manual Execution

**Goal:** Prove the first complete manual Plan → Today → Complete slice.

**Scope:** Task CRUD/lifecycle, Goal/Project/standalone ownership, parent-owned undated rule, standalone planned-date rule, same-scope sequence metadata/dependencies, Today Task projection, completion commands/results/events and frontend execution flow.

**Out of scope:** Routine occurrences, Capture, Reconcile, AI Planning, Backlog/placement/Task review dates.

**Required DevMap context:** [module loop](04-module-implementation-loop.md), [date/time rules](shared/data-types-and-datetime.md), [API contract](shared/api-contracts.md), [frontend state](frontend/routing-state-api.md), [Definition of Done](quality/definition-of-done.md).

**Required Mind Map context:** [Task/execution model](../mindmap/01-Closed-Discussions/015-task-and-routine-execution-model.md), [canonical invariants](../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md), [Task sequences](../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), [undated parent tasks](../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md), [MVP baseline](../mindmap/04-Specs/ai-native-mvp-baseline.md).

**Dependencies:** STEP-04.

**Implementation checklist:** Implement Task/sequence invariants and schema; implement owner-scoped CRUD/commands/events; derive Today Tasks in pilot timezone; implement idempotent completion; generate API types; build Task and Today UI/accessibility states; prove manual E2E flow.

**Verification:** Invariant/property, PostgreSQL constraint, timezone, ownership, command replay/conflict, API/frontend and browser E2E tests.

**Completion criteria:** An authenticated user can manually create a valid Task, see it correctly in Today, complete it once, and recover the authoritative result.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-06 — Routine and RoutineOccurrence Execution

**Goal:** Add deterministic local-calendar recurring execution to Today.

**Scope:** Routine lifecycle/continuation, recurrence/effective bounds/timezone, zero-or-many unique daily slots, timed/untimed occurrence identity, bounded idempotent generation, Done/Missed rules, Today integration and UI.

**Out of scope:** True every-N-hours recurrence, reminders, calendar integration, Reconcile classification, AI.

**Required DevMap context:** [module loop](04-module-implementation-loop.md), [persistence](backend/domain-model-and-persistence.md), [date/time rules](shared/data-types-and-datetime.md), [testing](backend/testing.md), [frontend forms/pages](frontend/forms-components-pages.md).

**Required Mind Map context:** [execution model](../mindmap/01-Closed-Discussions/015-task-and-routine-execution-model.md), [routine local-date amendment](../mindmap/01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment.md), [multi-time occurrence semantics](../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [canonical invariants](../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md), [transaction rules](../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md).

**Dependencies:** STEP-05.

**Implementation checklist:** Implement Routine/occurrence schema and invariants; deterministic generation and uniqueness; stop/continuation and slot/day-end resolution; Today integration; APIs/generated types/UI; timezone/DST/concurrency/event tests.

**Verification:** Property and boundary tests, real-PostgreSQL uniqueness/concurrency tests, API/frontend tests and Task+Routine Today E2E.

**Completion criteria:** Occurrences are generated/resolved exactly once for local dates/slots and Today presents actionable Tasks and Routines correctly.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-07 — Capture and Deterministic Reconcile

**Goal:** Deliver deterministic adaptation without depending on AI.

**Scope:** CaptureItem lifecycle/resolution, deterministic facts/cleanup/severity, Project→Sequence→Task grouping, blocked-actionable handling, separate Capture lane, Reconcile session/preview/confirmation, atomic bulk/sequence actions and continued Today access.

**Out of scope:** AI explanations/recommendations, raw Reconcile text, dedicated crisis UX, automatic mutation.

**Required DevMap context:** [architecture](02-architecture.md), [module loop](04-module-implementation-loop.md), [transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [frontend forms/pages](frontend/forms-components-pages.md), [accessibility](frontend/design-system-accessibility.md).

**Required Mind Map context:** [Reconcile trigger/severity](../mindmap/01-Closed-Discussions/016-reconcile-trigger-and-severity.md), [Reconcile actions](../mindmap/01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions.md), [sequence grouping](../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), [Capture amendment](../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md), [Reconcile UI specification](../mindmap/04-Specs/reconcile-ui-ux-specification.md).

**Dependencies:** STEP-06, reusable confirmation/command contracts from STEP-03, and documentation reconciliation of `CON-013`.

**Implementation checklist:** Implement Capture lifecycle; lock deterministic fact/rule/reason catalog; build grouping and separate lanes; implement ReconcileSession/previews/confirmations; enforce version/ownership/atomic bulk behavior; build accessible UI with Today still available; add events/evidence.

**Verification:** Classifier/rule fixtures, real-PostgreSQL bulk/concurrency tests, API contract tests, accessibility/frontend tests and manual deterministic Reconcile E2E.

**Completion criteria:** Users can understand and explicitly apply deterministic adaptation with no AI authority and no partial bulk effects.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-08 — Planning Foundation with Deterministic Mock

**Goal:** Prove the complete review/apply planning lifecycle before a real AI provider is introduced.

**Scope:** PlanningAttempt/Draft/revisions, PlanningFact proposal and individual approval, bounded current/previous context, seven-day detail horizon, deterministic valid/invalid fixtures, edit/preview/confirm/apply/failure/manual fallback UI.

**Out of scope:** Real AI provider calls, provider cost/runtime controls, direct AI mutation, mandatory PlanningFact use for manual creation.

**Required DevMap context:** [architecture](02-architecture.md), [API contract](shared/api-contracts.md), [backend architecture](backend/architecture.md), [frontend state](frontend/routing-state-api.md), [forms/pages](frontend/forms-components-pages.md).

**Required Mind Map context:** [Planning entry](../mindmap/01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow.md), [Planning output](../mindmap/01-Closed-Discussions/014-ai-planning-output-contract.md), [temporal draft amendment](../mindmap/01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment.md), [persistent PlanningFacts/context](../mindmap/01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context.md), [API/frontend states](../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md).

**Dependencies:** STEP-05 and STEP-03; parent modules from STEP-04.

**Implementation checklist:** Implement attempt/draft/fact schema and states; bounded context builder; immutable revisions; deterministic mock fixtures; review/edit/preview/confirm/apply workflow; failure/cancel/late-result handling; manual fallback; contract/frontend/event tests.

**Verification:** Valid/invalid/race fixture tests, context-boundary tests, PostgreSQL/API tests, frontend state-machine/accessibility tests and deterministic mock E2E.

**Completion criteria:** The entire planning contract is usable and testable without a provider; invalid output cannot become canonical; explicit apply is authoritative.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-09 — AI Planning Runtime

**Goal:** Replace the deterministic Planning mock with a bounded, provider-neutral production runtime while preserving the manual path.

**Scope:** Planning AI port/adapter, prompt/artifact versioning, minimized context manifest, strict structured-output validation, allowlisted repair, cancellation/late-result discard, rate/timeout/circuit/spend/kill controls, provider safeguards and observability.

**Out of scope:** AI Reconcile, model tool authority, automatic provider fallback, direct repository/command access.

**Required DevMap context:** [architecture](02-architecture.md), [backend architecture](backend/architecture.md), [logging](backend/logging-observability.md), [security/transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [testing](backend/testing.md).

**Required Mind Map context:** [AI runtime boundaries](../mindmap/01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration.md), [structured-output/cost controls](../mindmap/01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls.md), [failure/privacy/hostile-input rules](../mindmap/01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution.md), [AI guardrails](../mindmap/04-Specs/ai-guardrails.md), [Planning implementation sequence](../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md).

**Dependencies:** STEP-08.

**Implementation checklist:** Define provider-neutral port; implement pinned adapter/runtime bundle; strict schema/output gate; bounded context and hostile-input isolation; reliability/cost/kill controls; observability/privacy fields; explicit degraded/manual states; adversarial and provider-contract tests.

**Verification:** Contract, invalid-output, timeout/cancel/late, adversarial/context-isolation, spend/rate/kill, observability and manual-fallback tests plus reviewed real-provider smoke evidence.

**Completion criteria:** Real AI Planning can create only reviewable drafts through strict gates, cannot mutate canonical state, and failure always preserves a usable manual path.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-10 — AI-Assisted Reconcile

**Goal:** Add optional bounded explanation/recommendation over deterministic Reconcile evidence without transferring authority to AI.

**Scope:** Rule-gated AI eligibility, structured explanations/recommendations, minimized evidence context, review/disposition, preview/confirmation, current-version revalidation, atomic deterministic application, failure/manual fallback.

**Out of scope:** AI-authored facts/severity, direct or partial mutation, causal/diagnostic claims, dedicated crisis flow.

**Required DevMap context:** [architecture](02-architecture.md), [security/transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [logging](backend/logging-observability.md), [frontend state](frontend/routing-state-api.md), [accessibility](frontend/design-system-accessibility.md).

**Required Mind Map context:** [AI Reconcile actions](../mindmap/01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions.md), [permissions/reversibility](../mindmap/01-Closed-Discussions/018-action-permissions-trust-and-reversibility.md), [runtime boundaries](../mindmap/01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration.md), [API/frontend states](../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md), [AI guardrails](../mindmap/04-Specs/ai-guardrails.md), [Reconcile UI](../mindmap/04-Specs/reconcile-ui-ux-specification.md).

**Dependencies:** STEP-07 and STEP-09.

**Implementation checklist:** Define eligible deterministic inputs and structured output; implement bounded adapter path; enforce no authority leakage; expose explicit review/failure states; revalidate confirmation/version/ownership; apply through deterministic commands; capture H2 evidence.

**Verification:** H2 contract fixtures, adversarial/privacy tests, stale/atomic application tests, manual-fallback and accessibility tests, provider smoke and E2E evidence.

**Completion criteria:** AI can only explain/recommend from deterministic evidence; every consequence remains explicit, revalidated and atomically applied by backend code.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-11 — MVP Evidence and Operational Hardening

**Goal:** Make implemented MVP behavior measurable, supportable, reversible and operationally safe.

**Scope:** H1/H2 event/metric catalog and reproducible queries, privacy/retention/access controls, provider safeguards, dashboards/alerts, runbooks, support/incident/kill-switch/rollback drills, migration recovery and complete cross-slice verification.

**Out of scope:** Declaring pilot readiness, post-pilot features, unresolved deployment orchestration choices not required by evidence.

**Required DevMap context:** [logging](backend/logging-observability.md), [environments](operations/environments-and-configuration.md), [migrations/deployment](operations/migrations-and-deployment.md), [testing/review](quality/code-review-and-testing.md), [Definition of Done](quality/definition-of-done.md).

**Required Mind Map context:** [events/observability/retention](../mindmap/01-Closed-Discussions/019c-events-ai-observability-and-retention.md), [validation gates](../mindmap/01-Closed-Discussions/021-validation-plan-and-decision-gates.md), [validation specification](../mindmap/04-Specs/validation-plan.md), [test coverage matrix](../mindmap/05-Implementation/test-coverage-matrix.md), [risk register](../mindmap/05-Implementation/risk-contingency-register.md).

**Dependencies:** STEP-09 and STEP-10; evidence instrumentation established since STEP-03.

**Implementation checklist:** Lock metric/event dictionaries and consumers; verify privacy/retention/access; implement operational dashboards/alerts; complete provider/kill controls; document and execute incident, rollback, restore and support drills; run full regression/accessibility/security suite.

**Verification:** Metric reproducibility, retention/access, backup/restore, rollback, kill-switch, alert/runbook drills and complete automated/manual regression evidence.

**Completion criteria:** Evidence and operations exit gates pass with named artifacts; remaining gaps are explicit and no hard gate is waived by metrics.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-12 — Pilot Readiness Gate

**Goal:** Audit—not assume—that the MVP is safe and ready for the approved pilot.

**Scope:** Final contract/configuration locks, applicable M1–M8 evidence, cohort/consent/thresholds/resources/owners, security/privacy/safety/operations approvals, release checklist and signed go/no-go outcome.

**Out of scope:** New features, thesis-breaking scope cuts, silent acceptance of missing evidence, automatic production launch.

**Required DevMap context:** [open decisions](context/open-decisions.md), [remaining conflicts](decisions/remaining-conflicts-report.md), [Definition of Done](quality/definition-of-done.md), [dependency policy](operations/dependency-policy.md), [environments](operations/environments-and-configuration.md).

**Required Mind Map context:** [milestone gates](../mindmap/05-Implementation/milestone-exit-gate-plan.md), [pilot checklist](../mindmap/05-Implementation/pilot-readiness-checklist.md), [release checklist](../mindmap/05-Implementation/release-readiness-checklist.md), [contract freeze register](../mindmap/05-Implementation/contract-freeze-register.md), [risk register](../mindmap/05-Implementation/risk-contingency-register.md), [scope-cut register](../mindmap/05-Implementation/scope-cut-register.md).

**Dependencies:** STEP-11 and every applicable earlier step `DONE`.

**Implementation checklist:** Review every hard gate and evidence link; resolve or explicitly block open decisions; lock operational configuration and ownership; execute final security/privacy/safety/release reviews; record signed go/no-go result.

**Verification:** Checklist evidence audit, full regression, operational drill review and accountable approval. Missing hard evidence fails the gate.

**Completion criteria:** Pilot readiness is explicitly approved with traceable evidence, or status becomes `BLOCKED` with exact unmet gates; no feature implementation is used to blur the audit.

**Status:** `NOT_STARTED`

**Evidence:** None; current product summary correctly states pilot/release are not ready.
