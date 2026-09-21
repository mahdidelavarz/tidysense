# Implementation Reuse and Supersession Matrix

## Status

`COMPLETE FOR CURRENT REPOSITORY — NO IMPLEMENTATION CODE PRESENT`

## Purpose

Classify reusable, amended, replaced, and removed implementation material without allowing reusable technology to reactivate superseded product behavior.

This matrix implements Discussion 022 Workstream H. It must be re-audited if an external or future implementation repository is brought into scope.

---

## 1. Audit scope and evidence

Repository audit on `2026-07-22` found no application source, dependency manifests, database migrations, infrastructure configuration, generated OpenAPI, or executable tests. The current repository contains Markdown, Canvas, and Obsidian metadata only.

Therefore:

- there is no existing frontend, backend, database, infrastructure, or AI-runtime code to reuse or remove;
- decisions and documentation can be reused, but they are not evidence that an implementation already exists;
- every future implementation component starts as new work constrained by the retained foundation and accepted decisions;
- any later-discovered code requires a fresh row-level audit before reuse.

```txt
Application code present:          NO
Dependency manifests present:      NO
Database migrations present:       NO
Infrastructure code present:       NO
Executable tests present:          NO
Reusable decision material:        YES
Superseded behavioral material:    YES, now redirected/archived
```

---

## 2. Classification vocabulary

- `REUSE_AS_IS` — behavior/decision can be carried forward without semantic change.
- `REUSE_WITH_TESTS` — retained direction may be implemented only with current compatibility, security, and invariant tests.
- `AMEND` — retain a bounded portion while adding current constraints.
- `MIGRATE` — transform existing implementation/data while preserving accepted meaning.
- `REPLACE` — old behavior or structure must not survive; implement the accepted replacement.
- `REMOVE` — do not carry the material into current implementation.
- `UNKNOWN_UNTIL_AUDIT` — no in-scope implementation evidence exists or a later codebase must be inspected.

`REUSE_AS_IS` never waives version selection, security support, tests, configuration, or milestone gates.

---

## 3. Retained technical foundation

| ID | Area | Classification | Retained material | Required amendments/tests | Source authority | Consumer milestone |
|---|---|---|---|---|---|---|
| `REUSE-001` | React + strict TypeScript + Vite | `REUSE_WITH_TESTS` | Frontend foundation direction | Pin supported versions; accessibility, contract, state-machine, component, and E2E tests | `LEG-02`; [[02-Decisions/ADR-002-phase-1-technical-foundation]] | M1 onward |
| `REUSE-002` | C# + ASP.NET Core on .NET 10 | `REUSE_WITH_TESTS` | Backend foundation direction | Pin supported versions; feature-oriented boundaries; domain, transaction, security, integration tests | `LEG-02`; ADR-002 | M1 onward |
| `REUSE-003` | PostgreSQL + versioned migrations | `REUSE_WITH_TESTS` | Provider-neutral relational baseline with canonical PostgreSQL infrastructure | Create the canonical disposable schema directly and use real-PostgreSQL migration/constraint/concurrency evidence. Temporary SQL Server artifacts are removed. | `LEG-02`; D019A–D019C; superseded DevMap `DEC-015` | M1 onward |
| `REUSE-004` | JSON/REST `/api/v1` conventions | `REUSE_WITH_TESTS` | HTTPS, camelCase, UTC instants/local dates, direct success bodies | Current resource schemas, Problem Details, version/idempotency/conflict and ownership tests | `LEG-06`; D019B; D020B | M1 onward |
| `REUSE-005` | Docker + Nginx deployment baseline | `REUSE_WITH_TESTS` | Container and same-origin reverse-proxy direction | Supported images, non-root/security headers, health/readiness, deployment/rollback tests | `LEG-02`; `LEG-04`; `LEG-07` | M1/M8 |
| `REUSE-006` | Phone OTP + JWT cookie session | `REUSE_WITH_TESTS` | Retained identity, challenge, cookie, revocation, CSRF, and privacy boundary | Resolve operational values; race, replay, expiry, revocation, cookie, origin, leakage, production-profile tests | `LEG-03`–`LEG-05`; [[04-Specs/auth-phase-1]] | M1 |
| `REUSE-007` | Development test session | `REUSE_WITH_TESTS` | Local/test-only endpoint using real session behavior | Production must return 404; production-profile automated test mandatory | `LEG-07` | M1 |
| `REUSE-008` | External health monitoring | `REUSE_WITH_TESTS` | Health endpoint plus observed external alert channel | Ownership, alert delivery, failure drill, escalation and runbook evidence | `LEG-07`; B-27 | M1/M8–M9 |
| `REUSE-009` | Generated OpenAPI drift detection | `REUSE_WITH_TESTS` | Generate from implementation; Markdown contracts remain reviewed design authority | CI drift/compatibility check; no second handwritten OpenAPI authority | `LEG-07`; D020B | M1 onward |
| `REUSE-010` | Semantic creation-event rule | `REUSE_AS_IS` | Initial state belongs to creation event; no duplicate initial-change event | Event/outbox and metric-denominator tests | `LEG-08`; D019C | M1 onward |

