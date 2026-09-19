# Discussion 019A — Canonical Data Model and Invariants

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative Discussion 019A resolution for canonical entities, ownership, lifecycle states, temporal fields, provenance, and persistence invariants.

Accepted dependencies:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]

---

## 1. Accepted Canonical Entities

The MVP canonical model contains:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

No persisted `Plan` entity exists.

A PlanningDraft may be persisted temporarily for recovery and approval workflows, but it is not canonical product truth and must inherit the privacy and retention boundary from Discussion 018A.

---

## 2. Ownership Model

Accepted relationships:

```txt
Project → Goal? | standalone
Task → Goal? | Project? | standalone
Routine → Goal? | Project? | standalone
RoutineOccurrence → exactly one Routine
```

Task and Routine use nullable foreign keys plus an exclusive-parent constraint:

```txt
NOT (goalId IS NOT NULL AND projectId IS NOT NULL)
```

Both null means standalone.

When a Task or Routine belongs to a Project, Goal context is derived through `Project.goalId`; the child does not duplicate the Goal foreign key.

All parent and child rows must belong to the same user or workspace boundary.

Polymorphic parent tables are rejected for MVP because nullable foreign keys plus database checks preserve referential integrity more directly.

---

## 3. Shared Canonical Fields

Every mutable canonical entity includes:

```txt
id
userId
createdAt
updatedAt
source: MANUAL | AI_ASSISTED | SYSTEM_MIGRATED
version
```

`source` records creation origin only. It does not grant authority, express truth quality, or replace mutation audit history.

`version` is a monotonically advancing concurrency token or database-native equivalent.

Canonical lifecycle rows are not soft-deleted in MVP. Lifecycle state and immutable events remain the authoritative representation.

---

## 4. Goal

```txt
Goal
- id
- userId
- title
- desiredOutcome
- status: ACTIVE | ACHIEVED | ABANDONED
- targetDate?
- reviewDate
- reviewDateSource: USER | SYSTEM_DEFAULT | MIGRATED_DEFAULT
- lastContinuationDecisionAt?
- createdAt
- updatedAt
- terminalAt?
- source
- version
```

Invariants:

- `desiredOutcome` is required after approval.
- ACTIVE Goal requires `reviewDate`.
- ACHIEVED and ABANDONED require `terminalAt`.
- execution totals never change Goal status automatically.
- `lastContinuationDecisionAt` is a current scheduling snapshot; full history remains event-based.

### Review-date provenance

`reviewDate` is never a freely AI-generated judgment value.

It is always one of:

```txt
literal user-provided date
accepted deterministic system default
accepted deterministic migration default
```

AI may extract an explicit user date, but it may not invent a supposedly intelligent review interval.

The same rule applies to Project and Task review dates.

---

## 5. Project

```txt
Project
- id
- userId
- goalId?
- title
- completionMeaning?
- status: ACTIVE | COMPLETED | STOPPED
- targetDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT | MIGRATED_DEFAULT
- createdAt
- updatedAt
- terminalAt?
- source
- version
```

Invariants:

- standalone Project is valid.
- ACTIVE Project has at least one temporal checkpoint: `targetDate` or `reviewDate`.
- COMPLETED and STOPPED require `terminalAt`.
- terminal Project state never changes parent Goal status automatically.
- child Routine shutdown is handled atomically under Discussion 019B.

---

## 6. Task

```txt
Task
- id
- userId
- goalId?
- projectId?
- title
- description?
- status: ACTIVE | COMPLETED | DROPPED
- placement: SCHEDULED | BACKLOG
- plannedDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT | MIGRATED_DEFAULT
- deadline?
- isProtected
- protectionReasonCode?
- createdAt
- updatedAt
- terminalAt?
- source
- version
```

Placement invariants while ACTIVE:

```txt
SCHEDULED → plannedDate IS NOT NULL
BACKLOG → plannedDate IS NULL AND reviewDate IS NOT NULL
ACTIVE → plannedDate IS NOT NULL OR reviewDate IS NOT NULL
```

A deadline is not a placement or review checkpoint.

When Task becomes COMPLETED or DROPPED:

- last placement and dates remain preserved.
- `terminalAt` is required.
- active-work visibility is controlled by status, not by clearing historical dates.

Restore preserves the same Task identity and requires a new valid current temporal checkpoint.

### Temporal query rule

Every query based on dates must explicitly filter active lifecycle state.

