# Discussion 026 — Backlog Removal, Parent-Owned Undated Tasks, and Quick Capture

## Status

**CLOSED — accepted after Claude review and GPT resolution.**

```txt
STATUS = CLOSED
CLAUDE_REVIEW = COMPLETED
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
MIND_MAP = NOT_APPLIED
FORMAL_DOC_RECONCILIATION = PENDING
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is now authoritative product direction. Mind Map, formal-document, API, persistence, and prototype reconciliation remain separate follow-up work.

Primary affected accepted discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
- [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
- [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]
- [[01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context]]
- [[01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping]]

---

## 1. Problem

The previous Task model used explicit Backlog placement:

```txt
Task.placement = SCHEDULED | BACKLOG
```

with undated Task semantics roughly:

```txt
plannedDate = null
reviewDate exists
placement = BACKLOG
```

This kept unscheduled Tasks temporally visible, but introduced unnecessary user-facing and domain concepts:

```txt
Backlog
Review Due
Carry
Scheduled
Keep in Backlog
Move to Backlog
```

At the same time, Tasks already owned by a Goal or Project do not necessarily need an individual execution date to remain meaningful. They can remain part of their parent commitment and be resurfaced through the parent's review lifecycle.

Quick Capture creates a separate need: users must be able to record something immediately without deciding its final entity type, ownership, or execution date.

The accepted model therefore separates unresolved capture from committed work instead of using Backlog as a catch-all state.

---

## 2. Governing Principles

```txt
Capture ≠ Commitment
```

```txt
Standalone Task
→ owns its execution date
```

```txt
Parent-owned Task
→ may own an execution date
OR
→ may delegate temporal resurfacing to its direct parent
```

```txt
Backlog
→ removed completely from MVP
```

Core reachability rule:

> No ACTIVE commitment may become temporally unreachable.

This replaces the stronger previous interpretation that every ACTIVE child entity must own an independent temporal checkpoint.

---

## 3. Backlog Is Removed Completely

The following concepts are retired from the accepted MVP model:

```txt
Task.placement = SCHEDULED | BACKLOG
BACKLOG placement
PLACEMENT_CHANGED_TO_BACKLOG
PLACEMENT_CHANGED_TO_SCHEDULED when it exists only as the Backlog counterpart
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
IN_BACKLOG_UNSCHEDULED
Task-specific Backlog review semantics
Backlog-specific Task routes/filters/actions
```

If `Task.placement` has no independent meaning after this removal, it must be deleted rather than retained as redundant state.

### Archive is separate

```txt
Archive ≠ Backlog
Archive ≠ lifecycle state
```

Archive is a future visibility/history concern for already-resolved work. It is not a deferral mechanism for unfinished commitments.

### Freeze / Pause is separate

A future Phase-2 concept may support:

```txt
Freeze / Pause
→ Continue / Resume
```

for commitments that remain valid but are intentionally suspended. This is not part of MVP and is not a Backlog replacement.

---

## 4. Revised Task Temporal Model

### Standalone ACTIVE Task

```txt
Task.status = ACTIVE
AND goalId = null
AND projectId = null
→ plannedDate REQUIRED
```

A date-less, parent-less user capture is not yet a complete standalone canonical Task.

### Direct Goal-owned ACTIVE Task

```txt
Task.status = ACTIVE
AND goalId != null
AND projectId = null
→ plannedDate OPTIONAL
```

### Project-owned ACTIVE Task

```txt
Task.status = ACTIVE
AND projectId != null
→ plannedDate OPTIONAL
```

Project-owned Task Goal context remains derived through `Project.goalId`; no duplicate Goal ownership is introduced.

### No fake inherited execution window

An undated parent-owned Task does not inherit or persist a synthetic interval.

```txt
createdAt ≠ execution startDate
parent.reviewDate ≠ child deadline
parent.targetDate ≠ child plannedDate
```

Do not construct fake windows such as:

```txt
[createdAt → parent.targetDate]
```

The Task remains valid because it belongs to an ACTIVE parent commitment.

---

## 5. Task `reviewDate` Is Removed

No accepted MVP Task category still needs a Task-owned review checkpoint.

```txt
Standalone Task
→ plannedDate required
```

```txt
Parent-owned scheduled Task
→ plannedDate provides execution placement
```

```txt
Parent-owned undated Task
→ direct parent owns temporal resurfacing
```

Therefore Task-specific fields and semantics are retired:

```txt
Task.reviewDate
Task.reviewDateSource
Task-specific REVIEW_DUE
```

Conceptual Task timing becomes:

```txt
Task
- plannedDate?
- deadline?
```

with ownership-sensitive validity.

---

## 6. Temporal Reachability Is Responsibility-Based

Temporal responsibility is assigned deterministically:

```txt
Standalone ACTIVE Task
→ own plannedDate

