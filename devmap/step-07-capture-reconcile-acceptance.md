# Step 7 Capture and Deterministic Reconcile Acceptance Contract

**Status:** Implemented and verified on 2026-10-02. This contract applies to CaptureItem, Task Carry and protection, deterministic Reconcile and the commitment-review lane. AI explanation and recommendation remain with STEP-10.

## Canonical behavior

### Capture

1. An authenticated user can create, list, resolve and discard only their own CaptureItems. Cross-user access returns an ownership-safe `404`.
2. A CaptureItem has a title, a status (`UNRESOLVED`, `RESOLVED`, `DISCARDED`), a closed `source` (`MANUAL`, `SYSTEM_MIGRATED`) and a version. It never expires, never enters Today and never counts toward execution severity.
3. Resolution creates a new Task or Routine with its own identity in the same transaction and marks the CaptureItem `RESOLVED`. `CAPTURE_RESOLVED` and the created-entity event share one transaction and correlation id. Task and Routine carry no origin field.
4. A resolved Task must satisfy the Task rule: a planned date or a Goal/Project owner. Discard marks the item `DISCARDED`. A resolved or discarded item cannot change again.

### Carry and protection

5. `Carry` is an explicit command that moves an ACTIVE dated Task to another planned date, today or later and not after its deadline. It never moves other Tasks.
6. `carryCount` is derived from `TASK_CARRIED` events recorded while the Task was due (planned date on or before that local date). It is never stored on the Task.
7. A Task has one `isProtected` flag with reason `USER`. A Task is treated as protected when the flag is set or a deadline exists. Protected Tasks are never offered Drop inside Reconcile and are rejected by bulk Drop.

### Facts, severity and rules

8. Evaluation first runs Routine occurrence cleanup, then derives facts for the current local date. A fact needs a user decision; raw `MISSED` occurrences, future work and resolved history never produce one.
9. Execution reason codes: `EXECUTION_OVERDUE` (ACTIVE, planned date before today), `REPEATED_CARRY` (`carryCount ≥ 2`), `DEADLINE_RISK` (deadline within 2 local days or passed, with no planned date today or later), `DROPPED_PREDECESSOR` (a sequence whose first unresolved member is `DROPPED` while later ACTIVE members are overdue). A Task appears once with all its reason codes.
10. A Task blocked by an unresolved predecessor is context only: it is excluded from the actionable count and from the oldest age.
11. `KEEP_UNCHANGED` records `TASK_REVIEW_KEPT`. It suppresses an overdue or deadline-risk fact for that local date only, and a repeated-Carry fact until the next Carry. Skip and dismiss never resolve a fact.
12. Severity uses the actionable set only: `RECOVERY` for 8 or more items, or an oldest age above 7 days with at least 3 items, or 3 or more affected parents; `MEDIUM` for 3–7 items, an oldest age of 3 days or more, any repeated Carry, any deadline risk, or 2 affected parents; otherwise `LIGHT`. No actionable item means no execution severity.
13. Rule catalog `2026-10-02.1`: `R1` repeated Carry, `R2` execution age of 7 days or more, `R3` deadline risk, `R6` structural conflict (dropped predecessor; parent terminal blockers stay in the terminal preview). Rules attach allowed actions; they never change severity.
14. Review-due Goals and Projects and unresolved CaptureItems are counted separately and never change execution severity.

### Grouping and actions

15. The execution lane groups by owner (Project, direct Goal, standalone), then by sequence when two or more members are relevant, otherwise by Task.
16. Every Reconcile mutation is a server preview followed by a confirmation. The preview stores the exact Task ids, versions, classifications, warnings and a hash, and expires after 15 minutes. Submit re-derives it under locks; any difference returns `CONFIRMATION_STALE` and changes nothing.
17. Actions: `REPLAN_TASKS` (one explicit date; an undated Task is scheduled only with an acknowledged warning), `DROP_TASKS`, `KEEP_TASKS`, `SEQUENCE_CARRY_ALL`, `SEQUENCE_DROP_ALL`, `DETACH_DROPPED_PREDECESSOR`. Completion uses the existing Task command.
18. `SEQUENCE_CARRY_ALL` anchors the first overdue remaining member on the chosen date and shifts every other dated remaining member by the same number of days. Classifications: `WILL_SHIFT_NORMALLY`, `HAS_PROTECTED_MANUAL_SCHEDULE` (individually rescheduled and dated today or later; kept unless explicitly included), `UNSCHEDULED_PARENT_OWNED` (never scheduled by this action), `HAS_TEMPORAL_CONFLICT` (would pass a deadline; blocks the action).
19. A Drop that leaves a Project or Goal with no ACTIVE Task carries a `PARENT_LEFT_WITHOUT_ACTIVE_TASKS` warning that must be acknowledged. The parent stays ACTIVE.
20. Bulk application is all-or-nothing: one command, one `CommandResult`, one event per changed Task with actor `USER`, all sharing the transaction and correlation id.

### Commitment review

21. A Project is review-due when ACTIVE with `reviewDate ≤ today`. A Goal is review-due under the same condition and at most once per 30 local days after its last continuation decision.
22. Goal review offers `CONTINUE` and `REVIEW_LATER`; Project review offers `KEEP_WITH_NEW_REVIEW_DATE`. Each stores the next review snapshot: the given date, or `min(today + 90/30 days, targetDate)` ignoring a target that is not in the future. Abandon, Complete and Stop hand off to the existing terminal preview.
23. Every review item lists its direct ACTIVE undated Tasks. A Project-owned Task is never listed under the Goal. `ADJUST_CHILD_EXECUTION` uses the Task actions above on those Tasks.

### Session and presentation

