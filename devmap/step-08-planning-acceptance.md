# Step 8 Planning Foundation Acceptance Contract

**Status:** Implemented and verified on 2026-10-03. This contract applies to PlanningAttempt, PlanningDraft and its revisions, PlanningFact, the bounded planning context and the deterministic mock generator. A real AI provider, its runtime controls and the clarification conversation remain with STEP-09.

## Canonical behavior

### Attempt

1. An authenticated user can start, read and cancel only their own attempts. Cross-user access returns an ownership-safe `404`.
2. `clientAttemptId` identifies an attempt per user. The same id with the same request returns the existing attempt and never generates again; the same id with a different request returns `409 IDEMPOTENCY_MISMATCH`.
3. Statuses are `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`. Generation runs on a background worker; the client polls the attempt by id. Partial output is never exposed.
4. Cancelling is harmless to repeat. A result that arrives after cancellation is discarded and creates no draft.
5. A failed attempt keeps the user's intention and a failure code (`DRAFT_INVALID`, `CONTEXT_INTEGRITY`, `PROVIDER_ERROR`, `GENERATION_TIMEOUT`, `GENERATION_INTERRUPTED`, `DRAFT_COLLISION`). A retry is a new attempt.
6. One unfinished flow per user: a queued or running attempt, or one `REVIEWABLE` draft. Starting another returns `409 PLANNING_DRAFT_ACTIVE` unless `replaceActive` is sent, which cancels the attempt and marks the draft `SUPERSEDED`.
7. Planning starts globally, from an active owned Goal, or from an active owned Project, never from both.

### Generation and validation

8. The generator is a port (`IPlanningGenerator`) that receives the intention and the context and returns a draft. It has no other access. The only implementation is the deterministic mock.
9. The output must carry the fingerprint of the context it was given; otherwise the attempt fails with `CONTEXT_INTEGRITY`.
10. One bounded repair normalises text, drops fields that do not belong to an entity type and fills review-date defaults. It never changes what is proposed, its owner, its dates or its recurrence. Output that is still structurally invalid fails the attempt.
11. Structural limits per draft: 1 Goal, 5 Projects, 15 Tasks, 5 Routines, 20 proposals, 10 planning details, 10 assumptions, 10 warnings, 5 unresolved questions. Parent mapping is Project → Goal and Task/Routine → Goal or Project; a proposal has a draft parent, the planning context, or neither.
12. Review-date defaults: Goal 90 local days, Project 30, capped by an earlier target date that is not in the past, labelled `SYSTEM_DEFAULT`. An edited review date becomes `USER`.
13. The detailed window is the seven local days starting on the generation date.

### Review states

14. States are derived on every read: `INCLUDED`, `EXCLUDED`, `BLOCKED`, `BLOCKED_BY_ANCESTOR`. `CONFIRMED` does not exist as a draft status.
15. Blocking reasons: `DATE_OUTSIDE_WINDOW`, `DATE_IN_PAST`, `DATE_AFTER_DEADLINE`, `STANDALONE_TASK_NEEDS_DATE`, `HARD_CONSTRAINT_CONFLICT`, `UNSUPPORTED_RECURRENCE`, `INVALID_TIMES`, `START_IN_PAST`, `TARGET_IN_PAST`, `REVIEW_IN_PAST`, `NOT_ALLOWED_IN_CONTEXT`, a generator warning of severity `BLOCKING`, and for the draft `FIRST_WEEK_OVERLOADED` (more than 21 entries).
16. An excluded parent excludes its descendants; the children themselves are not rewritten. A blocked parent makes its descendants `BLOCKED_BY_ANCESTOR`; correcting the parent releases them.
17. A generator's blocking warning on a proposal is cleared when the user changes that proposal.
18. The first-week view is derived: a Task on its planned date, a Routine on each window date its recurrence produces.
19. A draft can be applied when nothing selected is blocked and at least one proposal or planning detail is included.

### Revisions

20. An edit stores a new complete revision; earlier revisions never change. It requires `expectedRevision` (`409 CONFLICT_STALE_VERSION` otherwise) and extends the draft's expiry.
21. An edit cannot add, remove or reclassify items, or change provenance, fact type or fact scope. A structurally invalid edit is rejected with `DRAFT_EDIT_INVALID`; an edit with no effect with `NO_CHANGES`.
22. A new revision cancels any confirmation made for the previous one.

### Preview, confirmation and apply