---

## 4. Product and domain replacement matrix

| ID | Legacy material | Classification | Accepted replacement | Reuse prohibition | Source authority | Consumer milestone |
|---|---|---|---|---|---|---|
| `REPLACE-001` | Reconcile-first MVP | `REPLACE` | Complete `Plan → Execute → Adapt` loop | Do not make Reconcile the first-value engine or block Today | D010–D011; B-01 | M0–M7 |
| `REPLACE-002` | Goal/Task-only domain | `REPLACE` | Goal, Project, Task, Routine, RoutineOccurrence; no canonical Plan | Old tables/classes cannot define current ownership or lifecycle | D012–D012A; D019A | M1–M3 |
| `REPLACE-003` | Planned-for-day-only temporal model | `REPLACE` | Goal/Project review snapshots; standalone scheduled and parent-owned undated Tasks; distinct planned/deadline/target meanings | No Backlog or Task review date; do not conflate parent review with execution overdue | D012A; D014A; D015A; D026 | M1–M5 |
| `REPLACE-004` | Done/Carry/Drop-only execution | `REPLACE` | complete/drop/carry/restore/correction/history plus RoutineOccurrence semantics | Occurrences never carry; terminal parent actions resolve children explicitly | D015–D015B | M2–M3 |
| `REPLACE-005` | old Reconcile eligibility and blocking flow | `REPLACE` | deterministic cleanup, facts, severity, separate review lane, Today access | Skip is not resolution; absence/raw counts do not imply Recovery | D016–D017A | M6 |
| `REPLACE-006` | direct/generated plan application assumptions | `REPLACE` | PlanningAttempt → validated PlanningDraft → preview → confirmation → command | Draft is never canonical or mutation authority | D013–D014A; D018; D020B | M4–M5 |
| `REPLACE-007` | partial/fuzzy AI output handling | `REMOVE` | strict validation and allowlisted structural repair | Invalid or partial output creates no reviewable resource | D014; D020C | M4–M7 |
| `REPLACE-008` | direct AI mutation/model tools | `REMOVE` | provider-neutral no-tool ports and deterministic application services | No repositories, commands, tool calls, or hidden mutation | D018; D020A | M5/M7 |
| `REPLACE-009` | old event taxonomy | `REPLACE` | semantic domain/AI/command/Reconcile/safety/operational evidence with retention classes | Do not reuse old event names/payloads without current catalog review | D019C; D021 | M1 onward |
| `REPLACE-010` | old API endpoint inventory | `REPLACE` | canonical resources plus Attempt/Draft/Session/Confirmation/CommandResult contracts | Old Goal/Task/Reconcile endpoints do not define current contracts | D019B; D020B | M1–M7 |
| `REPLACE-011` | Return-after-Slippage metric model | `REPLACE` | H1/H2 funnels, denominators, regret, trust, manual escape, hard gates | Old pass/fail thresholds cannot enter pilot analysis | D021 | M1/M8–M9 |
| `REPLACE-012` | sequential manual-first then AI pilot | `REMOVE` | AI-native H1/H2 protocol with hard gates | Do not run the deprecated validation sequence | D021; B-25–B-27 | M9 |

