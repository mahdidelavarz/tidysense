# Development Flow

The normal path is sequential where contracts depend on earlier work; safe frontend fixture work may begin after the contract is reviewed.

| Stage | Input | Responsibility | Output / completion evidence |
|---|---|---|---|
| 1. product rule | owning Mind Map source | identify behavior, lifecycle, states, conflicts | source links and acceptance scenarios |
| 2. domain contract | product rule | model identity, invariants, transitions, authority | domain types/tests; no infrastructure types |
| 3. schema | domain contract | constraints, indexes, ownership, versioning | reviewed EF model + migration + rollback/upgrade plan |
| 4. persistence | schema | user-scoped queries, mappings, concurrency | PostgreSQL integration tests |
| 5. application logic | domain + persistence | authorization, orchestration, transaction/idempotency/outbox | use-case tests and command result |
| 6. HTTP contract | application result | DTOs, validation, versioned route, Problem Details | OpenAPI/contract tests |
| 7. frontend contract | reviewed HTTP contract | TS types/schema and transport function | typed service test/fixture |
| 8. server-state adapter | transport | query keys, query/mutation, invalidation, lost-response state | hook tests where behavior is non-trivial |
| 9. form/interaction | product flow + schema | RHF/Zod form, Persian/RTL states, warnings/confirmation | validation and interaction tests |
| 10. page integration | feature units | route, auth boundary, loading/empty/error/forbidden/conflict states | responsive accessible page |
| 11. end-to-end verification | completed slice | real PostgreSQL + browser + events | acceptance scenario passes |
| 12. documentation | reusable change only | update one DevMap authority and summaries if material | no drift |

Stop at the first unresolved `CONFLICT` or `OPEN DECISION` that materially changes downstream work. Do not hide it in an implementation choice.
