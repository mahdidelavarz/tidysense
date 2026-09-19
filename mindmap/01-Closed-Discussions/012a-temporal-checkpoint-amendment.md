# Discussion 012A — Temporal Checkpoint Amendment

## Status

Accepted and closed after GPT × Claude review.

This amendment reopens and resolves one narrow part of Discussion 012: temporal visibility for ACTIVE entities. It does not change accepted entity definitions, ownership, lifecycle meanings, or the Goal outcome boundary.

Related discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]

---

## 1. Accepted Core Principle

```txt
No ACTIVE entity may become temporally invisible.
```

Every ACTIVE canonical entity must have a derivable future temporal checkpoint.

A temporal checkpoint is not necessarily an execution deadline. It may mean:

- execute a Task on a planned date
- review whether a Task, Project, or Goal should remain active
- reach a Project or Goal target date
- generate the next Routine occurrence from recurrence

Accepted conceptual mapping:

```txt
Goal
→ targetDate and/or reviewDate

Project
→ targetDate and/or reviewDate

Task
→ plannedDate and/or reviewDate

Routine
→ next occurrence derived from recurrence
```

Routine is not mechanically forced to store a separate review date when its active recurrence already yields a deterministic next occurrence.

---

## 2. Goal Temporal Rule

Accepted conceptual fields:

```txt
targetDate?
reviewDate
```

Rules:

- `targetDate` remains optional.
- An ACTIVE Goal must have a `reviewDate`.
- Missing `reviewDate` is supplied by deterministic product policy.
- Goal creation or draft approval must not require a new clarification question solely to obtain this date.
- The default is visible and editable.

Initial system-default policy:

```txt
baseGoalReviewDate = createdLocalDate + 90 days

Goal.reviewDate =
  if targetDate exists:
    min(baseGoalReviewDate, targetDate)
  else:
    baseGoalReviewDate
```

This prevents a short-term Goal target from arriving before its first review checkpoint.

The 90-day interval is an initial MVP policy and may later be calibrated without changing the invariant.

---

## 3. Project Temporal Rule

Accepted conceptual fields:

```txt
targetDate?
reviewDate?
```

An ACTIVE Project must have at least one temporal checkpoint:

```txt
targetDate != null
OR
reviewDate != null
```

When the user does not provide a review date, the product assigns one without adding another mandatory planning question.

Initial system-default policy:

```txt
baseProjectReviewDate = createdLocalDate + 30 days

Project.reviewDate =
  if targetDate exists:
    min(baseProjectReviewDate, targetDate)
  else:
    baseProjectReviewDate
```

The review checkpoint must never be generated after an earlier Project target date.

The 30-day interval is an initial MVP policy and may later be calibrated.

---

## 4. Task Temporal Rule

Accepted conceptual fields:

```txt
plannedDate?
reviewDate?
deadline?
```

An ACTIVE Task must have at least one temporal checkpoint:

```txt
plannedDate != null
OR
reviewDate != null
```

A Task may intentionally remain unscheduled for execution:

```txt
plannedDate = null
+ reviewDate exists
→ valid ACTIVE Task
```

When a Task has no `plannedDate`, the product assigns a visible editable `reviewDate` through the applicable planning or Backlog policy.

Deadline guardrail:

```txt
Task.reviewDate =
  if deadline exists:
    min(policyReviewDate, deadline)
  else:
    policyReviewDate
```

A Task review checkpoint must not occur after an earlier hard deadline.

The exact Task review interval is deferred to the Task-placement and Backlog policy, but the temporal-visibility invariant is accepted.

---

## 5. Routine Temporal Rule

An ACTIVE Routine satisfies temporal visibility when:

```txt
ACTIVE Routine
→ valid recurrence
→ derivable next occurrence
```

A separate periodic Routine review date may be introduced later, but it is not required by this amendment merely to avoid temporal invisibility.

---

## 6. System Defaults Must Preserve Low-Friction Planning

The product must not introduce mandatory questions such as:

```txt
When should we review this Goal again?
When should this undated Task return?
When should this Project be reconsidered?
```

Accepted behavior:

```txt
missing user-provided checkpoint
→ apply visible editable system default
→ keep draft approval possible
```

System defaults are deterministic product policy, not AI guesses about motivation, capacity, or intent.

---

## 7. Backlog Remains a Valid Placement