```txt
Today:
status = ACTIVE AND plannedDate = currentLocalDate

Execution overdue:
status = ACTIVE AND plannedDate < currentLocalDate

Review due:
status = ACTIVE AND reviewDate <= currentLocalDate
```

Historical dates alone must never make terminal entities reappear in active surfaces.

### Protection and Carry

MVP stores one current protection flag and one primary reason code. Full history remains event-based.

Carry is an event, not a status. `carryCount` is derived and is not mutable canonical truth.

---

## 7. Routine

```txt
Routine
- id
- userId
- goalId?
- projectId?
- title
- description?
- status: ACTIVE | STOPPED
- recurrenceDefinition
- recurrenceTimezone
- effectiveFromLocalDate
- effectiveUntilLocalDate?
- continuationOfRoutineId?
- createdAt
- updatedAt
- stoppedAt?
- source
- version
```

### Local-date boundary

`createdAt` and `stoppedAt` are audit timestamps. They do not define recurrence calendar boundaries.

```txt
effectiveFromLocalDate
→ first local date eligible for occurrence generation

effectiveUntilLocalDate
→ final local date eligible for occurrence generation
```

The effective range is inclusive.

This prevents timezone-boundary ambiguity such as a Routine created near midnight.

### One occurrence per day in MVP

For MVP:

```txt
one Routine
→ at most one RoutineOccurrence per local calendar date
```

The database uniqueness rule remains:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

A behavior intended twice per day must be represented as two distinct Routines, such as morning and evening variants.

Multi-slot daily recurrence is deferred until post-MVP evidence justifies extending the identity key.

### Continuation lineage

A continuation Routine:

- has a new identity.
- references a prior Routine owned by the same user.
- references a Routine already in STOPPED state.
- references an earlier Routine, never itself or a future row.
- may not create a cycle.

MVP also requires at most one direct continuation per stopped Routine:

```txt
UNIQUE(continuationOfRoutineId) WHERE continuationOfRoutineId IS NOT NULL
```

Cross-row continuation validation belongs to the transactional application layer and Discussion 019B.

---

## 8. RoutineOccurrence

```txt
RoutineOccurrence
- id
- userId
- routineId
- scheduledLocalDate
- status: PENDING | DONE | MISSED
- resolvedAt?
- createdAt
- updatedAt
- version
```

Invariants:

```txt
UNIQUE(routineId, scheduledLocalDate)

PENDING → resolvedAt IS NULL
DONE | MISSED → resolvedAt IS NOT NULL
```

`userId` is duplicated intentionally for isolation and query efficiency, but must equal the parent Routine owner. Enforcement is finalized in Discussion 019B.

Historical occurrences remain preserved after Routine Stop or Project terminal cascades.

`resolvedAt` is the single resolution timestamp. A separate `completedAt` column is unnecessary for MVP because status already distinguishes DONE from MISSED.

---

## 9. Canonical Versus Derived Values

Do not persist as mutable canonical truth:

- universal Goal progress percentage
- achievement probability
- motivation or capacity score
- inferred success
- `nextTemporalCheckpoint`
- `carryCount`
- rule eligibility
- overdue severity

These are derived from canonical state and immutable event history.

Caches or materialized summaries may be introduced later only with explicit provenance and rebuild semantics.

---

## 10. Accepted Database Constraints

Minimum correctness constraints:

```txt
Task exclusive parent
Routine exclusive parent
same-user parent ownership
ACTIVE temporal checkpoint requirements
terminal status requires terminal timestamp
Routine effective date range validity
RoutineOccurrence unique daily identity
RoutineOccurrence resolution timestamp consistency
continuation self-reference prevention
single direct Routine continuation
```

Some cross-row invariants cannot be expressed as portable CHECK constraints and must be enforced transactionally in Discussion 019B.

---

## 11. Accepted Findings

Claude findings resolved:

- `F1`: MVP allows at most one occurrence per Routine per local day.
- `F2`: Routine uses explicit inclusive local-date effectiveness fields.
- `F3`: reviewDate may not be freely invented by AI.
- `F4`: Routine continuation requires earlier STOPPED same-user source, no self-reference, no cycle, and one direct continuation.
- `F5`: DONE and MISSED occurrences require `resolvedAt`; PENDING forbids it.
- `F6`: all date-driven active queries must explicitly filter ACTIVE status.

