# Decision Register

This register is the only DevMap inventory for unresolved recurring technical choices. Product decisions remain in the Mind Map.

## Conflicts

| ID | Conflict | Impact | Required resolution |
|---|---|---|---|
| `CON-001` | Baseline/canvas 001–022 vs accepted-but-unapplied Discussions 023–026 | PlanningFact, multi-time Routine identity, task dependencies, Backlog removal, CaptureItem | consolidate later accepted decisions into inventory, specs, canvas, schema and plan before affected modules |
| `CON-002` | `FOR_CODEX.md` removes dedicated crisis UX/gate while current baseline/canvas require it | Planning/Reconcile IA, safety flow, readiness gates | apply the accepted queue consistently and record what guardrails remain |
| `CON-003` | Mind Map requires JWT cookie + `sessionEpoch`, excludes refresh/per-device session management, and defines OTP/current-user responses; code uses an opaque DB-session token, session-list/individual-revoke APIs, `/auth/me`, and separate register/login responses | auth schema, revocation, routes, client contract, tests | reconcile the full authentication/session API before auth is extended |
| `CON-004` | Kavenegar is documented/confirmed; code implements IPPanel | configuration, adapter, provider tests | confirm provider and keep exactly one production adapter active |
| `CON-005` | accepted model requires canonical `id`, `userId`, and versioned ownership; the proposed domain package uses UUID while current User/Project use integer IDs and prototype fields | every canonical FK and migration | resolve `DEC-012` and approve migration/compatibility strategy; do not extend prototype Project |
| `CON-006` | required API prefix is `/api/v1`; current controllers expose `/api/...` | frontend integration and compatibility | move new contract to `/api/v1` and decide temporary compatibility/removal of prototype routes |
| `CON-007` | proposed layout says `app/frontend`/`app/backend`; repository uses root `frontend`/`backend` | scripts, CI, documentation | current DevMap documents actual paths; decide whether a later move is worth disruption |
| `CON-008` | product name Adaptive Planner; code/package name TidySense | namespaces, API title, UI copy | confirm technical/product naming policy |
| `CON-009` | current EF models use `DateTime`; the .NET canonical reference proposes `DateTimeOffset` for instants and `DateOnly` for local dates | serialization, Npgsql mapping, temporal comparisons and migrations | resolve `DEC-013` before canonical temporal fields |
| `CON-010` | current EF migration uses convention-generated names while canonical reference DDL uses explicit snake_case | every new table/FK/index and operations | resolve `DEC-014` before canonical migrations |
| `CON-011` | Project endpoints check group permission but do not scope reads/writes by authenticated owner | data isolation and any reused CRUD pattern | treat current Project as unsafe prototype; canonical resources require ownership predicates/tests |
| `CON-012` | M1 entry/status documents say implementation has not started, while backend IAM/Project and frontend scaffolds exist | milestone evidence and planning | audit completed evidence and reset truthful milestone status without claiming unverified gates |

## Open decisions

| ID | Needed decision | Affects | Constraints/evidence | Small option set |
|---|---|---|---|---|
| `DEC-001` | canonical backend module boundary/repository policy | all domain modules | current services use `AppDbContext` directly; product docs describe domain/application ports | A: feature-oriented services + direct EF for queries, repositories for aggregates; B: repository ports for all aggregate access |
| `DEC-002` | backend test stack | CI and every module | no test project/packages exist; real PostgreSQL is required | A: xUnit + Testcontainers for .NET + WebApplicationFactory; B: NUnit equivalents |
| `DEC-003` | frontend feature folder contract | all pages/features | only `src/routes` exists; selected libraries imply a feature architecture but do not define it | A: `features/<feature>` plus `shared`; B: type-based top-level folders with feature subfolders |
| `DEC-004` | router generation/bootstrap | navigation | `routes/__root.tsx` and router plugin dependency imply TanStack file routing, but Vite/plugin/provider are not wired | A: complete file-based routing; B: remove plugin and use explicit code routes |
| `DEC-005` | generated OpenAPI vs hand-authored frontend schemas | API drift/type sharing | OpenAPI generation is required; Zod is installed; no client exists | A: generated TS transport types + hand-authored form schemas; B: hand-authored Zod transport schemas checked against OpenAPI |
| `DEC-006` | Problem Details exception mapping mechanism/code catalog | every API | RFC 9457 is locked; exception classes exist but no middleware | A: central `IExceptionHandler`; B: MVC exception filter. Both require stable application error codes |
| `DEC-007` | pagination/filter/sort contract | list endpoints | current lists are unpaged; no accepted envelope/query grammar | A: cursor pagination; B: page/size. Define allowlisted sort/filter fields with first real list |
| `DEC-008` | authoritative user timezone and calendar display configuration | Today, routines, week boundaries | `DateOnly`/timezone semantics are product-critical; Jalali package is installed; user timezone source is absent | A: explicit user profile IANA zone; B: pilot-wide configured zone with later profile migration |
| `DEC-009` | remaining UI foundation scales | every UI component | palette is locked; typography, spacing, radius, shadows, breakpoints, z-index, motion, and icon set are not established | approve a compact token set from accepted design artifacts before product UI implementation |
| `DEC-010` | frontend/backend test runner details and browser E2E tool | CI | no frontend test packages/scripts exist | choose Vitest + Testing Library and Playwright, or document approved alternatives |
| `DEC-011` | local/CI orchestration and secret mechanism | onboarding/build | no Compose/CI/global.json; secrets are committed | approve Compose services, CI provider, `global.json`, env/user-secrets boundaries |
| `DEC-012` | canonical ID and ownership-key type | all entities, URLs, FKs, migrations | accepted 019A fixes identity/ownership/version semantics but not the physical ID type; proposed package uses UUID; current code uses integers | A: UUID/`Guid` canonical and auth IDs; B: numeric IDs with equivalent ownership/version guarantees |
| `DEC-013` | CLR temporal types | canonical dates/instants and existing IAM migration | accepted behavior separates UTC instants and local dates; current code uses `DateTime`; proposal uses `DateTimeOffset`/`DateOnly` | A: `DateTimeOffset` + `DateOnly`; B: UTC-only `DateTime` + `DateOnly`, with strict kind enforcement |
| `DEC-014` | PostgreSQL identifier naming | migrations, raw SQL, diagnostics | existing migration follows EF conventions; proposed reference schema is snake_case | A: explicit snake_case via configuration/convention; B: existing PascalCase convention with explicit contract names where required |

## ADR convention

Create `ADR-NNN-short-title.md` here only when a decision has meaningful alternatives, crosses modules, is expensive to reverse, or establishes a long-lived convention. Include Status, Context, Decision, Alternatives, Consequences, Migration, and Evidence. Small local choices stay in code or the relevant DevMap authority.

When an item is resolved, record the decision in the relevant authoritative DevMap document, link its ADR if any, and move the row to a short resolved log rather than leaving contradictory guidance.
