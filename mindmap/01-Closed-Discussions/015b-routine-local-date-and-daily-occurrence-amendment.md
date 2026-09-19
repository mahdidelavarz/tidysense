# Discussion 015B — Routine Local-Date and Daily Occurrence Amendment

## Status

Accepted and closed as an amendment required by the final Discussion 019A data-model resolution.

This amendment extends:

- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]

Where this amendment is more specific, it is authoritative for MVP Routine occurrence semantics.

---

## 1. One Occurrence per Local Day

For MVP:

```txt
one Routine
→ at most one RoutineOccurrence per local calendar date
```

A Routine that conceptually happens twice per day must be represented as two distinct Routines.

Example:

```txt
Take morning medication
Take evening medication
```

The MVP does not support multiple occurrence slots for one Routine on the same date.

This preserves a simple occurrence identity:

```txt
(routineId, scheduledLocalDate)
```

Multi-slot daily recurrence is deferred until post-MVP evidence justifies a breaking extension.

---

## 2. Explicit Local-Date Effectiveness

Routine recurrence eligibility is governed by explicit local dates:

```txt
effectiveFromLocalDate
→ first eligible local calendar date

effectiveUntilLocalDate
→ final eligible local calendar date, when present
```

The range is inclusive.

`createdAt` and `stoppedAt` are audit timestamps and must not be used as substitutes for local recurrence dates.

This prevents ambiguity for Routines created or stopped near a timezone day boundary.

---

## 3. Stop Semantics

When a Routine stops:

- `status` becomes STOPPED.
- `stoppedAt` records the exact audit timestamp.
- `effectiveUntilLocalDate` records the final local date eligible for occurrence generation.
- historical RoutineOccurrences remain unchanged.
- future occurrence handling is finalized transactionally in Discussion 019B.

A Project terminal cascade must apply the same local-date boundary contract to Project-owned Routines.

---

## 4. Query and Generation Contract

Occurrence generation must satisfy:

```txt
scheduledLocalDate >= effectiveFromLocalDate
AND
(
  effectiveUntilLocalDate IS NULL
  OR scheduledLocalDate <= effectiveUntilLocalDate
)
```

No second occurrence may be created for the same Routine and local date.

Retries must resolve to the existing occurrence rather than create a duplicate.

---

## 5. Mind Map Impact

### MVP Core Loop

Add:

```txt
Routine definition
→ explicit recurrence timezone
→ explicit first effective local date
→ maximum one occurrence per local day
→ historical occurrence resolution
```

### User Flow

- twice-daily behavior is modeled with separate named Routines.
- Routine creation asks for or derives an explicit first eligible local date through deterministic product logic.
- Stop records both exact timestamp and final effective local date.

### Current Decisions

- timestamp is not a substitute for local date.
- RoutineOccurrence identity is daily for MVP.
- multi-slot daily recurrence is deferred.

### Data Events

Candidates for Discussion 019C:

```txt
ROUTINE_EFFECTIVE_RANGE_SET
ROUTINE_STOPPED
ROUTINE_OCCURRENCE_CREATED
ROUTINE_OCCURRENCE_RESOLVED
DUPLICATE_OCCURRENCE_PREVENTED
```

---

## 6. Closure

This amendment is accepted and closed. Discussion 019B owns its transactional enforcement, Discussion 019C owns its event and retention details, and Discussion 022 owns Mind Map and formal-document application.

---

# خلاصهٔ فارسی

۰۱۵B قواعد دقیق RoutineOccurrence در MVP را تثبیت می‌کند. هر Routine در هر local calendar date حداکثر یک occurrence دارد و هویت آن با `(routineId, scheduledLocalDate)` تعیین می‌شود. رفتار دوبار در روز باید با دو Routine مستقل مدل شود و multi-slot recurrence به بعد از MVP موکول شده است.

بازهٔ فعال recurrence با `effectiveFromLocalDate` و `effectiveUntilLocalDate` تعریف می‌شود و هر دو مرز inclusive هستند. `createdAt` و `stoppedAt` timestampهای audit هستند و نباید جای local date را بگیرند.

توقف Routine وضعیت را به `STOPPED` تغییر می‌دهد، timestamp دقیق و آخرین local date معتبر را ثبت می‌کند و occurrenceهای تاریخی را حفظ می‌کند. تولید occurrence باید داخل بازهٔ مؤثر باشد و retry به occurrence موجود برسد، نه اینکه مورد تکراری بسازد. اجرای transaction در ۰۱۹B و event/retention در ۰۱۹C تعریف می‌شود.
