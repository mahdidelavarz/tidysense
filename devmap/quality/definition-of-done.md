# Definition of Done

A feature is done only when applicable items are evidenced:

- accepted product behavior and terminology are implemented;
- no unresolved conflict/open decision was silently chosen;
- architecture and dependency direction are respected;
- ownership, authorization, validation, lifecycle and temporal rules are enforced server-side;
- schema/migration/constraints are reviewed and tested against real PostgreSQL;
- API contract, error contract, expected versions, idempotency and CommandResult semantics are respected;
- events/outbox and observability/privacy requirements exist where required;
- frontend handles initial/background loading, empty, error, validation, submitting, disabled/read-only, unauthorized, forbidden, not-found, stale/conflict and success as applicable;
- Persian copy and RTL behavior are verified on supported widths;
- keyboard, focus, announcements, labels, contrast and touch targets are considered;
- xUnit domain/application tests, real-PostgreSQL integration tests (Testcontainers or an explicitly configured local instance), `WebApplicationFactory` API tests, Vitest/Testing Library behavior tests and Playwright critical-flow tests pass where applicable;
- no unnecessary duplication, dependency, abstraction, or unrelated refactor was introduced;
- secrets/sensitive data are absent from code, logs and client errors;
- DevMap was updated only if a reusable convention changed;
- product acceptance scenarios were rechecked against the owning source.

## Related Mind Map

- [Updated MVP implementation plan](../../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md) — cross-cutting slice evidence.
- [Milestone and exit-gate plan](../../mindmap/05-Implementation/milestone-exit-gate-plan.md) — required product-slice evidence and gate failure rule.