Additional accepted decisions:

- nullable ownership foreign keys plus CHECK constraints.
- persisted `lastContinuationDecisionAt` snapshot plus event history.
- one current Task protection flag for MVP.
- derived Carry count.
- duplicated RoutineOccurrence `userId` with transactional enforcement.
- temporary PlanningDraft persistence under Discussion 018A privacy rules.
- generic terminal timestamp rather than status-specific timestamp proliferation.
- no soft delete for canonical lifecycle rows in MVP.

---

## 12. Mind Map Impact

### Product Model

Add or clarify:

- Task and Routine may belong to Goal, Project, or neither.
- exclusive parent is enforced canonically.
- RoutineOccurrence belongs to one Routine and one local calendar date.
- Routine continuation creates a new entity and preserves lineage.

### MVP Core Loop

```txt
approved proposal or manual input
→ validate canonical invariants
→ persist entity with source and version
→ use local-date scheduling semantics
→ derive active views with lifecycle filters
→ preserve history through events
```

### User Flow

Add:

- explicit morning/evening Routines for twice-daily behavior.
- current placement required on Task Restore.
- terminal Tasks keep historical dates but disappear from active views.
- Routine creation selects an explicit first effective local date.

### AI Responsibilities

- AI may prepare canonical field proposals.
- AI may extract explicit user dates.
- AI may not invent reviewDate as free judgment.
- AI must respect one-occurrence-per-day Routine semantics.

### AI Guardrails

- no duplicate Goal context on Project-owned children.
- no free AI review-date judgment.
- no semantic entity-type repair.
- no terminal entity leakage into date-driven active views.

### Data Events for Discussion 019C

Candidates:

```txt
ENTITY_CREATED
ENTITY_UPDATED
ENTITY_TERMINATED
TASK_DROPPED
TASK_RESTORED
ROUTINE_STOPPED
ROUTINE_CONTINUATION_CREATED
ROUTINE_OCCURRENCE_RESOLVED
TEMPORAL_CHECKPOINT_CHANGED
PROTECTION_CHANGED
```

### Current Decisions

- one Routine occurrence per local day in MVP.
- local date and timestamp have distinct meanings.
- review dates have deterministic provenance.
- historical placement is preserved after terminal transition.
- derived metrics are not canonical truth.

### Open Questions Moved Forward

Move to Discussion 019B:

- cross-row ownership enforcement
- continuation validation and cycle prevention
- cascade transactions
- concurrency tokens
- stale write conflict behavior
- idempotency

Move to Discussion 019C:

- PlanningDraft storage shape and TTL
- full event taxonomy
- AI proposal and session observability
- retention and deletion mechanics

---

## 13. Affected Formal Documents

Create or update later:

- canonical persistence model specification
- ownership and exclusive-parent constraint specification
- temporal field and local-date specification
- Routine recurrence and occurrence identity specification
- Task Drop and Restore persistence specification
- active temporal-query contract
- schema migration plan in [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]

Applied amendment:

- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]] adopts one Routine occurrence per local day and explicit local-date effectiveness boundaries.

---

## 14. Closure

Discussion 019A is closed.

Discussion 019B must use this model as authoritative and may not silently redefine ownership, lifecycle states, temporal fields, or occurrence identity.

---

## خلاصهٔ فارسی

این بحث مدل دادهٔ مرجع MVP را نهایی می‌کند. موجودیت‌های اصلی شامل Goal، Project، Task، Routine و RoutineOccurrence هستند و موجودیت مستقلی به نام Plan در داده‌های مرجع وجود ندارد. مالکیت، وضعیت‌های چرخهٔ عمر، تاریخ‌های برنامه‌ریزی و بازبینی، منشأ تاریخ‌ها، نسخه‌گذاری برای کنترل هم‌زمانی و قواعد ایجاد رخدادهای روزانه به‌صورت صریح تعریف شده‌اند.

داده‌های تولیدشده با کمک AI فقط پس از تأیید کاربر می‌توانند به حقیقت مرجع محصول تبدیل شوند. مقادیر تحلیلی و محاسبه‌شده، پیش‌نویس‌های موقت و اطلاعات عملیاتی AI بخشی از وضعیت مرجع دامنه نیستند. هر Routine در MVP حداکثر یک رخداد برای هر تاریخ محلی دارد و تاریخ محلی با timestamp یک مفهوم واحد محسوب نمی‌شود.