24. Opening Reconcile creates a `ReconcileSession` (`OPEN`, `COMPLETED`, `ABANDONED`, `EXPIRED`) with the evaluated local date, timezone, rules catalog version, severity, counts, facts and rule matches. One session is open per user; an open session from an earlier local date expires when a new one opens.
25. Reconcile never blocks Today. At most one automatic prompt is shown per local date; dismiss or skip hides it for that date only.

## Events

`CAPTURE_CREATED`, `CAPTURE_RESOLVED`, `CAPTURE_DISCARDED`, `TASK_CARRIED`, `TASK_REVIEW_KEPT`, `GOAL_CONTINUATION_RESOLVED`, `PROJECT_REVIEW_RESOLVED`, `RECONCILE_SESSION_OPENED`, `RECONCILE_SESSION_COMPLETED`, `RECONCILE_PROMPT_RESOLVED`, `RECONCILE_ACTION_CONFIRMED`. Existing `TASK_CREATED`, `TASK_UPDATED`, `TASK_DROPPED` and `ROUTINE_CREATED` are reused. Payloads carry classification fields only.

Events written by a confirmed Reconcile action carry the confirmation id and session id.

## Recorded deviations and assumptions

- **Commitment-review lane added to STEP-07.** Confirmed with the owner: 016A, 017 §3/R7 and 026 §8 place it in deterministic Reconcile and no later step owns it.
- **R4 and R5 deferred.** Calibration, evidence quality and observed periods are not defined precisely enough to lock.
- **Carry is command-only.** Editing `plannedDate` through the Task form is not a Carry and does not count.
- **Deadline-risk threshold of 2 local days** and the **manual-schedule definition** in item 18 are implementation choices; the Mind Map names neither.
- **Session status follows 019C.** Evaluation is synchronous, so 020B's `RUNNING` and `FACTS_READY` are not separate persisted states.
- **Absence context is not tracked.** `absenceDays` and evidence confidence are not computed; no rule depends on them.
- **`SPLIT_TASK`, `REVIEW_WITH_AI`, `REVIEW_CONFLICTING_TASKS` and Project `ADJUST` target-date actions are not offered.**
- **Cascade events may carry actor `USER`.** An additive change to the M1 command executor so each Task in a user-confirmed bulk action is recorded as a user decision.
- **`ActionConfirmation` links to its `CommandResult` through its events**, not a column.

## API surface

- `GET/POST /api/v1/captures`, `POST /api/v1/captures/{id}/resolve-task`, `/resolve-routine`, `/discard`
- `POST /api/v1/tasks/{id}/carry`; `isProtected` and `carryCount` on Task
- `GET /api/v1/reconcile/overview`, `POST /api/v1/reconcile/prompt`
- `POST /api/v1/reconcile/sessions`, `GET /api/v1/reconcile/sessions/{id}`, `POST /api/v1/reconcile/sessions/{id}/complete`
- `POST /api/v1/reconcile/sessions/{id}/previews`, `POST /api/v1/reconcile/confirmations/{id}/submit`
- `POST /api/v1/goals/{id}/review`, `POST /api/v1/projects/{id}/review`

Commands require `Idempotency-Key`; entity commands require `expectedVersion`.

Persian UI terms: Reconcile is «بازبینی», a quick capture is «یادداشت سریع», Carry is «انتقال», Keep is «فعلاً بماند», commitment review is «مرور تعهدها».

## Verification evidence

- [Pure rule and preview tests](../backend.Tests/ReconcileRulesTests.cs): Discussion 016 severity scenarios, breadth and parent escalation, repeated Carry and Keep suppression, blocked-descendant exclusion, sequence fallback, dropped predecessor, deadline risk and protection, review lane and Goal cadence, `SEQUENCE_CARRY_ALL` offsets and classifications, protected and parent-emptying Drop, and a preview hash that follows versions but not titles.
- [Capture and Reconcile PostgreSQL/API tests](../backend.Tests/CaptureReconcileModuleTests.cs): capture ownership, resolution correlation and replay, Carry bounds and derived count, session facts and rule matches, one open session per user, atomic bulk replan with one user event per Task, stale confirmation and a submit-versus-edit race, warning acknowledgement, sequence carry/detach/drop through the API, Keep and prompt dismissal lasting one local day, commitment reviews, and free-text-free payloads.
- [Migration round-trip](../backend.Tests/DeliveryMigrationTests.cs) from the Step 6 baseline, including the one-open-session index.
- [Reconcile page tests](../frontend/src/features/reconcile/components/ReconcilePage.test.tsx), [Today tests](../frontend/src/features/today/components/TodayView.test.tsx) and [create-flow tests](../frontend/src/features/shell/components/CreateSheet.test.tsx): separate lanes, non-colour severity label, preview before apply, warning acknowledgement, stale recovery, blocked preview, review decision, empty and unavailable states, the Today offer and the capture fallback.
- [Browser acceptance](../frontend/e2e/reconcile.spec.ts): a title-only capture from Add Task, the Today offer, capture resolved to a Task, an overdue sequence re-anchored through Review & Apply, and Today used throughout.
- Verified 2026-10-02: `./dev.ps1 check` passed with 96 backend and 34 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 9 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes.

## Not covered by this evidence

- The `Reconcile facts/severity/reasons` and `preview/warning/confirmation` rows of the Contract Freeze Register remain `DRAFT`: their lock needs the named reviewers, which this step did not obtain.
- Screen-reader and keyboard behaviour was exercised only through role-based automated tests, not a manual assistive-technology pass.
- Abandoned sessions and expired confirmations are never swept; `ABANDONED`, `SUBMITTED` and `CANCELLED` are allowed by the schema but not yet produced.
