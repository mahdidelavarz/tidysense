# Step 4 Goal and Project Acceptance Contract

**Status:** Implemented and verified on 2026-09-27. This contract applies only to Goal and Project. Task and Routine child behavior is integrated by their owning later steps.

## Canonical behavior

1. An authenticated user can create, list, read and edit only their own Goals and Projects. Cross-user reads and writes return ownership-safe `404` responses.
2. Goal creation requires `title` and `desiredOutcome`. Project creation requires `title`; `completionMeaning` and a parent Goal are optional.
3. New records start at version `1`, status `ACTIVE`, source `MANUAL`, and receive a persisted review snapshot. An explicit review date has source `USER`; otherwise the review date is the target date, or local creation date plus 90 days for Goal and 30 days for Project, with source `SYSTEM_DEFAULT`.
4. Editing `targetDate` does not silently change the existing `reviewDate`. An explicit review-date edit records source `USER`. Every successful write advances the entity version exactly once.
5. A Project may attach only to an ACTIVE Goal owned by the same user. A Goal terminal transaction and Project attachment serialize on the Goal so a new active child cannot appear beneath a terminal Goal.
6. Project terminal status is explicitly `COMPLETED` or `STOPPED`. It never changes a parent Goal status. Goal terminal status is explicitly `ACHIEVED` or `ABANDONED` and is never inferred from execution or child completion.
7. Terminal flow requires a server preview bound to the owned entity version, target status and current blocking child set. A changed version or preview returns a conflict and performs no mutation.
8. An ACTIVE Project blocks its parent Goal terminal transition. The Project terminal preview has no Task/Routine blockers in Step 4 because those modules do not exist yet; their owning steps must extend the same blocker contract before they allow child creation.
9. Create, edit and terminal commands are user-scoped and idempotent. Matching replay returns the same authoritative outcome without advancing version or emitting another event. Reusing a key for a different request returns `IDEMPOTENCY_MISMATCH`.
10. Every committed mutation writes its `CommandResult`, minimized semantic domain event and outbox intent atomically. Event payloads contain approved classification fields or changed-field names, not titles, outcomes, credentials or other free text.

## API surface

- `GET/POST /api/v1/goals`
- `GET/PUT /api/v1/goals/{id}`
- `POST /api/v1/goals/{id}/terminal-preview`
- `POST /api/v1/goals/{id}/terminal`
- `GET/POST /api/v1/projects`
- `GET/PUT /api/v1/projects/{id}`
- `POST /api/v1/projects/{id}/terminal-preview`
- `POST /api/v1/projects/{id}/terminal`

Lists use a bounded opaque cursor with deterministic `(createdAt DESC, id DESC)` ordering and an optional allowlisted lifecycle-status filter. Writes require `Idempotency-Key`; updates and lifecycle commands require `expectedVersion`.

## Required evidence

- Domain/defaulting and lifecycle tests.
- PostgreSQL migration, constraints, ownership, parent attachment race, optimistic version, idempotency and event/outbox tests.
- API contract tests for success, validation, ownership-safe absence, stale version, stale preview and terminal blockers.
- Generated OpenAPI/frontend types.
- Persian RTL frontend list, create, edit, detail, preview, confirmation, error, empty and loading states.
- Frontend behavior tests and a browser flow that creates a Goal and child Project, observes the terminal blocker, resolves the Project, and explicitly resolves the Goal.

## Verification evidence

- [Goal/Project PostgreSQL and API tests](../backend.Tests/GoalProjectModuleTests.cs) prove defaults, review snapshots, replay/mismatch, optimistic conflict, ownership-safe absence, cursor traversal, terminal preview/blockers, minimized events, same-owner foreign keys and the Goal-terminal/Project-attachment race.
- [Migration round-trip test](../backend.Tests/DeliveryMigrationTests.cs) upgrades existing Step 3 Project data, verifies the canonical backfill and description rename, rolls back, and reapplies the migration.
- [Generated OpenAPI](../backend/openapi/TidySense.json) and [generated frontend transport types](../frontend/src/shared/api/generated.ts) include both modules and terminal contracts.
- [Frontend behavior tests](../frontend/src/features/goals/components/GoalsPage.test.tsx) and [create-flow tests](../frontend/src/features/shell/components/CreateSheet.test.tsx), [Goal terminal tests](../frontend/src/features/goals/components/GoalDetailView.test.tsx) and [Project behavior tests](../frontend/src/features/projects/components/ProjectReadView.test.tsx) cover empty/loading/not-found, create/edit, blocker preview and explicit terminal confirmation.
- [Browser acceptance](../frontend/e2e/parents.spec.ts) creates a Goal and child Project, observes the blocker, completes the Project and explicitly achieves the Goal. The isolated runner also executes both authentication regressions.
- Verified 2026-09-27: `./dev.ps1 check` passed with 36 backend PostgreSQL/API tests and 12 frontend tests plus typecheck, lint, build and OpenAPI generation. `./auth-e2e.ps1` passed all 3 Chrome tests against a fresh isolated PostgreSQL database.
