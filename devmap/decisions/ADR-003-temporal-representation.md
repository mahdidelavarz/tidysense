# ADR-003: Temporal Representation and Pilot Timezone

- Status: Accepted
- Date: 2026-09-19

## Decision

Use `DateTimeOffset` for real instants and `DateOnly` for local calendar dates. PostgreSQL persists them as `timestamp with time zone` and `date`; Npgsql requires UTC-offset `DateTimeOffset` values when writing instants. The pilot uses one explicitly configured application IANA timezone for Today, local day/week boundaries, Routine scheduling and review boundaries. Local times are separate wall-clock values.

## Alternatives rejected

Ambiguous local `DateTime` values and treating timestamps as planner dates both lose domain meaning. Per-user zones are deferred, not rejected.

## Consequences and migration

The disposable prototype schema is not migrated. New canonical columns use explicit instant/date meanings and are tested against real PostgreSQL. API offsets represent an instant; PostgreSQL does not preserve the original textual offset. A future user-profile IANA zone changes zone selection only, not stored instant/date semantics.

## Related Mind Map

- [Temporal checkpoint baseline](../../mindmap/01-Closed-Discussions/012a-temporal-checkpoint-amendment.md)
- [Routine local-date amendment](../../mindmap/01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment.md)
