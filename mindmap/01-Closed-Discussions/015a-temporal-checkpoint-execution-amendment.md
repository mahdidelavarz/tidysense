# Discussion 015A — Temporal Checkpoint Execution Amendment

## Status

Accepted and closed as a required amendment following Discussion 012A.

This amendment extends [[01-Closed-Discussions/015-task-and-routine-execution-model]] without reopening its accepted Task lifecycle, RoutineOccurrence lifecycle, Today derivation, Carry semantics, parent terminal cascades, or correction rules.

Related accepted decisions:

- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]

---

## 1. Distinct Temporal Meanings

The execution model now distinguishes:

```txt
plannedDate
→ intended Task execution date

deadline
→ external or user-declared latest meaningful boundary

reviewDate
→ date on which the commitment or placement must be reconsidered

targetDate
→ optional Goal or Project target boundary
```

These dates may coexist and must not be interpreted as synonyms.

---

## 2. Today Remains Execution-Only

The accepted Today rule remains unchanged:

```txt
Task appears in Today
iff
Task.status = ACTIVE
AND Task.plannedDate = currentLocalDate
```

Therefore:

```txt
reviewDate = currentLocalDate
+ plannedDate != currentLocalDate
→ does not create a Today Task
```

Review checkpoints belong to Reconcile or an explicit review surface, not the execution checklist.

Routine Today behavior remains derived from RoutineOccurrence scheduled date.

---

## 3. Execution Overdue and Review Due

Canonical derived conditions:

```txt
EXECUTION_OVERDUE
Task.status = ACTIVE
AND plannedDate < currentLocalDate
```

```txt
REVIEW_DUE
entity.status = ACTIVE
AND reviewDate <= currentLocalDate
AND no later explicit review resolution has moved the checkpoint
```

`REVIEW_DUE` is not Task failure, missed execution, or accumulated debt.

An entity may be both execution-overdue and review-due. The product must preserve both reasons but avoid duplicate resolution items.

---

## 4. Task Placement

Task placement is conceptually:

```txt
SCHEDULED
→ plannedDate exists

BACKLOG
→ no current execution placement
→ reviewDate exists
```

Backlog is an explicit user or approved-draft decision, not an inferred status from `plannedDate = null` alone.

Accepted invariant:

```txt
ACTIVE Task
→ plannedDate exists
OR reviewDate exists
```

A Task with both absent is invalid after creation/default processing.

---

## 5. Review Checkpoint Actions

When a Task review checkpoint is reached, allowed explicit actions are:

```txt
SCHEDULE_TO_EXPLICIT_DATE
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
DROP_TASK
KEEP_CURRENT_PLACEMENT_WITH_NEW_REVIEW_DATE
```

Constraints:

- Drop remains user-confirmed.
- protected and deadline-risk rules from Discussion 017 apply.
- `KEEP` must assign a future review checkpoint; it does not resolve the item forever.
- setting a `plannedDate` changes placement to `SCHEDULED`.
- moving to Backlog clears current execution placement only through an explicit action and assigns a future `reviewDate`.

For Goal or Project review checkpoints, lifecycle or continuation actions belong to Discussion 017 and parent cascade rules remain those already accepted in Discussion 015.

---

## 6. Review Resolution History

The following are meaningful temporal actions and must later be representable in history/events:

```txt
REVIEW_DATE_DEFAULTED
REVIEW_DATE_CHANGED
REVIEW_DEFERRED
PLACEMENT_CHANGED_TO_BACKLOG
PLACEMENT_CHANGED_TO_SCHEDULED
INTENT_REAFFIRMED
```

A review-date change is not a Carry unless `plannedDate` also changes from one execution date to another.

Therefore:

```txt
reviewDate changed
≠ Task Carry
```

Carry counts must remain based only on explicit execution-placement changes accepted in the original Discussion 015.

---

## 7. Deadline and Target Capping

System-generated review checkpoints must not occur after an earlier authoritative boundary:

```txt
Goal.reviewDate <= Goal.targetDate, when targetDate exists earlier
Project.reviewDate <= Project.targetDate, when targetDate exists earlier
Task.reviewDate <= Task.deadline, when deadline exists earlier
```

A deadline or target reaching its date does not automatically complete, achieve, stop, or drop an entity.

---

## 8. Parent and Standalone Consistency

Temporal rules apply equally to:

- Project-owned Tasks
- direct Goal-owned Tasks
- standalone Tasks
- Goal-owned Projects
- standalone Projects
- standalone Goals where supported by the canonical model

Ownership affects grouping and lifecycle consequences, not the requirement for temporal visibility.

---

## 9. Routine Behavior

No new Routine review date is required for temporal visibility when:

```txt
Routine.status = ACTIVE
AND recurrence is valid
AND next occurrence is derivable
```

Routine mismatch review remains based on observed post-calibration execution evidence, not on a generic Routine review date introduced by this amendment.

---

## 10. Deterministic Evaluation Order

At an app-open or Reconcile evaluation boundary:

```txt
1. determine current local date and timezone
2. derive/materialize required RoutineOccurrences
3. derive Task execution-overdue facts
4. derive Goal/Project/Task review-due facts
5. deduplicate entities carrying multiple reason codes
6. pass reason-coded facts to Discussion 016 eligibility and presentation
```

Review-due derivation must not mutate lifecycle state.

---

## 11. Final Amendment Decisions

- `plannedDate`, `reviewDate`, `deadline`, and `targetDate` have distinct meanings.
- Today remains execution-only.
- review due is not execution overdue.
- Backlog is explicit placement, not a null-date accident.
- active Tasks always retain an execution or review checkpoint.
- review-date changes do not inflate Carry counts.
- system defaults respect earlier target/deadline boundaries.
- review evaluation does not mutate lifecycle automatically.
- Routine recurrence remains its natural temporal checkpoint.

---

# خلاصهٔ فارسی

۰۱۵A مدل اجرای ۰۱۵ را با معنای دقیق تاریخ‌ها تکمیل می‌کند: `plannedDate` زمان اجرای Task، `reviewDate` زمان بازبینی تعهد، `deadline` آخرین مرز معنادار و `targetDate` مرز هدف Goal یا Project است. این تاریخ‌ها مترادف نیستند و می‌توانند هم‌زمان وجود داشته باشند.

Today فقط execution را نشان می‌دهد؛ رسیدن `reviewDate` به‌تنهایی Task را وارد Today نمی‌کند. `REVIEW_DUE` نیز با `EXECUTION_OVERDUE` متفاوت است. Backlog یک placement صریح است و Task فعال در Backlog باید `reviewDate` آینده داشته باشد.

حل checkpoint می‌تواند Task را برای یک تاریخ مشخص schedule کند، با review جدید در Backlog نگه دارد یا پس از تأیید Drop کند. تغییر `reviewDate` به‌تنهایی Carry نیست و نباید Carry count را افزایش دهد. ارزیابی checkpointها deterministic است و بدون تصمیم معتبر کاربر lifecycle را تغییر نمی‌دهد.
