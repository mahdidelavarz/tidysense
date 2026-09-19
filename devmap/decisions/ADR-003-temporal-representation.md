# ADR-003: Temporal Representation and Pilot Timezone

- Status: Accepted
- Date: 2026-09-19

## Decision

Use `DateTimeOffset` for real instants and `DateOnly` for local calendar dates. Persist instants as PostgreSQL `timestamptz` with Npgsql UTC-compatible values. The pilot uses one explicitly configured application IANA timezone for Today, local day/week boundaries, Routine scheduling and review boundaries. Local times are separate wall-clock values.

## Alternatives rejected

Ambiguous local `DateTime` values and treating timestamps as planner dates both lose domain meaning. Per-user zones are deferred, not rejected.

## Consequences and migration

Audit prototype `DateTime` columns and data assumptions, convert instants with an explicit UTC interpretation, migrate planner dates to `date`, and test DST/day-boundary behavior against real PostgreSQL. A future user-profile IANA zone changes zone selection only, not stored instant/date semantics.
