# Discussion 022 — Consolidated TidySense MVP Implementation Plan

Status: **Authoritative plan, amended through Discussions 023–026 and the 2026-09-19 DevMap decisions.** This document plans implementation; it does not claim implementation or gate completion.

## Actual repository state

Implementation has started. `/backend` contains IAM/Project scaffolding and `/frontend` contains a React scaffold. These artifacts are prototypes where they conflict with canonical contracts. No milestone gate below is complete without its specified evidence.

Known migration debt before reuse: opaque database sessions, session-management APIs, integer identities, IPPanel, unversioned routes, ambiguous `DateTime`, and Project permission checks without required user ownership.

## Sequence

### M0 — Documentation/contract consolidation

Discussions 023–026, crisis removal and DevMap technical decisions are reflected in canonical documentation. `DEC-011` remains deferred. Documentation completion is not feature completion.

### M1 — Technical foundation and canonical ownership slice

- keep root `/frontend` and `/backend`;
- establish Guid identity, `DateTimeOffset`/`DateOnly`, current EF naming and real-PostgreSQL test harness;
- migrate auth to JWT cookie + `sessionEpoch`, Kavenegar and `/api/v1` without dual routes;
- central `IExceptionHandler` Problem Details and OpenAPI generation;
- correct Project ownership before treating Project as a reusable canonical slice.

Exit evidence: migration plan/data safety, xUnit/Testcontainers/WebApplicationFactory tests, cross-user isolation, cookie/security tests, Problem Details and generated-client smoke check. Current repository evidence does not yet prove this gate.

### M2 — Goal, Project and Task foundation

Implement canonical Guid aggregates and parent review snapshots. Task excludes Backlog/placement/review-date fields, applies owner-sensitive planned-date validation, and supports same-scope sequence metadata/dependency rules. Include Today Task query and lifecycle/event tests.

### M3 — Routine and occurrences

Implement local-calendar Routine with unique `timesOfDay`, timed/untimed occurrence identities, bounded idempotent generation and slot/day-end missed rules. True `EVERY_N_HOURS` remains post-pilot.

### M4 — Capture and deterministic Reconcile foundation

Implement CaptureItem lifecycle/resolution correlation, deterministic Reconcile facts, Project → Sequence → Task grouping, blocked-actionable exclusion and separate Capture lane. Sequence bulk commands are atomic.

### M5 — Planning foundation

Implement PlanningAttempt/Draft resources, PlanningFact proposal/individual approval and bounded current/previous weekly context. Manual creation stays available; seven-day detailed horizon remains.

### M6 — AI Planning provider integration

Add provider-neutral AI port, strict structured-output gate, explicit unavailable/cancelled/late states, cost/rate/timeout controls and review/apply boundary. Provider/general moderation safeguards are normal AI architecture; there is no dedicated crisis flow or gate.

### M7 — AI-assisted Reconcile

Add optional rule-gated explanation/recommendation over deterministic structured evidence. Preserve protection, preview, confirmation, current-version revalidation and atomic application.

### M8 — Pilot evidence and operations

Lock H1/H2 metrics, privacy/retention, provider safeguards, operational values, support/incident/kill-switch/rollback evidence and release checks. Pilot/release remains not ready until evidence passes.

## Cross-cutting Definition of Done

Every affected slice has: domain invariant tests; ownership/authorization tests only where ownership is defined; PostgreSQL integration tests; `/api/v1` contract and Problem Details tests; generated frontend transport update; meaningful frontend behavior tests; semantic events; migration/rollback review; accessibility/RTL states; and updated DevMap/context.

## Deferred orchestration

Do not lock Docker Compose architecture, CI provider, full deployment pipeline or broader orchestration until needed (`DEC-011`). Secrets are never committed and explicit environment boundaries/cleanup are required independently.
