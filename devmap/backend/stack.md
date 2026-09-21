# Backend Stack

## Locked

- C# on .NET 10; ASP.NET Core controllers.
- EF Core 10 with `Npgsql.EntityFrameworkCore.PostgreSQL`; PostgreSQL is the canonical active provider.
- Versioned EF Core migrations.
- RFC 9457 Problem Details, generated OpenAPI, same-origin deployment behind Nginx.
- Real PostgreSQL integration evidence through PostgreSQL Testcontainers or an explicitly configured local PostgreSQL test instance; EF InMemory is not invariant evidence.

## Inferred from code

- nullable reference types and implicit usings;
- built-in dependency injection and configuration/options;
- `async` EF/API work;
- generated ASP.NET Core OpenAPI documents and generated frontend transport types;
- typed `HttpClient` for provider adapters.

The domain/application/API contracts must not depend on PostgreSQL types, raw SQL or provider-specific query behavior. Npgsql configuration and PostgreSQL migrations are infrastructure artifacts. The temporary SQL Server provider was removed before further domain expansion.

The repository targets `net10.0`; a workspace-local .NET 10 SDK is used in the current development environment.
