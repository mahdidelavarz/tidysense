# Architecture Summary

Root `/frontend` React/TypeScript communicates with root `/backend` .NET 10/ASP.NET Core over `/api/v1`; EF Core/Npgsql persists to PostgreSQL. Backend authority owns authentication, domain-defined ownership, versions and mutation. Domain/application contracts remain provider-neutral; AI and Kavenegar are narrow infrastructure adapters.

Feature/application services may use `AppDbContext` directly for simple work. Repositories/ports exist only for meaningful aggregate/domain/external/testing boundaries; no generic repositories. Consequential state and event/outbox intent commit atomically. Full local/CI/deployment orchestration is deferred under `DEC-011`.
