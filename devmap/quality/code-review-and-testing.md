# Code Review and Testing

## Review order

1. Product correctness and source traceability.
2. Security, privacy, ownership and destructive/consequential behavior.
3. Domain invariants, timezones/dates, concurrency/idempotency/atomicity.
4. API/frontend contract and state handling.
5. RTL/accessibility/responsive behavior.
6. Test evidence and operational migration/rollback.
7. Maintainability, duplication, abstraction and dependency impact.

Reviewers should ask whether an existing pattern was reused because it fits, not merely because it exists.

## Testing strategy

Use the lowest level that exercises the contract, then add integration/E2E where boundaries matter. Critical paths require end-to-end evidence; pure functions do not require browser tests. Authorization, database constraints, concurrency, idempotency, migrations and outbox require real integration. UI tests focus on behavior/states/accessibility, not implementation structure.

No numeric coverage target substitutes for scenario coverage. A changed branch with product/security significance needs a test even if global coverage is high.

## Related Mind Map

- [Validation plan and decision gates](../../mindmap/01-Closed-Discussions/021-validation-plan-and-decision-gates.md) — hard evidence and review gates.
- [Milestone exit-gate plan](../../mindmap/05-Implementation/milestone-exit-gate-plan.md) — slice completion evidence.
