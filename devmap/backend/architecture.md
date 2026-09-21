# Backend Architecture

```text
Controller → feature/application use case → domain transition
                                      ↘ AppDbContext / narrow port
                                         → EF Core / Npgsql / PostgreSQL
                                         → event/outbox in same transaction
```

- Controllers contain no persistence or lifecycle policy.
- Use cases own authorization, domain-defined ownership checks, orchestration and transaction boundaries.
- Use direct EF Core for straightforward queries/persistence and project read DTOs without unnecessary layers.
- Add a repository/port only for meaningful aggregate behavior, domain isolation, external providers (AI, Kavenegar, clock) or a valuable test boundary.
- Never add generic repositories or one repository interface per entity merely to hide EF.
- Cross-row invariants use an explicit transaction and deterministic lock order when necessary.
- Domain/application behavior is provider-neutral. Npgsql configuration and PostgreSQL migrations stay in persistence infrastructure.
- Kavenegar is the only production SMS adapter. IPPanel code is obsolete prototype migration debt.

## Related Mind Map

- [Transactions, concurrency and idempotency](../../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md) — write boundaries and durable event intent.
- [AI runtime boundaries](../../mindmap/01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration.md) — external provider ports and orchestration authority.
