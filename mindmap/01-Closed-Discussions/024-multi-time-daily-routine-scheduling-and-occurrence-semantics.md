# Discussion 024 — Multi-Time Daily Routine Scheduling and Occurrence Semantics

## Status

**CLOSED — accepted after GPT × Claude review.**

```txt
STATUS = CLOSED
CLAUDE_REVIEW = COMPLETE
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
MIND_MAP = NOT_APPLIED
FORMAL_DOC_RECONCILIATION = PENDING
IMPLEMENTATION_REQUIRES_RECONCILIATION = TRUE
```

This discussion is now authoritative for the product direction it explicitly owns, but its Mind Map and formal-document impact has **not yet been applied**.

Primary related accepted discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
- [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]
- [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
- [[01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context]]

---

## 1. Problem Statement

The previous MVP Routine model assumed:

```txt
one Routine
→ at most one RoutineOccurrence per local calendar date
```

with persistence identity:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

That model cannot represent one real-world Routine that must execute multiple times in one day.

Example:

```txt
Take medicine at:
00:00
08:00
16:00
```

Representing each slot as a separate Routine would incorrectly fragment one behavior into several Routine identities, histories, edit surfaces, lifecycle states, and continuation lineages.

Accepted requirement:

> One Routine may produce multiple distinct RoutineOccurrences on the same local calendar date.

Goal, Project, and Task remain day-granularity. Routine is the intentional sub-day exception.

---

## 2. Explicit Reopening and Amendment of Earlier Decisions

Discussion 024 explicitly amends the one-occurrence-per-day assumptions in:

- Discussion 015,
- Discussion 015B,
- Discussion 019A.

The following old global invariant is no longer valid:

```txt
one Routine
→ at most one RoutineOccurrence per local calendar date
```

The old uniqueness rule:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

must be replaced by the timed/untimed identity rules in this discussion.

The local-date-first temporal model, prospective edit semantics, Routine lifecycle, RoutineOccurrence lifecycle, parent ownership, and history-preservation rules remain intact unless explicitly amended below.

---

## 3. Accepted MVP Boundary

Routine remains **local-calendar-based**.

An ACTIVE Routine may define:

```txt
recurrenceDefinition
recurrenceTimezone
effectiveFromLocalDate
effectiveUntilLocalDate?
timesOfDay[]
```

`timesOfDay[]` contains zero or more explicit local wall-clock times.

Examples:

```txt
[]
[08:00]
[08:00, 20:00]
[00:00, 08:00, 16:00]
```

Meaning:

```txt
eligible local date
×
applicable time slot
→ one RoutineOccurrence
```

An untimed Routine with `timesOfDay = []` remains valid and produces at most one untimed occurrence on each eligible local date.

Duplicate time slots in one Routine definition are invalid.

Example:

```txt
[08:00, 08:00, 20:00]
→ invalid recurrence definition
```

---

## 4. True EVERY_N_HOURS Is Deferred

MVP does **not** persist true elapsed-time recurrence such as:

```txt
EVERY_N_HOURS
intervalHours = 8
anchorInstant = ...
```

That would introduce a separate temporal family involving elapsed-duration semantics, anchor instants, DST interval behavior, and a different source-of-truth question for occurrence timing.

MVP instead stores explicit local wall-clock slots.

If the user says:

```txt
"every 8 hours"
```

AI must not invent a start time.

If start time is known and the user accepts the resulting fixed local schedule, AI may derive explicit local slots.

Example:

```txt
"every 8 hours starting at 08:00"
→ proposed fixed local slots:
08:00
16:00
00:00
```

The review must make clear that the product stores fixed local times, not an elapsed-time interval engine.

If start time is missing and materially affects the schedule, clarification is required.

---

## 5. RoutineOccurrence Contract

Conceptual shape:

```txt
RoutineOccurrence
- id
- routineId
- scheduledLocalDate
- scheduledLocalTime?
- status: PENDING | DONE | MISSED
- resolvedAt?
- createdAt
- updatedAt
- version
```

### 5.1 Timed occurrence identity

For a timed occurrence:

```txt
scheduledLocalTime != null
```

Product invariant:

```txt
(routineId, scheduledLocalDate, scheduledLocalTime)
→ at most one timed occurrence
```

### 5.2 Untimed occurrence identity

For an untimed occurrence:

```txt
scheduledLocalTime = null
```

Product invariant:

```txt
(routineId, scheduledLocalDate)
→ at most one untimed occurrence
```

These are **two explicit product invariants**.

The product contract does not use a fake/sentinel time to make nullable uniqueness convenient for one database implementation.

Technical persistence may realize these invariants using partial unique indexes or an equivalent mechanism, but that is an implementation detail.

---

## 6. Local-Time and Timezone Semantics

A Routine time slot represents local wall-clock time in the Routine's applicable timezone.

Example:

```txt
08:00
```

means:

> 08:00 local time for that Routine's timezone semantics.

It does not mean exactly 24 elapsed hours after the previous day's occurrence.

`00:00` belongs to the local calendar date on which midnight occurs.

DST edge handling for nonexistent or repeated local clock times must be documented in the temporal implementation contract. No arbitrary library default becomes product semantics merely by accident.

True elapsed-time interval semantics remain deferred.

---

## 7. Occurrence Generation and Catch-Up

The previous lazy-generation/catch-up model must be evaluated per date **and per slot**.

Conceptually:

```txt
for each eligible local date:
  if Routine is untimed:
    ensure one untimed occurrence exists
  else:
    for each unique applicable local time slot:
      ensure one timed occurrence exists
```

Example:

```txt
3 eligible dates
×
3 time slots
→ up to 9 RoutineOccurrences
```

Catch-up logic must not retain a hidden one-row-per-date assumption.

Generation remains bounded and idempotent. This discussion does not authorize unbounded future pre-generation.

Previously exposed occurrence identity/history remains protected by the accepted 019B rules.

---

## 8. PENDING → MISSED Semantics

For a timed occurrence:

> A PENDING occurrence becomes effectively MISSED when the next scheduled occurrence of the same Routine is reached, or at the end of the current local day, whichever occurs first.

Example:

```txt
08:00 PENDING
16:00 PENDING
```

At 16:00 local time, if the 08:00 occurrence is still unresolved:

```txt
08:00 → MISSED
16:00 → PENDING
```

The last unresolved timed occurrence of the local date becomes MISSED by local-day end.

Untimed RoutineOccurrence behavior continues to use the accepted local-day boundary semantics from the existing execution model.

No arbitrary 15/30/60 minute grace period is introduced.

No exact-time background job is required. Effective status may be derived/materialized through accepted lazy temporal processing as long as canonical history remains coherent.

Historical correction remains:

```txt
DONE ↔ MISSED
```

The scheduled local date/time never changes as part of a historical correction.

---

## 9. Routine Editing

Timing/recurrence edits remain prospective.

Default:

```txt
edit today
→ new recurrence/times effective next local date
```

Current-day generated/exposed occurrences are not rewritten simply because the Routine definition changes.

Past occurrences are never regenerated.

Already exposed occurrence identity and history remain preserved.

Future never-exposed occurrences may be invalidated/regenerated only under the accepted 019B rules.

---

## 10. Today Semantics

Today contains current-local-date RoutineOccurrences.

One Routine may therefore contribute several current-day execution rows.

Preferred conceptual presentation:

```txt
Medicine
  08:00  DONE
  16:00  PENDING
```

Each occurrence keeps its own action/state:

```txt
PENDING → DONE | MISSED
```

RoutineOccurrence still does not support Carry, Drop, or Backlog.

A `00:00` occurrence belongs to the new local date and must not remain grouped under the previous date.

---

## 11. Reconcile and Severity

Multi-time Routine support must not inflate severity by treating raw same-day occurrence rows as separate backlog items.

Preserve both:

```txt
missedOccurrences
+
affectedRoutineDays
```

Example:

```txt
one Routine
3 scheduled slots on one local date
3 MISSED

missedOccurrences = 3
affectedRoutineDays = 1
```

`affectedRoutineDays` is a routine-pattern summary input used to avoid amplification from multiple slots on one Routine/day.

It does **not** automatically become `actionableBacklogCount`.

Discussion 016 remains authoritative that `actionableBacklogCount` counts Reconcile-eligible facts currently requiring an explicit user decision and excludes raw missed occurrence history.

Routine severity/relevance therefore continues through the existing Routine-oriented summary inputs such as:

```txt
actionableRoutinePatternCount
recentMissedPatternCount
observedOccurrenceCount
occurrenceCorrectionCount
recurrenceEditCount
```

Multi-time support may change how these summaries are derived, but does not create a parallel severity engine.

Existing ratio-based Routine mismatch logic may continue to use observed occurrence counts where appropriate.

---

## 12. AI Planning and Authority

AI may propose multiple time slots for one Routine.

Example:

```txt
Routine: Take medicine
DAILY
00:00
08:00
16:00
```

The slots must be visible and reviewable before approval.

AI must not create separate Routines solely to represent separate slots of one real-world Routine.

For interval-like language:

```txt
"every N hours"
```

AI must:

- not invent an anchor/start time,
- clarify when required,
- propose explicit fixed local slots only when representable,
- disclose the fixed-local-time interpretation when needed for informed approval.

Routine timing has a canonical home and therefore is not duplicated into PlanningFacts from Discussion 023.

Manual Routine creation/editing must support the same accepted timing semantics as AI-created Routines.

---

## 13. Lifecycle and Parent Behavior

Routine lifecycle remains:

```txt
ACTIVE → STOPPED
```

No PAUSED state is introduced.

Parent lifecycle cascades remain unchanged except that one Routine may now own multiple occurrences on one date.

Historical occurrences remain preserved according to existing rules.

---

## 14. Explicit Non-Goals

MVP does not add:

- hour granularity to Goal/Project/Task,
- Hour entity,
- true elapsed-time interval recurrence,
- arbitrary cron syntax,
- universal recurrence expressions,
- per-slot Routine identities,
- PAUSED Routine state,
- new RoutineOccurrence lifecycle states,
- naive severity multiplication from raw same-day occurrence count.

---

## 15. Accepted Review Findings and Resolution

Claude review found no Blocking issues.

### Finding A — nullable time uniqueness

Accepted concern:

```txt
UNIQUE(routineId, scheduledLocalDate, scheduledLocalTime)
```

alone is not sufficient for untimed rows when `scheduledLocalTime = NULL` under common relational uniqueness semantics.

Resolution:

- no sentinel/fake time is introduced,
- timed and untimed occurrence identity are separate product invariants,
- persistence must enforce both deterministically.

### Finding B — routine-day severity aggregation

Accepted concern: raw same-day multi-slot misses must not create a competing or inflated severity count.

Resolution:

- `affectedRoutineDays` is a derived Routine summary,
- it does not feed `actionableBacklogCount` merely because slots were missed,
- existing Discussion 016 Routine summary inputs remain authoritative.

### Minor confirmations

- duplicate time slots are invalid,
- catch-up is per eligible date × applicable slot,
- R4/Routine mismatch logic may continue to use occurrence ratios once generation is correct,
- DST implementation behavior must be explicitly documented rather than silently inherited from library defaults.

---

## 16. Mind Map Impact — NOT YET APPLIED

When separately applied, likely Mind Map changes include:

### Product Model

- Routine supports multiple local time slots,
- RoutineOccurrence supports timed and untimed identity,
- global one-occurrence-per-local-date rule removed,
- Goal/Project/Task remain day-granularity.

### MVP Core Loop

```txt
Routine definition
→ eligible local date
→ one or more time slots
→ RoutineOccurrences
→ Today execution
→ Reconcile pattern handling
```

### AI Responsibilities

- propose visible multi-slot schedules,
- clarify missing start time for interval-like wording,
- never claim unsupported elapsed-time semantics.

### AI Guardrails

- no invented interval anchor,
- no fake multiple Routines for one multi-time behavior,
- no PlanningFact duplication for Routine timing.

### Data / Events

- timed/untimed occurrence identity rules,
- generation/catch-up per slot,
- distinct multi-occurrence history.

**Mind Map remains NOT APPLIED by this closure.**

---

## 17. Affected Formal Documents — PENDING RECONCILIATION

Discussion 024 requires later reconciliation of:

- Discussion 015 Routine execution assumptions,
- Discussion 015B one-occurrence-per-date rule,
- Discussion 019A RoutineOccurrence uniqueness,
- Discussion 019B generation/invalidation details where necessary,
- Discussion 016/017 Routine metric derivation where one-per-day was assumed,
- PlanningDraft Routine timing fields,
- API/frontend contracts,
- persistence/index constraints,
- Today Routine presentation,
- Mind Map and implementation plan.

No Mind Map or implementation change is performed by this file alone.

---

## 18. Final Accepted Direction

```txt
Goal / Project / Task
→ day granularity

Routine
→ local-calendar recurrence
→ zero or more unique local timesOfDay

Untimed Routine
→ max one occurrence per eligible local date

Timed Routine
→ max one occurrence per Routine + local date + local time slot

true EVERY_N_HOURS elapsed-time recurrence
→ deferred
```

Core principle:

> Routine may be sub-day without turning the entire planner into an hour-level scheduling system.

---

# خلاصهٔ فارسی

Discussion 024 بسته شد. Routine می‌تواند در یک روز چند occurrence داشته باشد و هر slot ساعت محلی مستقل خودش را دارد. Goal، Project و Task همچنان در سطح روز می‌مانند.

مدل واقعی `EVERY_N_HOURS` با elapsed-time/anchor فعلاً خارج MVP است. درخواست‌هایی مثل «هر ۸ ساعت» فقط بعد از مشخص‌شدن ساعت شروع و با نمایش صریح fixed local slots به کاربر تبدیل می‌شوند.

برای occurrenceهای timed و untimed دو invariant هویتی جدا داریم تا مشکل nullable uniqueness ایجاد نشود. در Reconcile نیز چند missed slot در یک روز برای یک Routine نباید به‌صورت خام severity را چند برابر کند؛ `affectedRoutineDays` یک summary برای مشتق‌کردن pattern است و جای `actionableBacklogCount` را نمی‌گیرد.

Mind Map و formal docs هنوز اعمال/اصلاح نشده‌اند و باید در مرحلهٔ reconciliation جداگانه به‌روزرسانی شوند.
