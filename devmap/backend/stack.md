# Backend Stack

## Locked

- C# on .NET 10; ASP.NET Core controllers.
- EF Core 10 with Npgsql and PostgreSQL.
- Versioned EF Core migrations.
- RFC 9457 Problem Details, generated OpenAPI, same-origin deployment behind Nginx.
- Real PostgreSQL integration evidence; an in-memory provider is not invariant evidence.

## Inferred from code

- nullable reference types and implicit usings;
- built-in dependency injection and configuration/options;
- `async` EF/API work;
- AutoMapper for simple DTO projection/mapping;
- Swagger/Swashbuckle in development;
- typed `HttpClient` for provider adapters.

Exact test packages, health-check packages, resilience components, and AI SDKs are not selected. Do not add them silently; follow dependency policy and open decisions.

The repository targets `net10.0`, but the inspected machine has only SDK 9.0.102. Pin/install the approved SDK before treating build results as code evidence.
