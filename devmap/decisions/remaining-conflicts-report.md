# Remaining Conflicts and Open Decisions — 2026-09-21

## Conflicts

No documentation conflict is open. `CON-013` was resolved on 2026-10-02: the Mind Map dependency graph, exit-gate plan, freeze register and ownership, risk, test and reuse matrices now use Discussion 022's labels (M4 Capture/deterministic Reconcile, M5 Planning foundation, M6 AI Planning), the duplicate M6 exit-gate row is gone, and deterministic Reconcile no longer depends on the Planning mock.

No product-document conflict was reopened by restoring PostgreSQL. The M1 foundation retains Guid identity, JWT-cookie plus `sessionEpoch`, Kavenegar, `/api/v1`, canonical temporal types and owner-scoped Project read.

## Open decision

`DEC-011` remains deferred: Docker Compose/local orchestration, CI provider, full deployment pipeline and broader orchestration. It does not block domain implementation. `DEC-015` and ADR-006 are superseded historical evidence; PostgreSQL/Npgsql is canonical again.

## First-slice blockers

The prototype/dev data remains disposable, so PostgreSQL received a fresh canonical migration rather than translated SQL Server history. The migration applies cleanly and the M1 persistence/security suite passes against isolated real PostgreSQL databases. Before enabling real external auth/SMS, supply environment-specific JWT/Kavenegar values and rotate any historically exposed credentials.

No unresolved product or recurring architecture decision blocks STEP-07. Broader orchestration remains intentionally unconfirmed and may not be silently decided during feature work.
