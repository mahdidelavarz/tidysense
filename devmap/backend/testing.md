# Backend Testing

Canonical stack: **xUnit**, **Testcontainers for .NET**, and ASP.NET Core **`WebApplicationFactory`**.

| Level | Purpose |
|---|---|
| domain xUnit | invariants, lifecycle and temporal boundaries |
| application xUnit | authorization/ownership decisions, orchestration, failure and command results |
| PostgreSQL Testcontainer | migrations, constraints, Guid FKs, DateOnly/timestamptz, indexes, concurrency, locks, idempotency and outbox atomicity |
| `WebApplicationFactory` | `/api/v1`, cookies/JWT/sessionEpoch, Problem Details, cross-user non-disclosure and OpenAPI |
| browser E2E | critical browser → API → real PostgreSQL slices |

EF InMemory/SQLite cannot prove PostgreSQL-sensitive behavior. Test product rules, bug regressions, security boundaries, schema changes and consequential commands; do not chase arbitrary coverage percentages or test framework internals.