Backlog remains an explicit Task placement meaning:

```txt
not scheduled for execution now
```

A review checkpoint means:

```txt
when that placement or commitment should be reconsidered
```

Therefore:

```txt
Backlog
≠ forgotten forever
```

Accepted rules:

- Backlog remains valid.
- Backlog Tasks still require a future review checkpoint.
- `reviewDate` complements Backlog rather than replacing it.
- Moving a Task to Backlog must not make it temporally invisible.

---

## 8. Derived `nextTemporalCheckpoint`

`nextTemporalCheckpoint` is derived and must not become a separate editable canonical source of truth.

```txt
Task.nextTemporalCheckpoint
= earliest existing value among plannedDate and reviewDate

Project.nextTemporalCheckpoint
= earliest existing value among targetDate and reviewDate

Goal.nextTemporalCheckpoint
= earliest existing value among targetDate and reviewDate

Routine.nextTemporalCheckpoint
= next occurrence derived from recurrence
```

Reasons:

- avoids duplicated date truth
- prevents synchronization defects
- preserves source-of-truth principles from Discussion 014
- supports deterministic queries without another editable field

Persistence, indexes, and query strategy belong to Discussion 019.

---

## 9. `REVIEW_DUE` Is Not `EXECUTION_OVERDUE`

These conditions are separate:

```txt
EXECUTION_OVERDUE
Task.plannedDate < currentLocalDate
AND Task remains ACTIVE
```

```txt
REVIEW_DUE
entity.reviewDate <= currentLocalDate
AND entity remains ACTIVE
```

`REVIEW_DUE` means a management checkpoint arrived. It does not mean execution failed or work is late.

Accepted severity guardrail:

```txt
multiple REVIEW_DUE items
+ no overdue execution
≠ automatic MEDIUM or RECOVERY
```

Review checkpoints must be grouped separately from overdue execution and must not inflate Reconcile severity as if each were delayed work.

Presentation guardrail for Discussion 016 amendment:

```txt
many REVIEW_DUE items arriving together
→ group and chunk review presentation
→ do not expose one overwhelming flat list
→ do not convert the burst into execution severity
```

This is especially important because system defaults may cause entities created together to reach review boundaries together.

---

## 10. Goal Continuation Dependency

When a Goal review checkpoint arrives, Reconcile may present a deterministic continuation decision:

