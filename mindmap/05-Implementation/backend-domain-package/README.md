# Canonical Backend Domain Package

Status: **Documentation/reference package; not an applied migration.** Discussions 019A and 023–026 plus the DevMap ADRs are authoritative.

- [V1__canonical_domain.sql](V1__canonical_domain.sql) is a readable PostgreSQL projection, not a hand-run or Flyway migration. The historical filename is retained for links.
- [dotnet-ef-core-reference.md](dotnet-ef-core-reference.md) is the EF Core implementation contract.
- [database-invariant-test-cases.md](database-invariant-test-cases.md) is test guidance and must be read with the 023–026 amendments.

EF Core migrations generated from the canonical model are the schema authority. Keep the repository’s established EF/PostgreSQL identifier convention; the reference deliberately uses quoted PascalCase identifiers and does not mandate global snake_case.

Canonical IDs are PostgreSQL `uuid` / .NET `Guid`. Instants are `timestamptz` / `DateTimeOffset`; planner dates are `date` / `DateOnly`; local slots are `time` / `TimeOnly`. Existing integer IDs and ambiguous prototype `DateTime` columns require an explicit cutover migration and must not be extended.
