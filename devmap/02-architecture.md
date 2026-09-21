# Architecture

```text
Persian RTL React client
  → versioned JSON at /api/v1
ASP.NET Core controllers
  → feature/application services
  → explicit domain rules
  → EF Core/Npgsql → PostgreSQL
External AI and Kavenegar → narrow infrastructure adapters
```

The canonical repository layout is root `/frontend` and `/backend`; do not move applications under `/app`.

Deterministic backend code owns authentication, authorization, domain-defined ownership, versions, lifecycle validation and mutation. AI/browser output is never authority. Consequential canonical changes and event/outbox intent commit atomically and return authoritative state.

Controllers bind HTTP and call one use case. Feature/application services orchestrate rules and transactions. Direct `AppDbContext` is normal for simple queries/persistence; repositories/ports require a real aggregate, domain, external-dependency or testing boundary. No generic repositories. Domain code does not depend on HTTP/provider types. Frontend features depend on shared infrastructure, never the reverse.

PostgreSQL is the canonical persistence provider. Domain and application code remain provider-neutral; Npgsql configuration and migrations stay in infrastructure. The temporary SQL Server decision is superseded (`DEC-015`/ADR-006). Full Compose/CI/deployment orchestration remains deferred (`DEC-011`); this does not relax secret handling or block domain implementation.

## Related Mind Map

- [AI-native MVP baseline](../mindmap/04-Specs/ai-native-mvp-baseline.md) — product loop, authority boundary and technical baseline.
- [Transactions, concurrency and idempotency](../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md) — deterministic mutation and durable event intent.
- [AI runtime boundaries](../mindmap/01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration.md) — provider ports and no-authority rule.
