# Step 6 Routine and RoutineOccurrence Acceptance Contract

**Status:** Implemented and verified on 2026-10-02. This contract applies to Routine, RoutineOccurrence and their Today integration. Reconcile classification, reminders and AI remain with their owning later steps.

## Canonical behavior

1. An authenticated user can create, list, read, edit and stop only their own Routines. Cross-user reads and writes return ownership-safe `404` responses. RoutineOccurrence has no `UserId`; ownership is always resolved through its Routine.
2. A Routine belongs to one Goal, one Project, or neither. It attaches only to an ACTIVE parent, under the same Goal-then-Project lock order Task uses.
3. Supported recurrence is `DAILY`, `SPECIFIC_WEEKDAYS` (ISO day numbers, Monday = 1) and `MONTHLY_ON_DAY`. Anything else is rejected with validation and never converted.
4. A Routine has zero or more unique whole-minute local `timesOfDay`. Duplicates are invalid. With none, an eligible date has one untimed occurrence; otherwise one occurrence per slot.
5. Occurrence identity is `(routine, date, time)` when timed and `(routine, date)` when untimed, each enforced by its own filtered unique index. No sentinel time exists.
6. Eligibility uses the inclusive range `effectiveFromLocalDate`…`effectiveUntilLocalDate`. A new Routine cannot start in the past. `createdAt`/`stoppedAt` are audit timestamps only.
7. Occurrences are materialized lazily when Today or a Routine's history is assembled, never after the current local date. Today's slots are created first; older unmaterialized dates are backfilled oldest-first, at most 31 dates per Routine and 124 per evaluation, until the full history exists. A per-Routine watermark records progress.
8. Materialization locks the Routine row, so concurrent evaluations create each occurrence exactly once.
9. A pending timed occurrence becomes `MISSED` when a later slot of the same Routine on the same date is reached, or when its local date ends. An untimed one becomes `MISSED` when its local date ends. There is no grace period and no background job.
10. `PENDING → DONE` is a user command. A pending occurrence whose boundary already passed is rejected (`OCCURRENCE_MISSED`) rather than completed. `DONE ↔ MISSED` is an explicit correction; the scheduled date and time never change. Occurrences are never carried.
11. Stop sets `STOPPED`, `stoppedAt` and `effectiveUntilLocalDate = today`. An occurrence that belongs to today stays resolvable; nothing later is generated. Stopping an already stopped Routine is a no-op success with no event and no version change.
12. A stopped Routine never becomes active again. Resume creates a new continuation Routine with an explicit first date; a stopped Routine has at most one direct continuation.
13. Recurrence or slot edits are prospective: the command first fixes every slot up to and including today under the old definition, then applies the new one from the next local date. Title, description and parent edits apply immediately.
14. A Project terminal transition stops its active Routines in the same transaction, lists them in the preview (`cascades`) and binds them into the preview hash. An active direct Routine blocks a Goal terminal transition.
15. Every command is user-scoped, idempotent and version-checked, and writes its `CommandResult`, semantic event and outbox intent atomically. Payloads carry classification fields only, never titles or descriptions.

## Events

`ROUTINE_CREATED`, `ROUTINE_CONTINUATION_CREATED`, `ROUTINE_UPDATED`, `ROUTINE_RECURRENCE_CHANGED`, `ROUTINE_STOPPED`, `ROUTINE_OCCURRENCE_CREATED`, `ROUTINE_OCCURRENCE_DONE`, `ROUTINE_OCCURRENCE_MISSED`, `ROUTINE_OCCURRENCE_CORRECTED`.

System consequences (`_CREATED`, `_MISSED`, and `ROUTINE_STOPPED` caused by a Project) use actor `SYSTEM_DETERMINISTIC`. Cascade events share the parent event's `TransactionId` and name it as `CausationId`.

## Recorded deviations and assumptions

- **No `_EXPOSED`, `_INVALIDATED` or `_REMOVED_BEFORE_EXPOSURE` events.** Occurrences are never generated past today, so no future row exists to invalidate (019B §8, 019C §18).
- **`MONTHLY_ON_DAY` uses the Persian (Jalali) calendar** and is stored as `{"type":"MONTHLY_ON_DAY","calendar":"PERSIAN","dayOfMonth":n}`. A month without that day produces no occurrence. The Mind Map does not name the calendar.
- **No `UserId` on RoutineOccurrence**, following DevMap persistence guidance over 019A.
- **"Apply a recurrence edit today"** (015 §7.4, optional) is not implemented. `effectiveFromLocalDate` is not editable after creation.
- **Empty range.** A Routine stopped before its first date stores `effectiveUntilLocalDate = effectiveFromLocalDate − 1`; the range check allows exactly that.
- **`N_TIMES_PER_WEEK`, `WEEKDAYS` and `WEEKLY`** from Discussion 014 are not separate types; the latter two are expressed as weekday selections.

## API surface

- `GET/POST /api/v1/routines`, `GET/PUT /api/v1/routines/{id}`
- `POST /api/v1/routines/{id}/stop`, `POST /api/v1/routines/{id}/continuation`
- `GET /api/v1/routines/{id}/occurrences`
- `POST /api/v1/routine-occurrences/{id}/done`, `POST /api/v1/routine-occurrences/{id}/correct`
- `GET /api/v1/today` returns `localDate`, `tasks` and `routineOccurrences`
- Terminal previews return `cascades` next to `blockers`

Routine lists use `(createdAt DESC, id DESC)`; occurrence history uses `(scheduledLocalDate DESC, scheduledLocalTime DESC)`. Writes require `Idempotency-Key`.

## Verification evidence

- [Pure scheduling tests](../backend.Tests/RoutineScheduleTests.cs): recurrence types, Jalali month edges, unsupported types, slot validation, inclusive range, slot and day-end Missed rules, Tehran midnight, and the Berlin DST gap and repeated hour.
- [Routine PostgreSQL and API tests](../backend.Tests/RoutineModuleTests.cs): validation and ownership, exactly-once creation under concurrent Today requests, both unique indexes, boundary resolution and corrections, bounded catch-up over a 100-day absence, stop and continuation, prospective edits, Project cascade with stale-preview conflict, Goal blocker, the create-versus-terminal race, and free-text-free payloads.
- [Migration round-trip](../backend.Tests/DeliveryMigrationTests.cs) from the Step 5 baseline.
- [Frontend form tests](../frontend/src/features/routines/components/RoutineForm.test.tsx), [Today tests](../frontend/src/features/today/components/TodayView.test.tsx), [create-flow tests](../frontend/src/features/shell/components/CreateSheet.test.tsx) and [Project terminal test](../frontend/src/features/projects/components/ProjectReadView.test.tsx).
- [Browser acceptance](../frontend/e2e/routines.spec.ts): a two-slot Routine and a Task executed together from Today, then the Routine stopped. [Responsive spec](../frontend/e2e/responsive.spec.ts) proves the tab bar keeps four links and Routines is in the drawer and sidebar.
- Verified 2026-10-02: `./dev.ps1 check` passed with 69 backend and 26 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 8 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes.
