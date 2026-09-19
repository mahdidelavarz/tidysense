# Backend Architecture

## Target responsibility flow

```text
Controller -> application use case -> domain transition
                              -> persistence/port -> EF/PostgreSQL
                              -> event/outbox in same transaction
Infrastructure adapters -> SMS / AI / clocks / IDs
```

## Existing evidence

Controllers receive DTOs and call scoped services. Services query `AppDbContext`, use AutoMapper, and return DTOs. `Program.cs` performs composition. Authorization uses MVC authorization filters backed by a scoped service. This is an `INFERRED` pattern for the existing IAM and prototype CRUD.

## Boundary rules

- Controllers contain no database query or lifecycle logic.
- Application services coordinate authorization, domain operations, persistence, and result mapping.
- Domain behavior uses domain types and explicit methods; do not expose EF/provider/HTTP types.
- Provider-specific request/response types remain in infrastructure.
- Queries may project directly to response DTOs when they do not bypass a product rule.
- Commands load canonical state, apply a domain operation, and persist through one explicit unit of work.
- Cross-aggregate operations use an explicit application transaction and deterministic lock order where required.

`OPEN DECISION DEC-001`: direct EF versus repository ports for canonical aggregates. Do not create parallel repository/service infrastructures before resolution.
