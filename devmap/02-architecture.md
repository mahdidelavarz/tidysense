# Architecture

## System shape

```text
Persian RTL React client
  -> versioned JSON/REST over same-origin /api/v1
ASP.NET Core controllers
  -> application services/use cases
  -> domain rules and aggregate transitions
  -> EF Core/Npgsql persistence + transactional outbox
PostgreSQL

AI provider SDKs and SMS providers remain infrastructure adapters behind application-owned ports.
```

## Decisions

- `LOCKED`: React/TypeScript/Vite frontend; ASP.NET Core .NET 10 backend; EF Core/Npgsql/PostgreSQL; Docker/Nginx deployment direction.
- `LOCKED`: deterministic backend services own canonical state, authorization, lifecycle validation, confirmation revalidation, and mutation. AI and the browser never own these decisions.
- `LOCKED`: consequential mutations commit canonical state and outbox intent atomically and return authoritative `CommandResult` state.
- `INFERRED`: current HTTP flow is controller -> scoped service -> `AppDbContext`, with AutoMapper for DTO mapping. This is reusable for IAM/prototype CRUD only, not automatically the canonical aggregate architecture.
- `OPEN DECISION`: canonical feature boundary and repository policy; see `DEC-001`.

## Responsibility boundaries

| Area | Owns | Must not own |
|---|---|---|
| controller | HTTP binding, status selection, calling one use case | lifecycle rules, persistence queries, provider calls |
| application service/use case | orchestration, authorization context, transaction boundary, domain invocation, result mapping | UI state, provider-specific contract leakage |
| domain | invariants, lifecycle transitions, eligibility/value rules | EF/HTTP/provider types |
| persistence | mappings, queries, constraints, migrations, concurrency persistence | product-policy invention |
| frontend API layer | transport, serialization, typed errors | canonical success inference |
| query/mutation hooks | server-state lifecycle/cache | form fields or domain authority |
| page/feature UI | interaction, presentation, local UX validation | hidden server rules or direct transport calls |

## Dependency direction

Domain depends on no web, EF, provider, or UI types. Application depends on domain and application-owned ports. Infrastructure implements ports. ASP.NET Core composes them. Frontend feature code depends on shared UI/API utilities, never the reverse.
