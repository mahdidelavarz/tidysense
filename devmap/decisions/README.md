# Decision Register

This is the DevMap register for recurring technical decisions. Product behavior is owned by the Mind Map. Consolidation date: **2026-09-19**.

Current audit result: [remaining conflicts and open decisions](remaining-conflicts-report.md).

## Active conflicts

None. Documentation conflicts `CON-001` through `CON-012` were resolved by this consolidation. Prototype implementation gaps are migration work, not competing architecture.

## Open / deferred decisions

| ID | Status | Scope | Current constraint |
|---|---|---|---|
| `DEC-011` | `DEFERRED` | local orchestration, CI provider, deployment pipeline, broader orchestration | Resolve when implementation needs concrete automation. It does not block domain work. Secrets must never be committed; configuration boundaries and secret cleanup are required now. |

## Resolved conflicts

| ID | Resolution | Authority |
|---|---|---|
| `CON-001` | Discussions 023–026 are consolidated and override older contradictory projections. | [accepted inventory](../../mindmap/02-Decisions/accepted-decision-inventory-001-021.md), [baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) |
| `CON-002` | Dedicated crisis UX, routing and release gate are removed. General provider/moderation safeguards, hostile-input isolation, minimized context, no diagnosis, no AI mutation, explicit failure, manual fallback, authorization and privacy controls remain. | [guardrails](../../mindmap/04-Specs/ai-guardrails.md), [baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) |
| `CON-003` | Canonical auth is a JWT in an HttpOnly cookie with `sessionEpoch`; no refresh tokens or per-device/session-list/individual-revoke model. The opaque DB-session code is prototype migration work. | [auth/security](../backend/auth-security-transactions.md), [ADR-001](ADR-001-authentication-session-contract.md) |
| `CON-004` | Kavenegar is the sole active production SMS adapter; IPPanel is obsolete prototype code. | [backend architecture](../backend/architecture.md) |
| `CON-005` | Canonical identities and FKs are UUID/.NET `Guid`. Ownership follows the domain model. Project is user-owned and its prototype permission-only access must be corrected. | [data types](../shared/data-types-and-datetime.md), [domain/persistence](../backend/domain-model-and-persistence.md), [ADR-002](ADR-002-canonical-uuid-identity.md) |
| `CON-006` | `/api/v1` is canonical. Prototype `/api/...` routes are removed during migration; no dual API. | [API contract](../shared/api-contracts.md) |
| `CON-007` | Root `/frontend` and `/backend` are canonical; no `/app` move. | [architecture](../02-architecture.md) |
| `CON-008` | Product name is TidySense. “Adaptive Planner” is historical terminology only. | [terminology](../shared/terminology-and-naming.md) |
| `CON-009` | `DateTimeOffset` represents instants; `DateOnly` represents local dates; Npgsql persists instants with UTC-compatible semantics. | [data types](../shared/data-types-and-datetime.md), [ADR-003](ADR-003-temporal-representation.md) |
| `CON-010` | Keep the established EF/PostgreSQL identifier convention; do not introduce global snake_case. | [domain/persistence](../backend/domain-model-and-persistence.md) |
| `CON-011` | Ownership is not universal. Explicitly user-owned entities enforce backend ownership. Canonical Project is user-owned, so current permission-only Project access is unsafe migration debt. | [domain/persistence](../backend/domain-model-and-persistence.md) |
| `CON-012` | Implementation has started: backend IAM/Project and frontend scaffolding exist. No milestone gate is complete without its recorded evidence. | [project summary](../context/project-summary.md), [implementation plan](../../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md) |

## Resolved decisions

| ID | Decision | Authority | ADR |
|---|---|---|---|
| `DEC-001` | Feature/application services may use `AppDbContext` directly for simple work; repositories/ports require a real aggregate, domain, external, or testing boundary; no generic repository. | [backend architecture](../backend/architecture.md) | [ADR-004](ADR-004-backend-persistence-boundary.md) |
| `DEC-002` | xUnit + Testcontainers for .NET + `WebApplicationFactory`; real PostgreSQL for database semantics. | [backend testing](../backend/testing.md) | — |
| `DEC-003` | `src/features/<feature>/`, `src/shared/`, `src/routes/`; features own their components, hooks, services, schemas, types and utilities. | [frontend architecture](../frontend/stack-architecture-folder.md) | — |
| `DEC-004` | TanStack Router file-based routing with the Vite plugin, generated route tree and root providers. | [routing/state/API](../frontend/routing-state-api.md) | — |
| `DEC-005` | Generated OpenAPI TypeScript transport types; Zod for forms, client-only constraints and explicit runtime validation. | [API contract](../shared/api-contracts.md) | [ADR-005](ADR-005-openapi-types-and-zod.md) |
| `DEC-006` | Central ASP.NET Core `IExceptionHandler` maps stable error codes to RFC 9457 Problem Details. | [error contract](../shared/error-contract.md) | — |
| `DEC-007` | Cursor pagination with stable ordering, allowlisted sort/filter fields and next-cursor metadata; no universal query language. | [API contract](../shared/api-contracts.md) | — |
| `DEC-008` | Pilot uses one configured application timezone. Later per-user IANA zones must not change domain meanings. | [data types](../shared/data-types-and-datetime.md) | [ADR-003](ADR-003-temporal-representation.md) |
| `DEC-009` | Compact typography, spacing, radius, shadow, breakpoint, z-index, motion and icon tokens are canonical. | [design system](../frontend/design-system-accessibility.md) | — |
| `DEC-010` | Vitest + Testing Library + Playwright, chosen by test purpose rather than arbitrary coverage targets. | [frontend testing](../frontend/testing-performance.md) | — |
| `DEC-012` | UUID / .NET `Guid` canonical identities. | [data types](../shared/data-types-and-datetime.md) | [ADR-002](ADR-002-canonical-uuid-identity.md) |
| `DEC-013` | `DateTimeOffset` instants and `DateOnly` local dates. | [data types](../shared/data-types-and-datetime.md) | [ADR-003](ADR-003-temporal-representation.md) |
| `DEC-014` | Existing EF/PostgreSQL identifier convention; no new global snake_case convention. | [domain/persistence](../backend/domain-model-and-persistence.md) | — |

## ADR policy

Create an ADR only for a choice with meaningful alternatives that crosses modules, is expensive to reverse, or establishes a long-lived architecture. Local implementation choices stay in the focused DevMap authority.
