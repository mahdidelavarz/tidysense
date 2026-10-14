# Canonical Development Steps

This is the stable execution roadmap. It is derived from the consolidated product baseline, Discussion 022, the dependency graph, current code, and verified evidence. Step IDs are permanent; amend scope/status without casual renumbering.

The STEP IDs are independent of the Mind Map M-labels. This roadmap follows Discussion 022's amended M1–M8 sequence; the Mind Map dependency/exit artifacts were reconciled to it on 2026-10-02 (`CON-013`, resolved).

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
- [x] Align request/verification/current-user responses and routes with the canonical contract, including `202` request and `/api/v1/users/me`.
- [x] Make OTP validation/attempt update/consumption and create-or-load User one safe relational transaction.
- [x] Add row-lock/equivalent duplicate OTP consumption protection and recover cleanly from duplicate-user races.
- [x] Add backend-owned resend/request/verification rate limits and generic privacy-safe responses.
- [x] Enforce JSON and approved Origin/Referer rules on unsafe cookie-authenticated requests.
- [x] Add a development/test-only authentication mechanism with a production-profile unavailability test.
- [x] Complete Kavenegar timeout/error behavior without exposing provider details.
- [x] Implement Persian/RTL login, OTP, current-user bootstrap, reload persistence, logout and revoked/expired-session states.
- [x] Add auth unit, real-PostgreSQL race, API security, frontend behavior and browser integration tests.
- [x] Verify new-user login, returning-user login, reload, logout and logout-all in Chrome against isolated local PostgreSQL; visually inspect First Entry and account screens.

**Verification:** Auth-focused xUnit and real-PostgreSQL concurrency tests; WebApplicationFactory cookie/CSRF/privacy tests; frontend tests; browser login against local PostgreSQL; production-profile test proves dev auth endpoint is absent; full `./dev.ps1 check`.

**Completion criteria:** Every checklist item passes; JWT is never exposed to JavaScript; duplicate consumption/user creation is safe; current-user/logout behavior survives reload and manual verification; no obsolete session architecture remains.

**Status:** `DONE`

**Evidence:** [Auth API](../backend/Controllers/Auth/AuthController.cs), [OTP transaction and limits](../backend/Services/OtpService.cs), [schema migration](../backend/Migrations/20260921120000_CompleteAuthentication.cs), [API/PostgreSQL tests](../backend.Tests/AuthenticationCompletionTests.cs), [provider tests](../backend.Tests/KavenegarSmsSenderTests.cs), [frontend auth](../frontend/src/features/auth/components/LoginView.tsx), [browser scenarios](../frontend/e2e/auth.spec.ts), [isolated browser runner](../auth-e2e.ps1). Verified 2026-09-21: `./dev.ps1 check` passed (16 backend, 6 frontend tests, lint/typecheck/build/OpenAPI); `./auth-e2e.ps1` passed (2 Chrome tests on isolated PostgreSQL). First Entry and account screenshots were visually inspected. Follow-up regression verified that a consumed OTP permits a fresh request immediately after logout: 8 auth API/PostgreSQL tests and 2 Chrome scenarios passed.

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

**Status:** `DONE` — all four M1 contracts were approved and marked `SLICE_LOCKED` on 2026-09-27.

