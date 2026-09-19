# Backend Summary

- Stack: .NET 10, ASP.NET Core controllers, EF Core 10/Npgsql/PostgreSQL, AutoMapper, Swagger.
- Current flow: controller -> scoped service -> `AppDbContext`; async EF operations; DTO mapping with AutoMapper; DataAnnotations on some request DTOs.
- Canonical rule: domain/application services own lifecycle and authority; persistence enforces IDs, ownership, constraints, versions, and indexes.
- APIs must be `/api/v1`, camelCase JSON, direct success bodies, RFC 9457 Problem Details, ownership-safe not-found, UTC instants and explicit local dates.
- Writes that can be retried or have consequences require transaction, idempotency, expected version, event/outbox, and authoritative result.
- Auth, ID migration, repository policy, error middleware, and test framework contain conflicts/open decisions.
- Never extend the prototype Project model as the canonical Project without resolving `CON-005`.

Read `backend/README.md` before backend work.
