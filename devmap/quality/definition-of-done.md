# Definition of Done

A feature is done only when applicable items are evidenced:

- accepted product behavior and terminology are implemented;
- no unresolved conflict/open decision was silently chosen;
- architecture and dependency direction are respected;
- ownership, authorization, validation, lifecycle and temporal rules are enforced server-side;
- schema/migration/constraints are reviewed and real-PostgreSQL tested;
- API contract, error contract, expected versions, idempotency and CommandResult semantics are respected;
- events/outbox and observability/privacy requirements exist where required;
- frontend handles initial/background loading, empty, error, validation, submitting, disabled/read-only, unauthorized, forbidden, not-found, stale/conflict and success as applicable;
- Persian copy and RTL behavior are verified on supported widths;
- keyboard, focus, announcements, labels, contrast and touch targets are considered;
- meaningful domain, integration, contract, UI and E2E tests pass by risk;
- no unnecessary duplication, dependency, abstraction, or unrelated refactor was introduced;
- secrets/sensitive data are absent from code, logs and client errors;
- DevMap was updated only if a reusable convention changed;
- product acceptance scenarios were rechecked against the owning source.