Parent-owned ACTIVE Task with plannedDate
→ own plannedDate

Parent-owned ACTIVE Task without plannedDate
→ direct parent's review/lifecycle checkpoint

ACTIVE Routine
→ recurrence / next occurrence

ACTIVE Goal / Project
→ own target/review policy
```

Temporal responsibility follows direct ownership.

```txt
Project-owned undated Task
→ Project review

Direct Goal-owned undated Task
→ Goal review
```

A Goal review must not duplicate Project-owned Tasks already governed through their Project.

---

## 7. Goal / Project `reviewDate` Is System-Managed Safety-Net State

`reviewDate` for Goal and Project remains canonical product data, but it is **not required user input in the normal creation flow**.

The product must not require users to answer questions such as:

```txt
When do you want to review this Project?
When should this Goal be reconsidered?
```

If a user explicitly edits/provides a review date through an advanced/detail surface, that explicit date may be honored.

Otherwise deterministic product policy assigns the checkpoint.

### Initial default when targetDate exists

```txt
if targetDate exists
→ reviewDate = targetDate
```

The target itself is the natural safety-net boundary for an unfinished ACTIVE Goal/Project.

### Initial default when targetDate does not exist

```txt
Project.reviewDate = createdLocalDate + 30 local days
Goal.reviewDate = createdLocalDate + 90 local days
```

### Continuation review

Whenever a Goal or Project review occurs and the entity remains ACTIVE, the next review checkpoint is established again.

```txt
Project next default review
→ currentLocalDate + 30 local days

Goal next default review
→ currentLocalDate + 90 local days
```

If an authoritative target exists sooner:

```txt
reviewDate = min(defaultNextReviewDate, targetDate)
```

This rule applies on **every accepted continuation-review cycle**, not only the first review.

### `reviewDate` is a persisted snapshot, not a live formula

Accepted Claude finding:

```txt
reviewDate
→ stored canonical snapshot
→ calculated at explicit policy boundaries
→ NOT continuously re-derived from current targetDate
```

Therefore:

```txt
targetDate changed
≠ silently move existing reviewDate
```

Creation/defaulting and explicit continuation review are the ordinary policy boundaries that establish a new system-managed review snapshot.

If another command intentionally changes the review checkpoint as a visible consequence, that change must follow normal mutation/audit rules. A later target edit must not silently push the existing safety-net checkpoint away.

### Source vocabulary

Goal/Project review-date provenance remains closed vocabulary, conceptually:

```txt
USER
SYSTEM_DEFAULT
MIGRATED_DEFAULT
```

System defaults are deterministic product policy, not AI judgment.

---

## 8. Parent Review Must Include Undated Direct Child Tasks

On **every Goal/Project review cycle**, all directly owned ACTIVE child Tasks without `plannedDate` must be included deterministically.

```txt
Parent-owned ACTIVE Task
AND plannedDate = null
→ included in direct Parent review context
```

Example:

```txt
Project Review

Still active:
○ Write Docs
○ QA
```

This is not optional AI recommendation logic.

Scheduled child Tasks may also be summarized when relevant, but direct ACTIVE undated Tasks must not be omitted.

For:

```txt
Goal
└ Project
   └ undated Task
