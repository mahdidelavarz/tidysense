# Canonical Backend Domain Package

Status: **Documentation/reference package; not an applied migration.** Discussions 019A and 023–026 plus the DevMap ADRs are authoritative.

- [V1__canonical_domain.sql](V1__canonical_domain.sql) is a readable PostgreSQL projection, not a hand-run or Flyway migration. The historical filename is retained for links.
- [dotnet-ef-core-reference.md](dotnet-ef-core-reference.md) is the EF Core implementation contract.
- [database-invariant-test-cases.md](database-invariant-test-cases.md) is test guidance and must be read with the 023–026 amendments.

EF Core migrations generated from the canonical model are the schema authority. The current migration set targets PostgreSQL. Keep the repository's established EF/PostgreSQL identifier convention; do not add a provider-driven naming rewrite.

Canonical mappings are PostgreSQL `uuid` / .NET `Guid`, `timestamptz` / UTC-compatible `DateTimeOffset`, `date` / `DateOnly`, and `time` / `TimeOnly`. The disposable prototype schema is recreated directly; no integer-key or temporary SQL Server compatibility migration is required.
