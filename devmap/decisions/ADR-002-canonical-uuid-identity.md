# ADR-002: Canonical UUID Identity

- Status: Accepted
- Date: 2026-09-19

## Decision

Canonical domain identities and their foreign keys use PostgreSQL `uuid` and .NET `Guid`, unless a later explicit domain decision defines a non-entity value otherwise. IDs remain opaque at API boundaries.

## Alternatives rejected

Extending prototype integer IDs would couple all new modules to structures already scheduled for migration.

## Consequences and migration

Canonical migrations must introduce Guid keys consistently. Existing integer-key rows require an explicit data migration/cutover mapping before affected prototype modules are replaced. No new canonical FK may depend on a prototype integer ID. URLs and generated clients treat UUIDs as strings.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md)
- [Canonical data model and invariants](../../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md)
