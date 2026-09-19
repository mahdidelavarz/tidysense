# Backend DevMap

Read selectively:

- [`stack.md`](stack.md) — platform and dependencies
- [`architecture.md`](architecture.md) — layers, boundaries, data flow
- [`folder-structure.md`](folder-structure.md) — current and candidate module layout
- [`domain-model-and-persistence.md`](domain-model-and-persistence.md) — entities, EF, database, dates, migrations
- [`api-validation-errors.md`](api-validation-errors.md) — DTOs, routes, validation, response/errors
- [`auth-security-transactions.md`](auth-security-transactions.md) — identity, permissions, concurrency, idempotency, atomicity
- [`logging-observability.md`](logging-observability.md) — logs, traces, events and privacy
- [`testing.md`](testing.md) — meaningful backend verification

Before canonical domain work, check `../decisions/README.md`; the current backend is an early IAM/prototype scaffold, not proof that its simple CRUD shape fits every aggregate.
