# Remaining Conflicts and Open Decisions — 2026-09-21

## Conflicts

`CON-013` is open in later implementation-planning artifacts. Authoritative Discussion 022 assigns M4 to Capture/deterministic Reconcile, M5 to Planning foundation and M6 to AI Planning. The separate dependency graph/exit-gate plan assigns M4 to Planning mock, M5 to real AI Planning and M6 to deterministic Reconcile, and the exit-gate table also duplicates M6. Stable DevMap STEP IDs follow Discussion 022 and retain compatible dependency constraints; reconcile those Mind Map implementation artifacts before STEP-07. STEP-02 authentication is unaffected.

No product-document conflict was reopened by restoring PostgreSQL. The M1 foundation retains Guid identity, JWT-cookie plus `sessionEpoch`, Kavenegar, `/api/v1`, canonical temporal types and owner-scoped Project read.

## Open decision

`DEC-011` remains deferred: Docker Compose/local orchestration, CI provider, full deployment pipeline and broader orchestration. It does not block domain implementation. `DEC-015` and ADR-006 are superseded historical evidence; PostgreSQL/Npgsql is canonical again.

## First-slice blockers

The prototype/dev data remains disposable, so PostgreSQL received a fresh canonical migration rather than translated SQL Server history. The migration applies cleanly and the M1 persistence/security suite passes against isolated real PostgreSQL databases. Before enabling real external auth/SMS, supply environment-specific JWT/Kavenegar values and rotate any historically exposed credentials.

No unresolved product or recurring architecture decision blocks STEP-02. `CON-013` must be cleared before STEP-07; broader orchestration remains intentionally unconfirmed and may not be silently decided during feature work.
