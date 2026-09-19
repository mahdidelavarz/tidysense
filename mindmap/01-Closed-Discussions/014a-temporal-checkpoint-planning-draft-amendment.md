# Discussion 014A — Temporal Checkpoint PlanningDraft Amendment

## Status

Accepted and closed as a required amendment following Discussion 012A.

This amendment extends [[01-Closed-Discussions/014-ai-planning-output-contract]] without reopening its accepted hierarchy, seven-day detailed horizon, approval semantics, low-friction conversation policy, or source-of-truth rules.

The planning-level temporal contract in this amendment remains authoritative. Discussion 019A owns canonical persistence and invariants, Discussion 020B owns API and draft lifecycle, and Discussion 020C owns structured-output enforcement. Those later decisions implement and refine this amendment without replacing it. Mind Map and formal-document application remain a Discussion 022 handoff.

Related accepted decisions:

- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]

---

## 1. Accepted PlanningDraft Field Changes

### GoalFields

```txt
GoalFields
- desiredOutcome
- targetDate?
- reviewDate
- reviewDateSource: USER | SYSTEM_DEFAULT
```

Rules:

- `targetDate` remains optional.
- every proposed active Goal must have `reviewDate` before approval.
- absence of a user-provided review date does not create a clarification question.
- the product assigns a visible editable default.
- the default must not be later than an earlier Goal target date.

Default derivation:

```txt
defaultGoalReviewDate = createdLocalDate + 90 local days
Goal.reviewDate = min(defaultGoalReviewDate, targetDate?)
```

### ProjectFields

```txt
ProjectFields
- completionMeaning?
- targetDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT
```

Rules:

```txt
ACTIVE proposed Project requires:
targetDate != null
OR
reviewDate != null
```

When `reviewDate` is absent, the product assigns a visible editable default. If a target date exists sooner, review must occur no later than that target.

```txt
defaultProjectReviewDate = createdLocalDate + 30 local days
Project.reviewDate = min(defaultProjectReviewDate, targetDate?)
```

The Project target date remains optional and does not prove completion.

### TaskFields

```txt
TaskFields
- plannedDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT
- placement: SCHEDULED | BACKLOG
- deadline?
```

Rules:

```txt
ACTIVE proposed Task requires:
plannedDate != null
OR
reviewDate != null
```

A Task may be intentionally unscheduled while remaining temporally visible:

```txt
plannedDate = null
placement = BACKLOG
reviewDate exists
→ valid active Task
```

When a Task has no `plannedDate`, the product derives a visible editable review default from the accepted planning or Backlog policy. That review date must not occur after a known earlier deadline.

```txt
Task.reviewDate = min(policyReviewDate, deadline?)
```

Exact Task default intervals remain validation policy, not a new conversational question.

### RoutineFields

No additional `reviewDate` is required merely for temporal visibility when an active valid recurrence can derive the next occurrence.

---

## 2. No Added Clarification Friction

Planning AI must not ask solely to obtain checkpoint dates:

```txt
When should this Goal be reviewed?
When should this Project return?
When should this Backlog Task be reconsidered?
```

Instead:

```txt
missing checkpoint
→ deterministic visible default
→ user may edit during draft review
→ approval remains possible
```

Defaults are product policy. They are not AI guesses about user capacity, motivation, lifestyle, or future availability.

---

## 3. Source of Truth and Derived Values

Authoritative fields remain:

```txt
Task execution placement → TaskFields.plannedDate
Task review checkpoint → TaskFields.reviewDate
Project target → ProjectFields.targetDate
Project review checkpoint → ProjectFields.reviewDate
Goal target → GoalFields.targetDate
Goal review checkpoint → GoalFields.reviewDate
Routine execution timing → recurrence
```

`nextTemporalCheckpoint` is derived and must not appear as another independently editable draft field.

---

## 4. Validation Changes

A PlanningDraft is invalid when an included active proposal has no derivable temporal checkpoint.

Additional validation:

- Goal `reviewDate` is required after defaults are applied.
- Project must have `targetDate` or `reviewDate`.
- Task must have `plannedDate` or `reviewDate`.
- Routine must have valid recurrence capable of producing a next occurrence.
- a system-generated review date may not be later than an earlier target date or deadline.
- detailed Task `plannedDate` still obeys the seven-day detailed execution horizon.
- `reviewDate` may fall outside the seven-day execution horizon because it is a management checkpoint, not detailed execution placement.
- default provenance must remain visible and editable.

Repair may add a deterministic missing default. It must not invent a user-specific date through language-model inference.

---

## 5. Review UX Semantics

Draft review must distinguish:

```txt
plannedDate / targetDate
→ intended execution or target timing

reviewDate
→ future commitment review checkpoint
```

System defaults must be marked as defaults rather than represented as user statements.

Backlog remains a valid deliberate placement and is not equivalent to forgotten or invalid work.

---

## 6. First-Week Horizon Interaction

The existing seven-day limit remains unchanged:

- detailed Task execution dates may cover no more than seven consecutive local calendar days.
- Routine first-week projections remain limited to the first execution window.
- Goal, Project, and Task review dates may exist beyond the detailed horizon.
- a review date does not create a Today execution entry.

---

## 7. Affected Later Specifications

Discussion 015 must define execution semantics for `reviewDate`, Backlog placement, and `REVIEW_DUE`.

Discussion 016 must define Reconcile eligibility and presentation without treating review checkpoints as execution failure.

Discussion 017 must consume these canonical fields for bounded continuation and review actions.

Discussion 019 must define persistence and provenance.

Discussion 020 must implement deterministic default assignment before model generation or approval validation.

Discussion 021 must validate timezone boundaries, earlier target/deadline capping, and zero-added-question behavior.

---

## 8. Final Amendment Decisions

- Temporal defaults do not add mandatory planning questions.
- Goal review date is conceptually required and defaulted when absent.
- Project has a target or review checkpoint.
- Task has an execution or review checkpoint.
- Backlog Tasks remain valid and retain review checkpoints.
- Routine recurrence provides its normal temporal checkpoint.
- defaults are visible, editable, and source-labelled.
- `nextTemporalCheckpoint` remains derived.
- review checkpoints do not alter the accepted seven-day detailed execution horizon.

---

# خلاصهٔ فارسی

۰۱۴A قرارداد `PlanningDraft` را با فیلدهای temporal تکمیل می‌کند. Goal دارای `targetDate?` و `reviewDate` است؛ Project باید `targetDate` یا `reviewDate` داشته باشد؛ و Task باید `plannedDate` یا `reviewDate` داشته باشد و placement آن به‌صورت `SCHEDULED` یا `BACKLOG` مشخص شود. `deadline` نیز مرزی مستقل از placement است.

تاریخ‌های review پیش‌فرض باید با سیاست deterministic محصول ساخته، با `reviewDateSource` مشخص و در review قابل‌ویرایش باشند. AI نباید برای گرفتن این تاریخ‌ها سؤال اجباری جدید ایجاد کند یا آن‌ها را از برداشت روان‌شناختی و حدس دربارهٔ ظرفیت کاربر بسازد.

`reviewDate` می‌تواند بیرون از افق اجرایی هفت‌روزه باشد، زیرا checkpoint مدیریتی است و Today entry ایجاد نمی‌کند. `nextTemporalCheckpoint` همچنان derived باقی می‌ماند و یک فیلد canonical یا قابل‌ویرایش جداگانه نیست.