```

the Project owns the Task's review responsibility. Goal review may surface the Project but must not duplicate the Task as a direct Goal review item.

---

## 9. Today and Carry Remain Strict

Today remains execution-only:

```txt
Task appears in Today
iff
Task.status = ACTIVE
AND Task.plannedDate = currentLocalDate
```

An undated Task does not enter Today through parent dates or review state.

Carry remains:

```txt
old plannedDate
→ new plannedDate
```

Therefore an undated parent-owned Task has nothing to Carry.

It may instead be scheduled, completed, dropped, or edited.

Completing an undated parent-owned Task does not require assigning a fake date first.

---

## 10. Quick Capture UX

Quick Capture is a real capability but should not become a new user-facing ontology.

The user may use the ordinary Add Task interaction:

```txt
Title: Call dentist
Date: optional
Parent: optional
```

If both date and parent are omitted, submission must still succeed as a fast capture.

The UI does not force immediate classification.

The internal record created in this case is a `CaptureItem`, not a canonical Task.

---

## 11. CaptureItem — Durable Supporting Record

`CaptureItem` is a persisted supporting record, not a sixth canonical work entity.

Accepted minimal conceptual shape:

```txt
CaptureItem
- id
- userId
- title
- status: UNRESOLVED | RESOLVED | DISCARDED
- createdAt
- updatedAt
- source
- version
```

### CaptureItem source vocabulary

`source` must use a closed vocabulary rather than free text. Exact final vocabulary belongs to persistence reconciliation, but it should follow existing source discipline, for example:

```txt
MANUAL
SYSTEM_MIGRATED
```

`AI_ASSISTED` should be included only if an accepted flow can genuinely create CaptureItems through AI assistance. AI Planning must not use CaptureItem as a repair bucket for invalid proposals.

### No automatic expiry

An unresolved CaptureItem does not auto-expire merely because it is old.

Age may be displayed as neutral context, but age does not convert capture into commitment debt or failure.

### Optional context hints

Potential future fields such as `hintGoalId` / `hintProjectId` are not required by Discussion 026 and are deferred.

If introduced later, they must satisfy:

```txt
hint ≠ ownership
hint ≠ commitment
hint ≠ temporal responsibility
```

---

## 12. Capture Resolution and Identity

A CaptureItem can resolve to a canonical Task when sufficient commitment information exists:

```txt
plannedDate exists
OR
Goal ownership exists
OR
Project ownership exists
```

Examples:

```txt
Call dentist
→ set date
→ create standalone Task
```

```txt
Research WebGPU
→ attach to Project
→ create Project-owned Task
```

It may also resolve to a Routine or be discarded.

### Identity rule

Capture identity and canonical work identity remain separate.

```txt
CaptureItem UNRESOLVED
→ explicit resolution
→ create new canonical Task/Routine
→ CaptureItem becomes RESOLVED
```

or:

```txt
CaptureItem UNRESOLVED
→ DISCARD
→ CaptureItem becomes DISCARDED
```

Do not mutate the CaptureItem row into a Task or Routine identity.

### Audit linkage

Resolution linkage should use the existing event/correlation model rather than adding permanent audit trivia to the created Task.

Conceptually:

```txt
CAPTURE_RESOLVED event
+
created canonical entity event
→ shared correlationId / equivalent event linkage
```

A permanent `originCaptureItemId` on every Task is not required by this discussion.

---

## 13. Capture Is Not Commitment

Before resolution, a CaptureItem:

- does not enter Today,
- does not become execution-overdue,
- has no Carry semantics,
- does not count as execution failure,
- does not contribute to repeated-Carry evidence,
- does not contribute to workload/failure/capacity adaptation evidence,
- does not become a Task merely because time passes.

This boundary is strict.

---

## 14. Reconcile and CaptureItems

Unresolved CaptureItems are surfaced deterministically in Reconcile.

Conceptual resolution families:

```txt
SET_DATE
ATTACH_TO_GOAL
ATTACH_TO_PROJECT
CONVERT_TO_ROUTINE
DISCARD
```

### Severity isolation

Reconcile context must keep capture attention separate from execution severity:

```txt
executionSeverity
commitmentReviews
unresolvedCaptureCount
```

```txt
UNRESOLVED CaptureItem
→ contributes to unresolvedCaptureCount
→ does NOT contribute to actionable execution backlog count
→ does NOT contribute to oldest execution-unresolved age
→ does NOT independently escalate LIGHT / MEDIUM / RECOVERY
```

The main Reconcile navigation badge may aggregate multiple kinds of attention for compact UX, but inside Reconcile the Capture section/lane must remain semantically separate from execution severity and commitment-review lanes.

A large/old capture list may justify clearer capture-specific presentation, but age/count alone must not be reinterpreted as execution failure.

---

## 15. PlanningDraft Changes

Task proposal validation becomes ownership-sensitive.

```txt
if proposed Task is standalone
→ plannedDate required

