# Backend Testing

`DEC-002` must select the runner, but required test responsibilities are locked.

| Level | Protects | Mandatory examples |
|---|---|---|
| domain unit/property | invariants and transitions | allowed/forbidden lifecycle, temporal boundaries, deterministic rules |
| application unit | orchestration decisions | authorization, warning/version revalidation, provider failure, command result |
| PostgreSQL integration | real persistence semantics | migration, check/FK/unique, ownership, DateOnly/timezone, concurrency, locks, idempotency, outbox atomicity |
| API integration | wire/security contract | binding, status, Problem Details, cookie/auth, cross-user non-disclosure, OpenAPI drift |
| E2E | complete critical slice | browser -> API -> PostgreSQL -> event evidence |

Use Testcontainers for .NET or the selected equivalent with real PostgreSQL. Do not use EF InMemory/SQLite as evidence for PostgreSQL constraints or concurrency.

Tests are mandatory for product rules, bug regressions, authorization/ownership, schema changes, concurrency/idempotency, destructive/consequential commands, provider failure boundaries, and API compatibility. Do not test trivial AutoMapper assignments, framework behavior, or private implementation structure without contract value.