**Evidence:** [M1 review package and approval record](step-03-m1-review-package.md#approval-record), [Contract Freeze Register](../mindmap/05-Implementation/contract-freeze-register.md), [command executor](../backend/Services/CommandExecutionService.cs), [payload policy](../backend/Common/Events/EventPayloadSchema.cs), [delivery migration](../backend/Migrations/20260921123236_Step3DeliveryContracts.cs), [event hardening migration](../backend/Migrations/20260926085120_HardenStep3EventContract.cs), [PostgreSQL/API tests](../backend.Tests/DeliveryContractTests.cs), [migration rollback tests](../backend.Tests/DeliveryMigrationTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json). Verified 2026-09-26: `./dev.ps1 check` passed (27 backend, 6 frontend tests, lint/typecheck/build/OpenAPI); the focused delivery/migration run passed 10 tests; `./auth-e2e.ps1` passed (2 Chrome authentication regressions on isolated PostgreSQL); EF reported no pending model changes. On 2026-09-27, all mandatory M1 reviewer approvals and Reza's Backend owner sign-off were recorded and the four M1 contracts were marked `SLICE_LOCKED`. Command/idempotency/CommandResult remains a foundation until its M2 lock gate.

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

**Status:** `DONE`

**Evidence:** [Step 4 acceptance contract and verification record](step-04-goal-project-acceptance.md), [Goal/Project API and PostgreSQL tests](../backend.Tests/GoalProjectModuleTests.cs), [migration and rollback test](../backend.Tests/DeliveryMigrationTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json), [Goals page](../frontend/src/features/goals/components/GoalsPage.tsx) and [Projects page](../frontend/src/features/projects/components/ProjectsPage.tsx) (one parent dashboard at the time; split into separate pages in the 2026-10-02 UI redesign), [browser acceptance](../frontend/e2e/parents.spec.ts). Verified 2026-09-27: `./dev.ps1 check` passed (36 backend, 12 frontend tests, typecheck/lint/build/OpenAPI); `./auth-e2e.ps1` passed 3 Chrome scenarios on isolated PostgreSQL. Goal completion stayed explicit and the attachment/terminal race preserved the no-active-child-under-terminal-Goal invariant.

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

**Status:** `DONE`

**Evidence:** [Task API](../backend/Controllers/TasksController.cs), [Today API](../backend/Controllers/TodayController.cs), [Task service](../backend/Services/TaskService.cs), [schema migration](../backend/Migrations/20260928113808_Step5TaskToday.cs), [Task/Today PostgreSQL tests](../backend.Tests/TaskTodayModuleTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json), [Tasks page](../frontend/src/features/tasks/components/TasksPage.tsx), [Today view](../frontend/src/features/today/components/TodayView.tsx), [browser acceptance](../frontend/e2e/auth.spec.ts). Verified 2026-10-02: `./dev.ps1 check` passed (44 backend, 16 frontend tests, typecheck/lint/build/OpenAPI) against a real local PostgreSQL 18 instance; `./auth-e2e.ps1`'s equivalent flow (run manually against an isolated PostgreSQL database after a tooling path-quoting defect in the script was identified, tracked separately, and worked around) passed all 4 Chrome scenarios, including "manual task moves through Today to completion".

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

**Status:** `DONE`

**Evidence:** [Step 6 acceptance contract, recorded deviations and verification record](step-06-routine-acceptance.md), [Routine API](../backend/Controllers/RoutinesController.cs), [occurrence API](../backend/Controllers/RoutineOccurrencesController.cs), [Routine service](../backend/Services/RoutineService.cs), [scheduling rules](../backend/Services/RoutineSchedule.cs), [Today service](../backend/Services/TodayService.cs), [schema migration](../backend/Migrations/20261002132639_Step6RoutineOccurrence.cs), [scheduling tests](../backend.Tests/RoutineScheduleTests.cs), [Routine PostgreSQL/API tests](../backend.Tests/RoutineModuleTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json), [Routines page](../frontend/src/features/routines/components/RoutinesPage.tsx), [Today view](../frontend/src/features/today/components/TodayView.tsx), [browser acceptance](../frontend/e2e/routines.spec.ts). Verified 2026-10-02: `./dev.ps1 check` passed (69 backend, 26 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 8 Chrome scenarios on an isolated PostgreSQL database, including "a multi-slot Routine and a Task are executed together from Today"; EF reported no pending model changes. Decisions confirmed with the owner: recurrence limited to daily, specific weekdays and monthly-on-day; Routines in sidebar and drawer only; full-history batched catch-up; lifecycle plus `CREATED` occurrence events.

---

## STEP-07 — Capture and Deterministic Reconcile

**Goal:** Deliver deterministic adaptation without depending on AI.

**Scope:** CaptureItem lifecycle/resolution, Task Carry and protection, deterministic facts/cleanup/severity, rule catalog R1/R2/R3/R6, Project→Sequence→Task grouping, blocked-actionable handling, separate Capture lane, commitment-review lane (Goal/Project review checkpoints, Goal Continuation Check, undated direct child Tasks), Reconcile session/preview/confirmation, atomic bulk/sequence actions and continued Today access.

**Out of scope:** AI explanations/recommendations, rules R4 (Routine mismatch) and R5 (Project overload), raw Reconcile text, dedicated crisis UX, automatic mutation.

**Required DevMap context:** [architecture](02-architecture.md), [module loop](04-module-implementation-loop.md), [transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [frontend forms/pages](frontend/forms-components-pages.md), [accessibility](frontend/design-system-accessibility.md).

**Required Mind Map context:** [Reconcile trigger/severity](../mindmap/01-Closed-Discussions/016-reconcile-trigger-and-severity.md), [Reconcile actions](../mindmap/01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions.md), [sequence grouping](../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), [Capture amendment](../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md), [Reconcile UI specification](../mindmap/04-Specs/reconcile-ui-ux-specification.md).

**Dependencies:** STEP-06 and reusable confirmation/command contracts from STEP-03. `CON-013` was reconciled on 2026-10-02.

**Implementation checklist:** Implement Capture lifecycle; lock deterministic fact/rule/reason catalog; build grouping and separate lanes; implement ReconcileSession/previews/confirmations; enforce version/ownership/atomic bulk behavior; build accessible UI with Today still available; add events/evidence.

**Verification:** Classifier/rule fixtures, real-PostgreSQL bulk/concurrency tests, API contract tests, accessibility/frontend tests and manual deterministic Reconcile E2E.

**Completion criteria:** Users can understand and explicitly apply deterministic adaptation with no AI authority and no partial bulk effects.

**Status:** `DONE`

**Evidence:** [Step 7 acceptance contract, recorded deviations and verification record](step-07-capture-reconcile-acceptance.md), [Capture API](../backend/Controllers/CapturesController.cs), [Reconcile API](../backend/Controllers/ReconcileController.cs), [Capture service](../backend/Services/CaptureService.cs), [Reconcile service](../backend/Services/ReconcileService.cs), [facts, severity and rules](../backend/Services/ReconcileRules.cs), [preview builder](../backend/Services/ReconcilePreview.cs), [schema migration](../backend/Migrations/20261002143512_Step7CaptureReconcile.cs), [rule and preview tests](../backend.Tests/ReconcileRulesTests.cs), [Capture/Reconcile PostgreSQL/API tests](../backend.Tests/CaptureReconcileModuleTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json), [Reconcile page](../frontend/src/features/reconcile/components/ReconcilePage.tsx), [capture lane](../frontend/src/features/captures/components/CaptureLane.tsx), [Today entry](../frontend/src/features/reconcile/components/TodayReconcileEntry.tsx), [browser acceptance](../frontend/e2e/reconcile.spec.ts). Verified 2026-10-02: `./dev.ps1 check` passed (96 backend, 34 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 9 Chrome scenarios on an isolated PostgreSQL database, including "a quick capture and an overdue sequence are resolved in Reconcile while Today stays usable"; EF reported no pending model changes. Decisions confirmed with the owner: `CON-013` cleared by renumbering the Mind Map artifacts; commitment-review lane included; rule catalog R1/R2/R3/R6; Reconcile in sidebar and drawer with a Today entry, and capture through Add Task. The Reconcile and confirmation freeze-register rows stay `DRAFT` until their reviewers approve.

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

**Status:** `DONE`

**Evidence:** [Step 8 acceptance contract, recorded deviations and verification record](step-08-planning-acceptance.md), [Planning API](../backend/Controllers/PlanningController.cs), [Planning service](../backend/Services/PlanningService.cs), [draft rules](../backend/Services/PlanningDraftRules.cs), [fact vocabulary](../backend/Services/PlanningFactCatalog.cs), [context builder](../backend/Services/PlanningContextBuilder.cs), [attempt runner](../backend/Services/PlanningAttemptRunner.cs), [deterministic mock](../backend/Services/DeterministicPlanningGenerator.cs), [schema migration](../backend/Migrations/20261003142533_Step8PlanningFoundation.cs), [rule tests](../backend.Tests/PlanningDraftRulesTests.cs), [Planning PostgreSQL/API tests](../backend.Tests/PlanningModuleTests.cs), [generated OpenAPI](../backend/openapi/TidySense.json), [Planning page](../frontend/src/features/planning/components/PlanningPage.tsx), [draft review](../frontend/src/features/planning/components/PlanningDraftReview.tsx), [browser acceptance](../frontend/e2e/planning.spec.ts). Verified 2026-10-03: `./dev.ps1 check` passed (123 backend, 47 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 10 Chrome scenarios on an isolated PostgreSQL database, including "an intention becomes a reviewed draft and only the confirmed plan is created"; EF reported no pending model changes. The deviations in the acceptance contract (no clarification conversation, recurrence limited to the STEP-06 types, applied draft ends as `EXPIRED`, sidebar/drawer placement) were chosen during implementation and confirmed with the owner on 2026-10-03. The Planning and confirmation freeze-register rows stay `DRAFT` until their reviewers approve.

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

**Status:** `DONE`

**Evidence:** [Step 9 acceptance contract, recorded deviations and verification record](step-09-ai-planning-acceptance.md), [AI generator and runtime controls](../backend/Services/Ai/AiPlanningGenerator.cs), [runtime state, invocation log and switch audit](../backend/Services/Ai/AiRuntime.cs), [output gate](../backend/Services/Ai/PlanningOutputGate.cs), [prompt renderer](../backend/Services/Ai/PlanningPromptRenderer.cs), [provider adapter](../backend/Infrastructure/Ai/OpenAiCompatibleChatClient.cs), [attempt runner](../backend/Services/PlanningAttemptRunner.cs), [schema migration](../backend/Migrations/20261003152226_Step9AiPlanningRuntime.cs), [gate tests](../backend.Tests/PlanningOutputGateTests.cs), [runtime tests](../backend.Tests/AiPlanningRuntimeTests.cs), [Planning PostgreSQL/API tests](../backend.Tests/PlanningModuleTests.cs), [questions screen](../frontend/src/features/planning/components/PlanningClarification.tsx), [browser acceptance](../frontend/e2e/planning.spec.ts). Verified 2026-10-03: `./dev.ps1 check` passed (171 backend tests with the real-provider smoke skipped, 51 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 11 Chrome scenarios on an isolated PostgreSQL database, including "clarifying questions are answered before a draft exists"; EF reported no pending model changes. Decisions confirmed with the owner: DeepSeek V4 Flash as the first provider; the Discussion 013 clarification turns included; kill switches and limits as configuration with an audit log line. Real-provider smoke on 2026-10-08 with `deepseek-v4-flash` (thinking disabled): the owner ran one flow through the UI (three clarifying questions, answers, a reviewable draft; two recorded calls, both `SUCCEEDED` without repair, 2.2 s and 4.7 s), and the env-gated smoke test passed with the same key; the full backend suite passed again after the thinking-mode change (171 passed). Failure paths against the real provider are covered by the scripted provider only, as recorded in the acceptance contract.

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

**Status:** `DONE`

**Evidence:** [Step 10 acceptance contract, recorded deviations and verification record](step-10-ai-reconcile-acceptance.md), [explanation port and context builder](../backend/Services/ReconcileExplanationContracts.cs), [output gate](../backend/Services/Ai/ReconcileExplanationGate.cs), [prompt renderer](../backend/Services/Ai/ReconcileExplanationPromptRenderer.cs), [model-backed explainer](../backend/Services/Ai/AiReconcileExplainer.cs), [shared operation runner](../backend/Services/Ai/AiOperationRunner.cs), [explanation service](../backend/Services/ReconcileExplanationService.cs), [explanation runner](../backend/Services/ReconcileExplanationRunner.cs), [Reconcile API](../backend/Controllers/ReconcileController.cs), [schema migration](../backend/Migrations/20261008110756_Step10AiReconcile.cs) and [its follow-up](../backend/Migrations/20261008130508_Step10RecommendationEvidence.cs), [gate tests](../backend.Tests/ReconcileExplanationGateTests.cs), [runtime tests](../backend.Tests/AiReconcileRuntimeTests.cs), [PostgreSQL/API tests](../backend.Tests/AiReconcileModuleTests.cs), [explanation card](../frontend/src/features/reconcile/components/AiExplanationCard.tsx), [browser acceptance](../frontend/e2e/reconcile.spec.ts). Verified 2026-10-08: `./dev.ps1 check` passed (204 backend tests with the two real-provider smokes skipped, 54 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 12 Chrome scenarios on an isolated PostgreSQL database, including "an optional explanation points at an allowed action and the change still goes through the confirmed preview"; EF reported no pending model changes. Real-provider run on 2026-10-08 with `deepseek-v4-flash`: the owner ran one flow through the UI (one recorded call, `SUCCEEDED` without repair, 2.2 s; one `R2` recommendation over two Tasks, previewed, confirmed and applied). The env-gated smoke test was not run and failure paths against the real provider are covered by the scripted provider only, as recorded in the acceptance contract. The comparison with the Mind Map was reviewed with the owner on 2026-10-08: the recorded deviations stay, and recommendation outcomes, the command-result link, stored evidence and the fact display were brought in line.

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

**Status:** `DONE`

**Evidence:** [Step 11 acceptance contract, recorded deviations, drill record and open gaps](step-11-operations-acceptance.md), [metric dictionary](operations/metric-dictionary.md) and [its definitions](../backend/Services/Operations/PilotMetricCatalog.cs), [runbooks](operations/runbooks.md), [drill script](../ops-drill.ps1), [retention catalog](../backend/Services/Operations/RetentionCatalog.cs), [maintenance run](../backend/Services/Operations/OperationsMaintenance.cs), [account erasure and operator commands](../backend/Services/Operations/UserErasureService.cs), [alert rules](../backend/Services/Operations/OperationsAlertRules.cs), [runtime view](../backend/Services/Operations/OperationsHealthService.cs), [Operations API](../backend/Controllers/OperationsController.cs), [schema migration](../backend/Migrations/20261008134254_Step11Operations.cs) and [its follow-up](../backend/Migrations/20261008155127_Step11ReconcileExposure.cs), [metric tests](../backend.Tests/OperationsMetricsTests.cs), [retention and erasure tests](../backend.Tests/OperationsRetentionTests.cs), [access, alert and audit tests](../backend.Tests/OperationsApiTests.cs), [operator page](../frontend/src/features/operations/components/OperationsPage.tsx), [browser acceptance](../frontend/e2e/operations.spec.ts). Verified 2026-10-08: `./dev.ps1 check` passed (214 backend tests with the two real-provider smokes skipped, 60 frontend tests, typecheck/lint/build/OpenAPI) against local PostgreSQL 18; `./auth-e2e.ps1` passed all 13 Chrome scenarios on an isolated PostgreSQL database, including "an operator reads alerts, the AI runtime and the evidence tables with their denominators"; EF reported no pending model changes; `./ops-drill.ps1` passed its kill-switch, maintenance, backup/restore, rollback and erasure drills on an isolated database. Decisions confirmed with the owner: an in-app operator page instead of an external monitoring stack; provisional retention of 90/30/180 days for R4/R3/R2; kill switches stay configuration; erasure as an operator command. A follow-up the same day closed seven of the stated gaps (family and provider switches in the drill, batched purge, the eligible-exposure record and `H2.ELIGIBLE_START_RATE`, tracked token prices, a dependency audit with one build-time advisory fixed, a keyboard pass over the manual Task flow, and the display of a maintenance run that never happened): `./dev.ps1 check` then passed with 215 backend and 61 frontend tests, `./auth-e2e.ps1` with all 14 Chrome scenarios, and `./ops-drill.ps1` again. Open and stated in the acceptance contract: alerts are not delivered outside the application and nothing was rehearsed on a deployed environment (`DEC-011`); retention durations and the R2 treatment of confirmations await legal and Security/Privacy review; the metric dictionary is a draft with five required metrics lacking an instrument; database-level access classes are not enforced; no manual operator check on real data, screen-reader pass or security review was done. None of these is waived; they are inputs to STEP-12. Gap closure on 2026-10-09, after the owner accepted the recommendation for each of the twelve open gaps: [pilot deployment decision](decisions/ADR-007-pilot-deployment-topology.md) with its [definition](../deploy/docker-compose.yml) and [procedure](operations/deployment.md), a tested [daily alert digest](../backend/Services/Operations/OperationsAlertDigest.cs), a server-side consent gate for the AI provider (retired in STEP-13) with its consent card and [privacy page](../frontend/src/features/pilot/components/PrivacyPage.tsx), two in-app [pilot questions](../backend/Services/PilotFeedbackService.cs) with their metrics and a [research protocol](operations/pilot-research-protocol.md), the [schema migration](../backend/Migrations/20261009084704_Step11PilotGaps.cs), the 019C amendment on confirmation retention, a [security review](quality/security-review-2026-10-09.md), a [screen-reader checklist](quality/screen-reader-pass.md) and a prepared freeze-register sign-off, with [tests](../backend.Tests/PilotReadinessTests.cs). Verified 2026-10-09: `./dev.ps1 check` passed (227 backend tests with the two real-provider smokes skipped, 66 frontend tests, typecheck/lint/build/OpenAPI); `./auth-e2e.ps1` passed all 16 Chrome scenarios; `./ops-drill.ps1` passed on the new schema; both dependency audits were clean. Still owed, and stated in the contract's gap table: nothing is deployed (the Compose stack was built and exercised on a developer machine on 2026-10-09, see the [Docker guide](operations/docker-guide.md), but no server exists), the 30-day limit for logs and backups is a server setting not yet made, two security findings need the owner (credentials in git history, the four-digit login code), no freeze-register row is signed, the wording of the consent text and the two questions is not approved, and neither the moderated sessions nor the screen-reader pass has been held.

---

## STEP-12 — Pilot Readiness Gate

**Goal:** Audit—not assume—that the MVP is safe and ready for the approved pilot.

**Scope:** Final contract/configuration locks, applicable M1–M8 evidence, cohort/privacy notice/thresholds/resources/owners, security/privacy/safety/operations approvals, release checklist and signed go/no-go outcome.

**Out of scope:** New features, thesis-breaking scope cuts, silent acceptance of missing evidence, automatic production launch.

**Required DevMap context:** [open decisions](context/open-decisions.md), [remaining conflicts](decisions/remaining-conflicts-report.md), [Definition of Done](quality/definition-of-done.md), [dependency policy](operations/dependency-policy.md), [environments](operations/environments-and-configuration.md).

**Required Mind Map context:** [milestone gates](../mindmap/05-Implementation/milestone-exit-gate-plan.md), [pilot checklist](../mindmap/05-Implementation/pilot-readiness-checklist.md), [release checklist](../mindmap/05-Implementation/release-readiness-checklist.md), [contract freeze register](../mindmap/05-Implementation/contract-freeze-register.md), [risk register](../mindmap/05-Implementation/risk-contingency-register.md), [scope-cut register](../mindmap/05-Implementation/scope-cut-register.md).

**Dependencies:** STEP-11, STEP-13 to STEP-21 (added 2026-10-13: the pilot runs on the redesigned product, desktop included), and every applicable earlier step `DONE`.

**Implementation checklist:** Review every hard gate and evidence link; resolve or explicitly block open decisions; lock operational configuration and ownership; execute final security/privacy/safety/release reviews; record signed go/no-go result.

**Verification:** Checklist evidence audit, full regression, operational drill review and accountable approval. Missing hard evidence fails the gate.

**Completion criteria:** Pilot readiness is explicitly approved with traceable evidence, or status becomes `BLOCKED` with exact unmet gates; no feature implementation is used to blur the audit.

**Status:** `NOT_STARTED`

**Evidence:** None; current product summary correctly states pilot/release are not ready.

---

## Pre-pilot redesign and evidence (STEP-13 to STEP-21)

Added on 2026-10-13 after the owner's design phase. These steps carry [Discussion 027](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md) into code and rebuild the interface from the approved design canvas. All of them precede STEP-12: the pilot gate audits the product that will actually be piloted, desktop included (owner decision, 2026-10-13).

**Design source.** The canvas "Adaptive Planner — Dawn", page «در کد — پیاده‌سازی» (<https://claude.ai/artifact/AjMm5oPxveG52ZfhmHFNKe>, private to the owner). Each step names its boards. A board is the visual reference for layout, hierarchy, copy and both themes. It is not a data contract; sample data on a board is not a requirement. Behaviour still comes from the Mind Map; where a board and an accepted decision disagree, the decision wins and the gap is reported.

**Product gates (resolved).** Two parts of the design rested on product behaviour no accepted discussion defined. [Discussion 028](../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md), closed by the owner on 2026-10-13, now defines them:

- **Choice-based clarification questions** (STEP-18, and the question-code rows of STEP-20): the question shape, option limits, the product-added «چیز دیگر…», up to three related questions per turn, the gate rules and the measurement codes (§2).
- **Welcome and first-run guides** (STEP-17): phones only, before login, once per device, nothing recorded on the server, and promises that must hold in the measured product (§4).

It also fixes the four-step flow on every planning entry (§3) and keeps desktop free of extra behaviour (§5).

Order: STEP-13 → STEP-14 → STEP-15, then STEP-16 to STEP-20 in any order their dependencies allow, then STEP-21.

---

## STEP-13 — AI Disclosure Without Consent

**Goal:** Remove the AI consent gate and move all disclosure to the privacy notice, without naming the provider to users.

**Scope:** Retire `AiConsentPolicy`, `403 AI_CONSENT_REQUIRED`, `PUT /users/me/ai-consent`, `aiConsentRequired`/`aiConsentGranted` and the consent card; stop recording `AI_CONSENT_CHANGED` while keeping existing events as R1 history; remove the provider and model name from every user-facing DTO, including the pilot notice; rewrite the privacy notice to 027 §3 (sent only to build the draft, no stored copy, servers outside Iran, phone never sent, counts-only Reconcile context, what is kept and how to erase it); notice version bump; retention catalog and runbook updates.

**Out of scope:** The satisfaction prompt (STEP-14), visual redesign of the privacy page (STEP-17), any first-use disclosure line in planning (rejected by 027 §7).

**Required DevMap context:** [STEP-11 acceptance contract](step-11-operations-acceptance.md), [auth/security/transactions](backend/auth-security-transactions.md), [API contract](shared/api-contracts.md), [error contract](shared/error-contract.md), [runbooks](operations/runbooks.md), [schema change workflow](workflows/schema-change.md).

**Required Mind Map context:** [Discussion 027 §2–§3, §7, §9](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [019C §20–§21](../mindmap/01-Closed-Discussions/019c-events-ai-observability-and-retention.md), [AI guardrails](../mindmap/04-Specs/ai-guardrails.md).

**Dependencies:** STEP-11.

**Implementation checklist:**

- [x] Remove the consent check from attempt start and generation; prove a fresh account can plan with AI.
- [x] Retire the consent endpoint, fields and error code; regenerate OpenAPI and client types.
- [x] Decide and migrate the consent rows (retained as history or removed under their retention class), with a rollback test. *Decided:* the account's current-state columns are dropped; the decisions stay as R1 events, so nothing of the history is lost. Rolling back restores the columns empty.
- [x] Remove the provider name from user-facing responses; keep it on operator surfaces and in configuration.
- [x] Ship the 027 §3 privacy wording with a new notice version (`PrivacyNotice.Version` `2026-10-13.1`).
- [x] Update `active-conventions.md` (consent rule), runbook 9, `RetentionCatalog` and the STEP-11 contract's gap table. `RetentionCatalog` needed no change: it had no consent entry, and the events stay R1.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1`; an API test that no user-facing response carries the provider name; a migration rollback test; the manual path sends nothing to a model.

**Completion criteria:** No consent prompt, endpoint or refusal remains; users learn what is sent only from the privacy notice; the provider is invisible to users and visible to operators.

**Status:** `DONE`

**Evidence:** [migration](../backend/Migrations/20261013192816_Step13RetireAiConsent.cs), [privacy notice version](../backend/Services/PrivacyNotice.cs), [notice endpoint](../backend/Controllers/PilotController.cs), [privacy page](../frontend/src/features/pilot/components/PrivacyPage.tsx), [readiness tests](../backend.Tests/PilotReadinessTests.cs), [migration round trip](../backend.Tests/DeliveryMigrationTests.cs), [privacy page tests](../frontend/src/features/pilot/components/PrivacyPage.test.tsx), [planning page tests](../frontend/src/features/planning/components/PlanningPage.test.tsx), [browser privacy scenario](../frontend/e2e/privacy.spec.ts).

What the tests show:

- A fresh account on a model-backed host plans at once with one provider call.
- `/users/me`, the notice and the attempt carry no consent field and no provider or model name.
- The consent route no longer exists, and no decision is recorded.
- A decision recorded the Step 11 way stays R1 and is tombstoned on erasure.
- `Step13RetireAiConsent` drops the four columns and their constraint, keeps the account, and rolls back to empty columns.

Verified 2026-10-13 on Linux:

- 235 backend tests passed, with the two real-provider smokes skipped, against local PostgreSQL 16.
- 66 frontend tests passed; typecheck, lint and build were clean.
- All 15 browser scenarios passed in Chromium against an isolated database with the `auth-e2e.ps1` settings. The consent-card scenario was removed.

**Decisions and deviations:**

- **The planning screen's disclosure line was replaced** by a statement that AI only proposes and nothing is created before review, as 027 §2 requires. The Reconcile explanation card still says it sends only codes and counts. That is not a consent or provider statement, and it is kept.
- **`Ai:Providers:<key>:DisplayName` was removed**, because nothing user-facing may carry a provider name.
- **The `AI_CONSENT_CHANGED` schema stays registered** for history. An old attempt that failed with `AI_CONSENT_REQUIRED` shows the generic failure text.

**Still owed:**

- `./dev.ps1 check` and `./auth-e2e.ps1` on Windows with SDK 10.0.401.
- Owner approval of the privacy wording.
- One look at the page against the real provider.

---

## STEP-14 — AI Response Satisfaction and Measurement Capture

**Goal:** Record the sampled satisfaction answer and the derived fields product insights need, under the small-pilot measurement rules.

**Scope:** The 027 §4 prompt record (surface, subject, rating 1–5, optional reason text, instrument version, time; R2, 180 days, removed on erasure); the pilot sampling rule (every AI response, at most once per account, per surface, per local day, always the first draft and first explanation, never a subject that receives `H1_USEFULNESS` or `H2_UNDERSTANDING` in the same flow); shown, answered and closed recorded apart; the post-pilot rate as configuration; derived fields: entity type of each item removed before acceptance, Task and Routine origin (AI draft or manual) from command provenance, and an internal-account marker; the feedback card on the existing draft and explanation screens; metric dictionary and research protocol updates; frozen definitions with an instrument version.

**Out of scope:** Clarification question kinds and answer types (Discussion 028 §2.5; recorded with the new question shape in STEP-18), the insights view (STEP-20), restyling the draft and explanation screens.

**Required DevMap context:** [metric dictionary](operations/metric-dictionary.md), [pilot research protocol](operations/pilot-research-protocol.md), [logging](backend/logging-observability.md), [schema change workflow](workflows/schema-change.md), [STEP-11 acceptance contract](step-11-operations-acceptance.md).

**Required Mind Map context:** [Discussion 027 §4, §8, §10](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [019C](../mindmap/01-Closed-Discussions/019c-events-ai-observability-and-retention.md), [validation gates](../mindmap/01-Closed-Discussions/021-validation-plan-and-decision-gates.md), [metrics](../mindmap/04-Specs/metrics.md).

**Design boards:** the satisfaction card on `CodePlanningDraft` and `CodeReconcile`.

**Dependencies:** STEP-13.

**Implementation checklist:**

- [x] Persist the satisfaction record with its retention class, erasure path and instrument version.
- [x] Implement the sampling rule server-side; the client only asks whether to show the prompt for a subject.
- [x] Record shown, answered and closed as separate facts; closing is never a rating.
- [x] Record removed-item entity types, Task/Routine origin and the internal-account marker.
- [x] Add the feedback card (ratings 1–2 open the optional reason field), inside the response, never modal or blocking.
- [x] Freeze the definitions in the metric dictionary and research protocol.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1` with a draft rated 2 with a reason, and a closed prompt; PostgreSQL tests for sampling limits, no double asking with H1/H2, erasure and retention purge.

**Completion criteria:** Every AI response the rule selects can be rated once; non-response is distinguishable from a low score; every derived field 027 §5 needs, except option codes, is recorded.

**Status:** `DONE`

**Evidence:** [migration](../backend/Migrations/20261014032809_Step14AiResponseFeedback.cs), [record](../backend/Models/AiResponseFeedback.cs), [sampling rule and responses](../backend/Services/AiResponseFeedbackService.cs), [endpoints](../backend/Controllers/FeedbackController.cs), [apply payload v2](../backend/Common/Events/PlanningEventSchemas.cs), [retention](../backend/Services/Operations/RetentionCatalog.cs), [card](../frontend/src/features/feedback/components/AiFeedbackCard.tsx) and its [wording](../frontend/src/features/feedback/types/feedback.format.ts), [metric dictionary](operations/metric-dictionary.md#satisfaction-with-ai-responses-discussion-027-4), [research protocol](operations/pilot-research-protocol.md), [owner resolution in 027 §8](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [backend tests](../backend.Tests/AiResponseFeedbackTests.cs), [card tests](../frontend/src/features/feedback/components/AiFeedbackCard.test.tsx), [browser scenario](../frontend/e2e/planning.spec.ts).

**What the tests show:**

- A draft under review is not asked about. A cancelled one is asked, and a reload returns the same prompt.
- A second ended draft the same day is not asked; the next day one is.
- A closed prompt cannot be answered, and an answer is accepted once.
- A reason is refused with a rating above 2, and a wrong instrument version is refused.
- Another account gets `404`.
- An applied draft is never asked, but takes its H1 answer.
- After the pilot the first ended draft is still asked, and later ones follow the rate.
- Applying writes `PLANNING_DRAFT_APPLIED` version 2 with the excluded counts. Created Tasks and Routines share the apply's transaction, and a manual Task does not.
- The purge removes records past R2, erasure removes them with the account, and the migration round-trips with its constraints.

**Verified 2026-10-14 on Linux:**

- 239 backend tests passed, with the two real-provider smokes skipped, against PostgreSQL 16.
- 72 frontend tests passed; typecheck, lint and build were clean.
- All 16 browser scenarios passed in Chromium against an isolated database, including "a cancelled draft may be rated once, with a reason for a low rating, and only once a day".

**Decisions and deviations:**

- **When the prompt appears.** The owner decided on 2026-10-14, recorded in 027 §8.3–8.4:
  - planning drafts are asked only once they ended unapplied, so H1 stays unchanged;
  - the Reconcile explanation is not asked during the pilot.

  The board shows the card on the draft under review; it appears above the planning page after cancelling or replacing instead. The surface constraint allows only `PLANNING_DRAFT` until a Reconcile moment exists.
- **Origin and the internal-account marker add no stored field.** Origin is derived from R1 event provenance, and the internal marker is the existing phone configuration. Both are frozen in the metric dictionary.
- **Drafts from the sample generator are not refused at capture.** They are excluded when read, through the generator named in `PLANNING_DRAFT_CREATED`; production runs only the model.
- **The privacy notice is now version `2026-10-14.1`.** It gained the feedback retention row.

**Still owed:**

- `./dev.ps1 check` and `./auth-e2e.ps1` on Windows with SDK 10.0.401.
- Owner approval of the question wording.
- The insights figures themselves (STEP-20).

---

## STEP-15 — Design System v2 and Navigation Shell

**Goal:** Bring the shared visual system and app shell to the canvas, so screen steps only compose.

**Scope:** Token updates from `CodeTokens`, including the moonstone AI tokens (`aiFill`, `aiGlow`, `aiIcon`, `aiInk`, `aiTint`, `aiSpark`, `aiShadow`) in both themes; no purple on buttons; shared components (buttons, chips, segmented control, sheets, entity labels and icons, status badges, feedback card, four-step stepper); the phone shell (tab bar with centre create button and drawer, `CodeDrawer`, `CodeCreateMenu`); the desktop shell (the right-side icon rail with tooltips and a floating content panel), replacing the desktop sidebar; theme follows the system until the user chooses.

**Out of scope:** Page content (STEP-16 to STEP-21), product behaviour changes.

**Required DevMap context:** [design system](frontend/design-system.md), [layout and navigation](frontend/layout-and-navigation.md), [components](frontend/components.md), [accessibility](frontend/design-system-accessibility.md), [testing and performance](frontend/testing-performance.md).

**Required Mind Map context:** None beyond the navigation sources already linked from the design system.

**Design boards:** `CodeTokens`, `CodeDrawer`, `CodeCreateMenu`, the rail on every desktop board.

**Dependencies:** STEP-11.

**Implementation checklist:**

- [x] Update tokens and keep one token set for both themes.
- [x] Rebuild the shared components and the stepper.
- [x] Build the phone shell and the desktop rail with keyboard, focus and tooltip behaviour.
- [x] Replace "sidebar on desktop" with the rail in `active-conventions.md`, `design-system.md` and `layout-and-navigation.md`.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1`; screenshots at 390 and 1440 px in both themes compared with the boards; keyboard-only rail and drawer pass.

**Completion criteria:** The shell matches the boards in both themes and widths, and existing pages still work inside it.

**Status:** `DONE`

**Evidence:** [tokens and shell styles](../frontend/src/index.css), [places](../frontend/src/features/shell/components/Navigation.tsx), [tab bar and create button](../frontend/src/features/shell/components/TabBar.tsx), [rail](../frontend/src/features/shell/components/Rail.tsx), [account panel](../frontend/src/features/shell/components/AccountPanel.tsx), [create menu](../frontend/src/features/shell/components/CreateSheet.tsx), [stepper](../frontend/src/shared/ui/Stepper.tsx), [layout and navigation](frontend/layout-and-navigation.md), [design system](frontend/design-system.md).

**What the tests show:**

- [Shell tests](../frontend/src/features/shell/components/Shell.test.tsx):
  - five places in order with Planning in the middle;
  - the Reconcile count on Today;
  - Goals current on `/projects`;
  - the create button apart from the places;
  - every rail icon named, Operations for operators only;
  - the account panel's rows, count, sign-out and Escape.
- [Create menu](../frontend/src/features/shell/components/CreateSheet.test.tsx): examples per kind, and the Planning card navigates and closes.
- [Stepper](../frontend/src/shared/ui/Stepper.test.tsx) states.
- Browser scenarios:
  - [phone and desktop layouts](../frontend/e2e/responsive.spec.ts);
  - [keyboard rail and account panel](../frontend/e2e/keyboard.spec.ts): Tab reaches a rail icon and shows its tooltip, Enter opens the panel, Tab stays inside, Escape returns focus to the rail, and a panel link closes it.

**Verified 2026-10-14 on Linux:**

- 78 frontend tests passed; typecheck, lint and build were clean.
- All 17 browser scenarios passed in Chromium against an isolated database.
- 239 backend tests passed, unchanged.
- Screenshots at 390 and 1440 px in both themes were compared with `CodeDrawer`, `CodeCreateMenu`, `CodeToday` and `CodeDesktopTasks`.
- Every new entity chip and icon pair is at least 4.5:1.

**Decisions and deviations:**

- **Projects are reached from the account panel** until STEP-17 builds the Goals/Projects switch the boards show. The Goals place is current on `/projects`.
- **Desktop has no global create button,** as on the boards: pages keep their own "new" actions.
- **The create menu and account panel copy use the app's formal address** («نمی‌دانید از کجا شروع کنید؟», «حساب شما»), where the boards mixed in «تو».
- **The Today sky keeps its layout,** with the account button in the old menu slot. Its redesign belongs to STEP-16.
- **The stepper is built but not yet used.** STEP-18 wires it into planning.

**Still owed:**

- `./dev.ps1 check` and `./auth-e2e.ps1` on Windows with SDK 10.0.401.
- A screen-reader pass of the rail and account panel. Only the role-based automated checks ran.

---

## STEP-16 — Phone Execution Screens

**Goal:** Rebuild the daily execution screens on phones to the canvas.

**Scope:** Today with row actions, Tasks, Routines, Task detail, Routine detail, new Task and new Routine sheets, quick capture in one line with an optional date, and the carry sheet.

**Out of scope:** Reconcile (STEP-19), desktop layouts (STEP-21), behaviour changes beyond the boards' presentation.

**Required DevMap context:** frontend feature route in [context routing](context/context-routing.md), [forms and pages](frontend/forms-components-pages.md), [routing and state](frontend/routing-state-api.md), [data types and dates](shared/data-types-and-datetime.md).

**Required Mind Map context:** [execution model](../mindmap/01-Closed-Discussions/015-task-and-routine-execution-model.md), [multi-time Routines](../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [quick capture and undated Tasks](../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md).

**Design boards:** `CodeToday`, `CodeTodayActions`, `CodeTasks`, `CodeTaskDetail`, `CodeNewTask`, `CodeRoutines`, `CodeRoutineDetail`, `CodeNewRoutine`, `CodeCarrySheet`.

**Dependencies:** STEP-15.

**Implementation checklist:** Rebuild each screen and sheet; keep every existing state (loading, empty, error, conflict); measure quick capture from tap to saved Task.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1`; screenshots of every board in both themes; quick capture measured under 5 seconds on a phone for a one-line Task.

**Completion criteria:** The execution screens match the boards, with no lost state or action.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-17 — Entry, Structure and First-Run Screens

**Goal:** Rebuild the entry and structure screens and add the first-run welcome and guides.

**Scope:** Login, First Entry, Goals, Goal detail, Goal terminal confirmation, Projects, Project detail, privacy page, the welcome screen (image and «شروع» only) and three guide pages on phones, shown once.

**Out of scope:** The guide pages on desktop; changing what First Entry does.

**Required DevMap context:** as STEP-16, plus [auth/security](backend/auth-security-transactions.md) for the login screens.

**Required Mind Map context:** [Day-0 onboarding](../mindmap/04-Specs/day-0-onboarding.md), [Discussion 028 §4](../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md), [core model](../mindmap/01-Closed-Discussions/012-core-product-model.md), [Discussion 027 §3](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md) for privacy copy.

**Design boards:** `CodeLogin`, `CodeFirstEntry`, `CodeGoals`, `CodeGoalDetail`, `CodeGoalTerminal`, `CodeProjects`, `CodeProjectDetail`, `CodePrivacy`, `CodeWelcome`, `CodeGuide1`–`CodeGuide3`.

**Dependencies:** STEP-13 and STEP-15.

**Implementation checklist:** Rebuild each screen, including the Goals/Projects switch the boards show (then remove the temporary Projects row from the account panel added in STEP-15); add the welcome and guides with skip and back; keep the "seen" mark on the device and record nothing on the server (028 §4.2); check each guide's promise against measurement (028 §4.3) before the pilot; replace the placeholder welcome image with the owner's image.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1` with a first visit that sees the guides and a second visit that does not; screenshots in both themes.

**Completion criteria:** The screens match the boards; the guides appear once and never block login.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-18 — Four-Step Planning Flow

**Goal:** Give every planning entry the same four steps (نوشتن، پرسش‌ها، مرور، تأیید) with choice-based questions.

**Scope:** Intent writing; clarification questions with model-proposed options, multiple choice where the product gate allows it, «چیز دیگر…» free text and a reason line; draft review; confirmation; the output contract, prompt and gate changes for options; recording the chosen option codes for STEP-20; the satisfaction card placement on the draft.

**Out of scope:** Desktop planning layouts and the «مسیر تا هدف» road (STEP-21); any change to who creates canonical state.

**Required DevMap context:** AI Planning route in [context routing](context/context-routing.md), [STEP-08](step-08-planning-acceptance.md) and [STEP-09](step-09-ai-planning-acceptance.md) acceptance contracts, [API contract](shared/api-contracts.md).

**Required Mind Map context:** [planning conversation](../mindmap/01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow.md), [output contract](../mindmap/01-Closed-Discussions/014-ai-planning-output-contract.md), [structured output](../mindmap/01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls.md), [planning facts](../mindmap/01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context.md), [Discussion 028 §2–§3](../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md).

**Design boards:** `CodePlanning`, `CodePlanningQuestions`, `CodePlanningDraft`, `CodePlanningApply`.

**Dependencies:** STEP-14 and STEP-15.

**Implementation checklist:** Extend the question contract and gate to 028 §2 (reason, `kind`, options, `multiple`, no model "other"); record `kind` and answer type for STEP-20; update the prompt and fixtures; build the four screens; keep manual fallback at every step; measure time from first word to reviewable draft.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1`; gate fixtures for valid, missing and hostile options; a real-provider smoke run; time to draft measured against the "under 2 minutes" promise.

**Completion criteria:** One flow on every entry; options are gated like every other model output; the measured time supports the guide's promise or the promise is changed.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-19 — One-Tap Reconcile

**Goal:** Apply single-item Complete and Carry-to-today on tap with undo, and rebuild Reconcile to the canvas.

**Scope:** 027 §6 controls with immediate undo until the session closes; preview and confirmation kept for other dates, Drop, bulk and sequence actions and Goal continuation; the explanation card with the satisfaction prompt; the review-and-apply screen.

**Out of scope:** Desktop Reconcile layout (STEP-21); changes to rules or severity.

**Required DevMap context:** [STEP-07](step-07-capture-reconcile-acceptance.md) and [STEP-10](step-10-ai-reconcile-acceptance.md) acceptance contracts, [auth/security/transactions](backend/auth-security-transactions.md).

**Required Mind Map context:** [Discussion 027 §6](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [permissions and reversibility](../mindmap/01-Closed-Discussions/018-action-permissions-trust-and-reversibility.md), [sequences and grouping](../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), [Reconcile UI](../mindmap/04-Specs/reconcile-ui-ux-specification.md).

**Design boards:** `CodeReconcile`, `CodeReviewApply`.

**Dependencies:** STEP-14 and STEP-15.

**Implementation checklist:** Add the single-item commands and their undo commands with events; keep revalidation; rebuild the screens; prove AI only highlights a control.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1` with tap, undo and a stale-state refusal; PostgreSQL tests for undo after concurrent change.

**Completion criteria:** The two single-item actions apply on tap and undo exactly; everything else still needs preview and confirmation.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-20 — Product Insights View

**Goal:** Give the operator the «سنجش محصول» view on desktop and phone.

**Scope:** The 027 §5 content (people, planning funnel, removed items, clarification questions by code, AI versus manual execution, Reconcile, satisfaction and reason texts) under the §10 rules (account level first, "x of y", small-sample label under 10, internal accounts apart, no per-user view); the operations page restyle with its tabs.

**Out of scope:** Thresholds or good/bad colouring; export; per-user drill-down.

**Required DevMap context:** [metric dictionary](operations/metric-dictionary.md), [STEP-11 acceptance contract](step-11-operations-acceptance.md), [logging](backend/logging-observability.md).

**Required Mind Map context:** [Discussion 027 §5, §10](../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [validation gates](../mindmap/01-Closed-Discussions/021-validation-plan-and-decision-gates.md).

**Design boards:** `CodeOperations`, `CodeOperationsMobile`, `CodeInsights`, `CodeInsightsMobile`.

**Dependencies:** STEP-14 and STEP-15; the question-code rows also need STEP-18.

**Implementation checklist:** Add each figure as a versioned definition with numerator and denominator; build both layouts; show reason texts without identity.

**Verification:** `./dev.ps1 check`; metric tests on seeded data including internal accounts and small denominators; access test for non-operators (`404`).

**Completion criteria:** Every figure is reproducible from its definition, shows its denominator, and excludes internal accounts.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## STEP-21 — Desktop Layouts

**Goal:** Give desktop its own layouts, with the extra information the boards add, before the pilot.

**Scope:** Desktop Today, Tasks, Routines, Goals and Projects, Planning (writing, questions, draft with the «مسیر تا هدف» road), Reconcile and Insights, inside the rail shell.

**Out of scope:** New product behaviour; anything a phone screen cannot also do.

**Required DevMap context:** [layout and navigation](frontend/layout-and-navigation.md), [design system](frontend/design-system.md), [testing and performance](frontend/testing-performance.md).

**Required Mind Map context:** [Discussion 028 §5](../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md), plus those of the phone step each screen mirrors.

**Design boards:** `CodeDesktopToday`, `CodeDesktopTasks`, `CodeDesktopRoutines`, `CodeDesktopGoals`, `CodeDesktopPlanningIntent`, `CodeDesktopPlanningQuestions`, `CodeDesktopPlanning`, `CodeDesktopReconcile`, `CodeInsights`.

**Dependencies:** STEP-16 to STEP-20.

**Implementation checklist:** Build each layout from the same data and actions as the phone screen; keep side panels derived from data already loaded.

**Verification:** `./dev.ps1 check`; `./auth-e2e.ps1` at 1440 px; screenshots in both themes; keyboard pass.

**Completion criteria:** Every desktop board is implemented, with no desktop-only behaviour.

**Status:** `NOT_STARTED`

**Evidence:** None.
