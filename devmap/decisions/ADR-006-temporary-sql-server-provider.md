# ADR-006: Temporary SQL Server Persistence Provider

- Status: Superseded
- Date: 2026-09-20
- Superseded: 2026-09-20

## Context

PostgreSQL was the planned provider, but its local setup blocks current M1 development. The prototype/dev database is disposable. Continued relational integration evidence is required, and EF InMemory is not an acceptable substitute.

## Decision

Use EF Core's SQL Server provider for current development/runtime persistence. Generate the canonical schema directly with Guid identities, `DateTimeOffset` instants, `DateOnly` local dates, Project ownership, and no persisted session model. Test with SQL Server Testcontainers where Docker is available or isolated SQL Server LocalDB as the current Windows equivalent.

Keep provider configuration, mappings, connection details, and migrations in infrastructure. Domain entities, application services, DTOs, validation, API contracts, and frontend contracts must not depend on SQL Server-specific behavior. Avoid raw provider SQL and provider-only query patterns unless separately justified.

## Consequences

- `Microsoft.EntityFrameworkCore.SqlServer` replaces Npgsql in the active backend.
- The current migration set is a SQL Server infrastructure artifact, not a domain contract.
- No compatibility migration is built for disposable prototype integer-key data.
- PostgreSQL-specific mappings, Testcontainers configuration, connection syntax, identifier behavior, and migration syntax are deferred.
- Provider-neutral decisions—Guid identity, temporal meanings, ownership, auth, API versioning, errors, and EF naming—remain unchanged.
- A future PostgreSQL return requires a reviewed provider package/configuration change, new provider-specific migrations, and real PostgreSQL integration evidence; it must not require domain/API redesign.

## Revisit condition

Revisit when PostgreSQL is available in the target development/deployment environment or a permanent production provider is approved. Temporary status does not imply automatic reversion.

## Supersession outcome

PostgreSQL became available locally before further domain development. The SQL Server provider, LocalDB test infrastructure and SQL Server migrations were removed, and PostgreSQL/Npgsql became canonical again. The M1 domain, application, API, OpenAPI and frontend contracts required no provider-specific changes, confirming the intended boundary. This ADR remains as historical evidence only and is not active guidance.