```txt
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

The question must use fixed neutral wording, such as:

> Do you still want to continue this Goal?

This mechanism:

- does not ask why execution changed
- does not ask about motivation or emotion
- does not ask the user to predict future capacity
- does not infer intent from absence
- records explicit current intent

Exact wording, cadence, suppression, and lifecycle handling remain defined by the companion Discussion 017 amendment.

---

## 11. Review Resolution

Claude confirmed that:

- the temporal-visibility principle is coherent
- recurrence correctly exempts Routine from a mechanical stored review-date requirement
- system defaults preserve the low-friction principles of Discussions 013 and 014
- `nextTemporalCheckpoint` should remain derived
- `REVIEW_DUE` must stay separate from execution overdue
- Backlog remains valid and still requires future reviewability

Claude identified one important edge case:

```txt
fixed review default later than an existing target date
→ target arrives before the first review checkpoint
```

Accepted correction:

```txt
Goal.reviewDate = min(createdLocalDate + 90 days, targetDate?)
Project.reviewDate = min(createdLocalDate + 30 days, targetDate?)
Task.reviewDate = min(policyReviewDate, deadline?) when undated
```

No blocking or important unresolved issue remains in this amendment.

---

## 12. Required Follow-Up Amendments

Acceptance of this amendment requires explicit updates to:

### Discussion 014

- add Goal, Project, and Task checkpoint fields to `PlanningDraft`
- define visible deterministic defaults
- avoid mandatory clarification solely for review dates
- validate temporal visibility before approval

### Discussion 015

- distinguish `plannedDate`, `reviewDate`, `targetDate`, and `deadline`
- distinguish execution overdue from review due
- define Task placement and Backlog effects
- preserve Today as `plannedDate = current local date`

### Discussion 016

- add review-checkpoint eligibility semantics
- prevent review-due counts from inflating execution severity
- group and chunk simultaneous `REVIEW_DUE` items
- keep review presentation separate from overdue backlog presentation

### Discussion 017

- finalize Goal Continuation Check
- preserve fixed neutral wording and long per-Goal cadence
- keep causal, emotional, motivational, and capacity questions forbidden

### Discussion 019

- persistence, indexes, provenance, event history, and derived checkpoint queries

### Discussion 020

- deterministic default assignment and rule evaluation

### Discussion 021

- test default generation, target/deadline minimum selection, timezone boundaries, review-versus-overdue separation, burst chunking, and repeated-prompt suppression

---

## 13. Mind Map Impact — Record Only, Do Not Apply Yet

### Product Vision

Add:

- active commitments must not become temporally invisible
- Backlog is deliberate deferral, not permanent disappearance
- review checkpoints are not execution failure
- system defaults preserve low-friction planning

### MVP Core Loop

```txt
Create or approve ACTIVE entity
→ use explicit temporal field when provided
→ otherwise assign visible system review default
→ cap default by earlier target date or deadline
→ derive nextTemporalCheckpoint
→ surface execution or review at the correct boundary
```

### User Flow

```txt
undated Task
→ visible review default
→ owner or Backlog placement remains visible
→ review checkpoint arrives
→ keep, schedule, backlog again, or drop
```

### AI Responsibilities

- AI does not invent checkpoint dates from psychology or prose
- defaults are deterministic product policy
- AI may explain a default but does not need to ask for one

### AI Guardrails

- no ACTIVE entity without a derivable checkpoint
- no mandatory clarification solely for a review date
- no conflation of review due and execution overdue
- no duplicate editable `nextTemporalCheckpoint`
- no default checkpoint later than an earlier target date or deadline

### Data Events

Candidates:

```txt
TEMPORAL_CHECKPOINT_DEFAULTED
TEMPORAL_CHECKPOINT_CHANGED
TEMPORAL_CHECKPOINT_REACHED
ENTITY_REVIEW_DEFERRED
ENTITY_INTENT_REAFFIRMED
```

### Current Decisions

Record:

- ACTIVE entities require derivable temporal visibility
- system defaults preserve low-friction planning
- target dates and deadlines cap generated review defaults
- `nextTemporalCheckpoint` is derived
- Backlog remains explicit placement
- review due remains distinct from execution overdue
- simultaneous review-due items require grouped and chunked presentation

---

## 14. Affected Formal Documents

Accepted decisions should later update or create:

- canonical temporal-visibility invariant specification
- Goal, Project, and Task checkpoint field specification
- deterministic review-default policy
- Backlog reviewability policy
- derived checkpoint query specification
- execution-overdue versus review-due specification
- Reconcile review-checkpoint presentation policy
- Goal continuation decision specification
- data and event specification in Discussion 019
- runtime defaulting specification in Discussion 020
- validation plan in Discussion 021

Potential ADRs:

- active-entity temporal visibility
- deterministic review defaults without clarification friction
- derived `nextTemporalCheckpoint`
- separation of review due from execution overdue

This amendment is closed. Follow-up discussions must implement the accepted invariant explicitly rather than silently redefining it.

---

# خلاصهٔ فارسی

۰۱۲A amendment زمانی مدل ۰۱۲ است و invariant اصلی آن می‌گوید هیچ موجودیت `ACTIVE` نباید از نظر زمانی نامرئی شود. Goal باید `reviewDate` داشته باشد؛ Project باید `targetDate` یا `reviewDate` داشته باشد؛ Task باید `plannedDate` یا `reviewDate` داشته باشد؛ و Routine فعال باید از recurrence خود occurrence بعدی را تولید کند.

در نبود تاریخ تعیین‌شده توسط کاربر، سیستم default قابل‌مشاهده و قابل‌ویرایش می‌سازد: برای Goal در حالت عادی ۹۰ روز و برای Project در حالت عادی ۳۰ روز. این default نباید از target یا deadline زودتر عبور کند. گرفتن این تاریخ‌ها نباید سؤال اجباری جدیدی به مکالمهٔ Planning اضافه کند.

`nextTemporalCheckpoint` یک مقدار derived است، نه source of truth قابل‌ویرایش. Backlog همچنان placement معتبر است، اما Task موجود در Backlog باید زمان بازبینی آینده داشته باشد. `REVIEW_DUE` نیز با `EXECUTION_OVERDUE` متفاوت است و نباید به‌عنوان شکست اجرا یا بدهی کاری نمایش داده شود.
