# TidySense Backend

The backend targets .NET 10 and uses EF Core with Npgsql/PostgreSQL. Domain/application/API contracts stay provider-neutral.

For complete local setup and repository commands, see the root `README.md`. `dev.ps1 backend` starts the Development launch profile at `https://localhost:7075`; `/health/ready` executes a real database connectivity check without returning connection details.

## Required configuration

Supply secrets and environment values outside tracked JSON, using environment variables, .NET user-secrets, or the deployment secret store:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__SigningKey`, `Jwt__LifetimeMinutes`, `Jwt__CookieName`
- `Otp__HashingKey`
- `Kavenegar__ApiKey`, `Kavenegar__Sender`, `Kavenegar__Template`
- `ApplicationTime__TimeZoneId`

Example shape for local PostgreSQL configuration (supply credentials externally):

```text
Host=localhost;Port=5432;Database=tidysense;Username=<external>;Password=<external>
```

## Schema and verification

Use the local tool manifest (`dotnet tool restore`) and version-controlled EF migrations. The current schema is disposable and canonical; no prototype integer-key compatibility migration is maintained.

`backend.Tests` uses xUnit, `WebApplicationFactory`, and an isolated real PostgreSQL database per test fixture. Set `TIDYSENSE_TEST_POSTGRES` to a PostgreSQL administrative connection that may create/drop test databases. The same boundary can receive a PostgreSQL Testcontainers connection later without rewriting tests. EF InMemory/SQLite is not used.

Building the backend generates `openapi/TidySense.json`. Run `npm run generate:api` in `/frontend` after an API contract changes.