23. A preview is a stored `ActionConfirmation` bound to one draft revision, with the items and planning details it will create, its warnings and a hash. It expires after 15 minutes or with the draft.
24. Excluding a parent with included children produces the warning `DESCENDANTS_EXCLUDED_WITH_PARENT`, which must be acknowledged by id and hash.
25. Submit locks the context parents, the confirmation and the draft, rebuilds the preview and rejects any difference with `409 CONFIRMATION_STALE`. A changed context Goal or Project version makes the preview stale.
26. Apply is one command and one `CommandResult`: every approved Goal, Project, Task, Routine and planning detail is created, or nothing is. Created entities have source `AI_ASSISTED`. Each has one event with actor `USER`, sharing the transaction and correlation id and carrying the confirmation id.
27. After apply the draft is `EXPIRED` and stays linked to its `RESOLVED` confirmation. `GET` of the confirmation returns the command's result, which is how a client that lost its submission recovers.
28. A draft expires 24 hours after its last revision. An expired draft cannot be previewed or applied and no longer blocks a new flow.

### Planning details (PlanningFact)

29. A planning detail belongs to exactly one Goal or one standalone Project. Planning inside a Project that has a Goal uses and extends the Goal's details.
30. The vocabulary is closed: `UNAVAILABLE_WEEKDAY`, `UNAVAILABLE_DATE`, `UNAVAILABLE_DATE_RANGE` (may be `HARD` or `SOFT`), `AVAILABLE_DEVICE`, `CURRENT_LEVEL`, `LEARNING_FOCUS`, `EXCLUDED_PATH` (`SOFT` or `INFORMATIONAL`). Category is derived from the type. Only the field the type owns is stored.
31. Details are proposed in the draft, selected independently of the work, and persisted only on apply with source `USER_CONFIRMED_AI_EXTRACTION`. Rejecting all of them is disclosed and does not block approval.
32. `HARD` details block conflicting AI-proposed Task dates and Routine weekdays in their scope. They do not restrict manual creation or editing.
33. A detail already active in the scope, one whose date has passed, or one without a supported scope is blocked.
34. The user can list a Goal's or standalone Project's details and remove one. A date-bounded detail whose last date has passed is reported as `EXPIRED` and is not supplied to planning.

### Context

35. The context is rebuilt from product state: scope, its active planning details (never truncated), active Projects of a Goal, active Routines, up to 30 unfinished Tasks with their deterministic Reconcile reason codes, the previous seven local days (completed, carried and dropped Tasks, Routine done/missed counts), the local date, timezone and window.
36. Nothing outside the scope and nothing older is supplied. A global flow receives no work at all.
37. The attempt stores the builder version, the fingerprint and a manifest of categories and counts only.

## Events

`PLANNING_DRAFT_CREATED` (actor `SYSTEM_DETERMINISTIC`), `PLANNING_DRAFT_REVISED`, `PLANNING_DRAFT_CANCELLED`, `PLANNING_DRAFT_APPLIED`, `PLANNING_FACT_CREATED`, `PLANNING_FACT_REMOVED`. Existing `GOAL_CREATED`, `PROJECT_CREATED`, `TASK_CREATED` and `ROUTINE_CREATED` are reused. Payloads carry classifications and counts only.

## Recorded deviations and assumptions

These were chosen during implementation and confirmed with the owner on 2026-10-03.