if proposed Task is direct Goal-owned or Project-owned
→ plannedDate optional
```

Remove Task proposal fields that existed only for the old Backlog/review model:

```txt
placement
reviewDate
reviewDateSource
```

Goal/Project review checkpoint defaulting remains deterministic product policy and must not create mandatory AI questions.

Invalid/incomplete AI proposals remain PlanningDraft concerns. AI Planning must not silently create CaptureItems to repair missing ownership or scheduling information.

---

## 16. Parent Terminal Transitions

An undated Task remains an ACTIVE child Task for lifecycle purposes.

```txt
plannedDate = null
≠ resolved
≠ ignorable
```

Goal/Project terminal transitions must include such Tasks in the same deterministic child-resolution rules as dated ACTIVE Tasks.

No temporal exemption is created by being undated.

---

## 17. Discussion 025 Sequence Amendment

All Backlog-specific sequence semantics in Discussion 025 are superseded by this decision.

Replace:

```txt
ACTIVE predecessor in BACKLOG
→ unresolved
→ downstream BLOCKED
```

with:

```txt
ACTIVE valid parent-owned predecessor
AND plannedDate = null
→ unresolved
→ downstream BLOCKED
```

Standalone ACTIVE sequence members still require a `plannedDate`.

Replace `IN_BACKLOG_UNSCHEDULED` with a classification such as:

```txt
UNSCHEDULED_PARENT_OWNED
```

An undated parent-owned sequence member must not be silently scheduled by `CARRY_ALL`.

If the grouped operation is to assign it a date, preview must disclose that consequence and require explicit confirmation.

All other accepted Discussion 025 protections remain:

- stable `sequenceId`,
- hard linear dependency,
- deadline validation,
- protected manual scheduling,
- atomic/version-bound confirmation,
- Project → Sequence → Task suppression hierarchy.

---

## 18. Persistence / API Direction

Canonical Task persistence/API contracts must remove Backlog-only state:

```txt
remove Task.placement
remove Task.reviewDate
remove Task.reviewDateSource
```

Task validation becomes ownership-sensitive.

A supporting CaptureItem resource/family must support at least:

```txt
create capture
list unresolved captures
resolve capture to Task
resolve capture to Routine
discard capture
```

Exact endpoint naming is deferred to formal API reconciliation.

Canonical creation during CaptureItem resolution must still follow version/idempotency/confirmation requirements wherever the resulting action is consequential under accepted 019B/020B rules.

---

## 19. Events / Audit Direction

Retire Backlog-specific events where they no longer describe accepted domain behavior:

```txt
PLACEMENT_CHANGED_TO_BACKLOG
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
```

Task events should describe real field/lifecycle mutations rather than synthetic placement changes.

Capture requires minimal lifecycle/audit semantics conceptually including:

```txt
CAPTURE_CREATED
CAPTURE_RESOLVED
CAPTURE_DISCARDED
```

Use existing event correlation for promotion linkage.

Exact retention and event schema remain Discussion 019C reconciliation work.

---

## 20. Explicit Amendments to Earlier Decisions

### Discussion 012A

Supersede:

```txt
No ACTIVE entity may become temporally invisible
ACTIVE Task requires plannedDate OR reviewDate
Backlog remains valid placement
```

with responsibility-based commitment reachability.

### Discussion 014A

Remove Task draft fields/validation tied to Backlog:

```txt
placement
reviewDate
reviewDateSource
plannedDate OR reviewDate universal rule
```

Use ownership-sensitive validation.

### Discussion 015 / 015A

Remove:

- Backlog placement semantics,
- Task review-checkpoint actions,
- placement-change semantics,
- ownership-neutral Task temporal-checkpoint requirement,
- Task-specific REVIEW_DUE.

### Discussion 016 / 016A

Remove Task review-due eligibility derived from Task.reviewDate.

Add unresolved CaptureItem attention as a separate non-execution-severity lane/count.

### Discussion 017

Retire Backlog-specific recommendation/action vocabulary.

Parent review must deterministically include direct ACTIVE undated child Tasks.

### Discussion 019A

Remove canonical Task fields/invariants:

```txt
placement
reviewDate
reviewDateSource
ACTIVE → plannedDate OR reviewDate
```

Replace with ownership-sensitive `plannedDate` validity.

Add supporting CaptureItem persistence during formal reconciliation; it remains outside the five canonical work entities.

### Discussion 019C

Add CaptureItem lifecycle/audit/retention and correlation semantics; retire Backlog-specific events.

### Discussion 020B / 020C

Update Task API/draft validation and add supporting capture resource/command handling.

### Discussion 022

Implementation sequencing must be updated after formal reconciliation.

### Discussion 023

Remove Backlog assumptions from rolling context. Parent-owned undated Tasks remain canonical unfinished Tasks and must remain visible through their accepted parent scope.

### Discussion 025

Apply the sequence amendments in Section 17 of this discussion.

---

## 21. Final Accepted Invariants

```txt
Standalone ACTIVE Task
→ plannedDate REQUIRED
```

```txt
Direct Goal-owned ACTIVE Task
→ plannedDate OPTIONAL
```

```txt
Project-owned ACTIVE Task
→ plannedDate OPTIONAL
```

```txt
Parent-owned ACTIVE Task without plannedDate
→ no Task reviewDate
→ no Backlog
→ no independent temporal checkpoint
→ direct parent owns temporal resurfacing
```

```txt
Task enters Today
→ only when status = ACTIVE AND plannedDate = currentLocalDate
```

```txt
Carry
→ only plannedDate old → plannedDate new
```

```txt
Goal / Project reviewDate
→ not required user input in normal creation
→ stored snapshot
→ deterministic system default when omitted
```

```txt
Goal / Project targetDate exists at initial default boundary
→ default reviewDate = targetDate
```

```txt
Project without targetDate
→ initial default reviewDate = createdLocalDate + 30 days
```

```txt
Goal without targetDate
→ initial default reviewDate = createdLocalDate + 90 days
```

```txt
Every continuation review that keeps parent ACTIVE
→ establishes next reviewDate snapshot
```

```txt
Unresolved CaptureItem
→ persisted supporting record
→ status = UNRESOLVED
→ not canonical commitment
→ Reconcile-visible
→ excluded from execution severity/failure evidence
```

```txt
Capture resolution
→ creates new canonical Task/Routine identity
→ CaptureItem becomes RESOLVED
→ audit linkage through event correlation
```

---

## 22. Claude Review Resolution

Claude found no Blocking issues in the reviewed version.

Two Important findings were accepted and resolved:

### Finding 1 — reviewDate live formula ambiguity

Resolved by making Goal/Project `reviewDate` a persisted snapshot established at explicit policy boundaries rather than a value continuously derived from `targetDate`.

```txt
targetDate change
≠ silent reviewDate change
```

### Finding 2 — CaptureItem missing lifecycle status

Resolved by adding:

```txt
status: UNRESOLVED | RESOLVED | DISCARDED
```

This makes unresolved queries/counts deterministic without reconstructing state from event history.

Accepted Minor clarifications:

- parent undated-task inclusion applies on every review cycle,
- CaptureItem source uses closed vocabulary,
- CaptureItem promotion uses event correlation rather than requiring a permanent origin field on Task/Routine,
- optional Goal/Project hints on CaptureItem are deferred,
- CaptureItems do not auto-expire,
- Reconcile navigation badge may aggregate attention while internal lanes remain semantically separate.

After these fixes:

```txt
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
```

---

## 23. Mind Map Impact — NOT YET APPLIED

Later reconciliation should update at least:

### Product Model

- remove Backlog placement,
- remove Task reviewDate,
- add ownership-sensitive Task temporal validity,
- add supporting CaptureItem concept,
- parent-owned undated Tasks are valid.

### MVP Core Loop

```txt
Capture
→ resolve into commitment
→ execute dated Tasks / RoutineOccurrences
→ review parent-owned undated work through direct parent
→ Reconcile execution, parent reviews, and captures as distinct concerns
```

### Today

- only dated ACTIVE Tasks,
- no inherited/fake child dates.

### Reconcile

- remove Backlog lane/actions,
- add unresolved CaptureItem attention,
- parent reviews include undated direct child Tasks,
- CaptureItem count remains isolated from execution severity.

### AI Responsibilities / Guardrails

- no Backlog proposals,
- ownership-sensitive Task validity,
- no Task reviewDate invention,
- no CaptureItem as an AI repair bucket,
- no fake inherited execution windows,
- no capture-as-failure evidence,
- no mandatory user question for Goal/Project reviewDate.

### Data / Events

- remove Backlog events,
- add CaptureItem status/lifecycle/audit linkage,
- amend sequence unscheduled classification.

`MIND_MAP = NOT_APPLIED`

---

## 24. Formal Document Reconciliation — PENDING

Later reconciliation is required across at least:

- temporal reachability specification,
- canonical Task model and invariants,
- Goal/Project review default policy,
- PlanningDraft schema/validation,
- Task execution and Carry contract,
- Reconcile eligibility/presentation/severity,
- parent review contract,
- canonical persistence model,
- event taxonomy/retention,
- API/frontend state contracts,
- structured-output validation,
- implementation plan,
- rolling planning context,
- dependency-sequence semantics,
- Mind Map.

```txt
FORMAL_DOC_RECONCILIATION = PENDING
```

---

# خلاصهٔ فارسی

Discussion 026 بسته شد و Backlog به‌طور کامل از مدل MVP حذف می‌شود. Task مستقل فعال باید `plannedDate` داشته باشد، اما Task متعلق به Goal یا Project می‌تواند بدون تاریخ باقی بماند. Task بدون تاریخ نه Backlog است، نه `reviewDate` مستقل دارد و نه تاریخ مصنوعی از Parent به ارث می‌برد؛ مسئولیت resurfacing آن با Parent مستقیم است.

`Task.reviewDate`، `Task.reviewDateSource` و `Task.placement` حذف می‌شوند. Today فقط Task فعال با `plannedDate = today` را نشان می‌دهد و Carry فقط تغییر یک plannedDate موجود به plannedDate جدید است.

Goal و Project همچنان review checkpoint دارند، ولی `reviewDate` ورودی اجباری کاربر نیست. اگر targetDate هنگام defaulting وجود داشته باشد، reviewDate پیش‌فرض همان targetDate است؛ در غیر این صورت Project سی روز و Goal نود روز بعد review می‌شوند. reviewDate یک snapshot ذخیره‌شده است، نه فرمول زنده؛ تغییر بعدی targetDate نباید checkpoint فعلی را بی‌صدا جابه‌جا کند. هر review که Parent را ACTIVE نگه می‌دارد checkpoint بعدی را دوباره تعیین می‌کند.

Quick Capture با یک `CaptureItem` durable حل می‌شود. CaptureItem یک work entity جدید نیست و وضعیت `UNRESOLVED | RESOLVED | DISCARDED` دارد. تا قبل از resolve شدن commitment محسوب نمی‌شود، وارد Today/overdue/severity/failure evidence نمی‌شود و در Reconcile در بخش جداگانه برای تعیین تکلیف ظاهر می‌شود. تبدیل آن به Task یا Routine یک identity جدید canonical می‌سازد و ارتباط audit از طریق event correlation حفظ می‌شود.

Discussion 025 نیز amend می‌شود: تمام semantics مربوط به Backlog حذف و با parent-owned undated Task جایگزین می‌شود. Mind Map و formal specifications هنوز در این مرحله اعمال نشده‌اند.