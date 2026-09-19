# ADR-004: Backend Persistence Boundary

- Status: Accepted
- Date: 2026-09-19

## Decision

Organize backend work by feature/application use case. Use `AppDbContext` directly for simple queries and straightforward persistence. Introduce a repository or port only for meaningful aggregate behavior, a domain boundary, an external dependency, or a test seam whose value exceeds its ceremony. Do not create generic repositories or one interface per entity.

## Consequences

EF Core is an accepted application/infrastructure dependency where appropriate. Business invariants remain explicit in domain/application code; query projection remains close to the use case. Ports are narrow and behavior-oriented.