- **No clarification conversation.** The flow goes from intention to draft. The clarifying turns, `Draft now` and `INPUT_BLOCKED` of Discussion 013 need a model and move to STEP-09. (Implemented there; see `step-09-ai-planning-acceptance.md`. Statement 8's "only implementation" and the failure-code list of statement 5 are extended by that contract.)
- **Recurrence stays at the three types of STEP-06.** `WEEKDAYS`, `WEEKLY` and `N_TIMES_PER_WEEK` are blocked as unsupported, never converted.
- **An applied draft becomes `EXPIRED`.** 020B forbids `CONFIRMED` and names no post-apply status.
- **`SUPERSEDED` is used for a draft replaced by a new flow.** Revisions are rows, so a replaced revision needs no status.
- **Draft lifetime of 24 hours and confirmation lifetime of 15 minutes** are implementation choices.
- **Task proposals carry no `reviewDate` or `placement`.** Discussion 026 removed them; an undated Task needs a Goal or Project owner.
- **The first-week projection is derived by the server**, so a generator cannot return one that disagrees with the proposals.
- **Entity type cannot be changed in an edit.** The user excludes the item and creates the right one manually.
- **Routine times of day are not editable in the draft sheet.**
- **Fixture selection** uses the `X-Planning-Fixture` request header and is honoured only in Development and Testing.
- **Planning is a sidebar and drawer destination**, not a tab, with contextual entries on Goal and Project detail pages.
- **`ActionConfirmation.ReconcileSessionId` is now nullable**, with a check that a confirmation has exactly one subject.
- **Week-two continuation choices** (`CONTINUE_AS_IS`, `ADJUST`, `PAUSE_OR_STOP`, `REVIEW_WITH_AI`) are not implemented; the Goal Continuation Check of STEP-07 is unchanged.

## API surface

- `GET /api/v1/planning/active`
- `POST /api/v1/planning/attempts` (`202`), `GET /api/v1/planning/attempts/{id}`, `POST /api/v1/planning/attempts/{id}/cancel`
- `GET /api/v1/planning/drafts/{id}`, `POST /api/v1/planning/drafts/{id}/revisions`, `/cancel`, `/previews`
- `GET /api/v1/planning/confirmations/{id}`, `POST /api/v1/planning/confirmations/{id}/submit`
- `GET /api/v1/planning/facts?goalId=|projectId=`, `POST /api/v1/planning/facts/{id}/remove`

Revise, cancel draft, submit and remove require `Idempotency-Key`. Starting and cancelling an attempt and creating a preview do not.

Persian UI terms: Planning is «برنامه‌ریزی», a draft is «پیش‌نویس», a planning detail is «جزئیات برنامه‌ریزی», the final confirmation is «مرور نهایی و تأیید».

## Verification evidence

- [Pure rule tests](../backend.Tests/PlanningDraftRulesTests.cs): the valid fixture with defaults and derived first week, the three invalid fixtures, repair idempotence, the target-date cap, blocked and excluded ancestor cascades, HARD versus SOFT details and their scope, fact scope, duplication and expiry, the closed vocabulary, ownership, window and context rules, first-week overload and the preview hash.
- [Planning PostgreSQL/API tests](../backend.Tests/PlanningModuleTests.cs): attempt idempotency with one generation, ownership isolation, no entity before approval, explicit replacement, cancellation followed by a late result, five failing fixtures with preserved input, repairable, empty and blocked drafts, immutable revisions and edit validation, a confirmation invalidated by a revision, atomic apply with replay and user events, recovery through the confirmation, warning acknowledgement, planning inside a Goal and inside its Project, a stale confirmation that changes nothing, context bounds and manifest, and draft expiry.
- [Migration round trip](../backend.Tests/DeliveryMigrationTests.cs) from the Step 7 baseline, including the one-reviewable-draft index, the confirmation subject check and the planning-detail constraints.
- [Phase tests](../frontend/src/features/planning/types/planning.phase.test.ts) and [Planning page tests](../frontend/src/features/planning/components/PlanningPage.test.tsx): every client state from input to command result, polling by id without a second start, the collision choice, failure with retry, edit and manual path, cancellation, revisions shown from the server response, the edit sheet, acknowledgement, stale recovery, lost-response recovery, expiry and unavailability.
- [Browser acceptance](../frontend/e2e/planning.spec.ts): intention, reviewed and edited draft, a declined planning detail, one confirmation, created entities and planning detail, and the contextual entry from the Goal.
- Verified 2026-10-03: `./dev.ps1 check` passed with 123 backend and 47 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 10 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes. Draft-review and confirmation screenshots were inspected.

## Not covered by this evidence

- The `Planning Attempt/Draft/revisions` and `preview/warning/confirmation` rows of the Contract Freeze Register remain `DRAFT`: their lock needs the named reviewers.
- A planning detail cannot be edited after confirmation, only removed. `PLANNING_FACT_UPDATED`, `PLANNING_FACT_CONFIRMED` and `PLANNING_FACT_EXPIRED` are not produced; expiry is derived on read.
- The manual path opens the ordinary create menu; the intention is not carried into the form.
- The generation timeout (60 seconds) and the recovery of an attempt whose worker was lost (failed after 2 minutes, on the next read) have no automated test.
- The worker queue is in process. An attempt queued when the backend stops is failed on a later read, not resumed.
- Expired drafts and attempts are closed when the user next reads planning; nothing sweeps them.
- Screen-reader and keyboard behaviour was exercised only through role-based automated tests.
- The Reconcile browser test's Today heading locator was made exact because the planning test adds a Routine for the shared test user.
