# Backend Testing

Canonical stack: **xUnit**, ASP.NET Core **`WebApplicationFactory`**, and a real PostgreSQL integration environment. Prefer PostgreSQL Testcontainers where Docker is available; an explicitly configured local PostgreSQL instance is acceptable when Docker is unavailable.

| Level | Purpose |
|---|---|
| domain xUnit | invariants, lifecycle and temporal boundaries |
| application xUnit | authorization/ownership decisions, orchestration, failure and command results |
| PostgreSQL Testcontainer or isolated local database | migrations, constraints, Guid FKs, DateOnly/timestamptz mappings, indexes, concurrency, locks, idempotency and outbox atomicity |
| `WebApplicationFactory` | `/api/v1`, cookies/JWT/sessionEpoch, Problem Details, cross-user non-disclosure and OpenAPI |
| browser E2E | critical browser → API → real PostgreSQL slices |

EF InMemory/SQLite cannot prove PostgreSQL behavior and must not replace these tests. Keep provider-neutral rule tests separate from Npgsql mapping/migration evidence. Test product rules, bug regressions, security boundaries, schema changes and consequential commands; do not chase arbitrary coverage percentages or test framework internals.