---

## 5. AI, safety, privacy, and operational work

No reusable implementation exists for these areas. They require new implementation rather than migration.

| ID | Area | Classification | Required new work | Source authority | Gate |
|---|---|---|---|---|---|
| `NEW-001` | Planning runtime | `UNKNOWN_UNTIL_AUDIT` | ports, context builder, Attempt/Draft lifecycle, deterministic mock, real provider adapter | D013–D014A; D020A–D020C | M4–M5 |
| `NEW-002` | Reconcile runtime | `UNKNOWN_UNTIL_AUDIT` | deterministic facts/rules plus optional bounded explanation adapter | D016–D017A; D020A–D020C | M6–M7 |
| `NEW-003` | confirmation/command boundary | `UNKNOWN_UNTIL_AUDIT` | preview, acknowledgement, versions, expiry, revalidation, CommandResult | D018; D019B; D020B | M2 onward |
| `NEW-004` | outbox and semantic evidence | `UNKNOWN_UNTIL_AUDIT` | atomic intent, publisher, deduplication, retention/access, metric reproducibility | D019B–D019C; D021 | M1 onward |
| `NEW-005` | general AI safety boundary | `NEW` | provider safeguards/moderation, hostile-input isolation, minimized context, explicit degraded/manual paths; no dedicated crisis UX/gate | 2026-09-19 consolidation | M6/M8 |
| `NEW-006` | reliability and cost controls | `UNKNOWN_UNTIL_AUDIT` | retry/timeout/rate/circuit/token/spend limits, kill switches, pinned artifacts | D020C | M5/M7/M9 |
| `NEW-007` | pilot analytics and operations | `UNKNOWN_UNTIL_AUDIT` | metric dictionary, queries, dashboards, analysis package, support/incident/rollback drills | D019C; D021; B-27 | M8–M9 |

`UNKNOWN_UNTIL_AUDIT` here means no code exists to evaluate. It does not authorize copying an external implementation without repeating this matrix against that codebase.

---

## 6. Artifact disposition

| Artifact family | Disposition | Evidence |
|---|---|---|
| Closed Discussions 010–021 | `REUSE_AS_IS` | accepted detailed decision authority |
| Legacy surviving-decisions record | `REUSE_AS_IS` | narrow `LEG-*` compatibility boundary |
| Accepted-decision inventory and AI-native baseline | `REUSE_AS_IS` | verified index and scope projection |
| Migrated Canvas | `REUSE_AS_IS` | applied and cross-role verified hash in Canvas ledger |
| Rewritten ADR-002 and current formal projections | `AMEND` completed | repository artifact ledger records `APPLIED_VERIFIED` |
| ADR-001, ADR-003, old scope/data/events/metrics/validation/plan paths | `REPLACE` completed | safe redirects/archive markers; Git retains history |
| Old Week-1 evaluation model | `REMOVE` from active use | archived and absent from active navigation/Canvas |

---

## 7. Reuse gates

A future implementation item may be reused only when all applicable checks pass:

```txt
accepted behavior compatibility
canonical model and lifecycle compatibility
ownership and authorization
version, concurrency, and idempotency
API/error contract
atomic event/outbox evidence
AI authority and structured-output boundaries
privacy, retention, and restricted access
safety, hostile-input isolation, minimized context, and no unauthorized mutation
testability and migration/rollback evidence
adaptation cost lower than replacement cost
```

Failure of any invariant, authority, safety, privacy, or evidence check changes the classification to `AMEND`, `MIGRATE`, `REPLACE`, or `REMOVE` before code enters a locked slice.

---

## 8. Completion result

```txt
Current repository implementation-code audit: COMPLETE
Reusable decision/technical baseline classified: YES
Superseded behavior classified: YES
New-work areas identified: YES
Unclassified in-scope implementation code: NONE
External/future code reuse authorization: NO — REAUDIT REQUIRED
```

Discussion 022 Workstream H is complete for the current repository.
