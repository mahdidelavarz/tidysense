# Domain Model and Persistence

## Domain rules

- `LOCKED`: lifecycle and eligibility rules live in domain/application code and are enforced again by database constraints where expressible.
- `LOCKED`: canonical identity and ownership are explicit; optimistic `version` participates in writes.
- `OPEN DECISION DEC-012`: physical canonical/auth ID type is not yet locked. Do not mix integer and UUID identity within a new aggregate graph by accident.
- `LOCKED`: instants and local dates are different semantic types; database storage uses `timestamptz` and `date` respectively.
- `OPEN DECISION DEC-013`: choose one CLR instant representation (`DateTimeOffset` or strictly UTC `DateTime`); local calendar dates use `DateOnly` in the canonical model.
- `LOCKED`: enum wire/database vocabularies are explicit stable strings, not accidental C# member names.
- `LOCKED`: broad cascade graphs must not perform product lifecycle transitions.

Canonical aggregates should protect setters and expose named operations. EF needs a private/default constructor or field access, not public mutation for convenience. The current mutable IAM/prototype models are `INFERRED` legacy style and must not be copied into canonical lifecycle entities.

## EF and database

- Configure contract-critical columns, lengths, conversions, constraints, indexes, ownership FKs, delete behavior, and concurrency in Fluent API.
- User-scoped queries include `userId` in the predicate; permission alone does not grant cross-user data access.
- Use `AsNoTracking` for read-only queries and projections.
- Canonical lifecycle rows are not soft-deleted; terminal lifecycle and events preserve history. Privacy deletion is a separate governed operation. Existing prototype soft-delete filters are not a reusable default.
- Prevent N+1 and unbounded reads; project the fields a read model needs.
- Increment explicit `Version` on canonical mutation and translate `DbUpdateConcurrencyException` into the conflict contract.

## Migration flow

1. Resolve product/schema authority and migration impact.
2. Change model/configuration.
3. Generate EF migration and inspect every operation.
4. Apply to empty PostgreSQL and supported upgrade state.
5. Test constraints, ownership, concurrency, indexes, and rollback/recovery plan.
6. Never edit an already released migration; add a corrective migration.

The Mind Map `V1__canonical_domain.sql` is reference DDL, not evidence that the current EF schema implements it. Current EF migrations use framework defaults and differ from the proposed canonical schema (`CON-005`, `CON-009`, `CON-010`).
