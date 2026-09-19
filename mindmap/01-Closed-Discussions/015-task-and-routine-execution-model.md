# Discussion 015 — Task and Routine Execution Model

## Status

Accepted and closed after GPT × Claude review.

Required companion amendments:

- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]

This document owns the base Task, Routine, RoutineOccurrence, Today, Carry, correction, and parent-terminal execution model. Discussion 015A owns the accepted temporal-checkpoint, Backlog, review-due, and date-meaning amendments. Discussion 015B owns the more specific MVP RoutineOccurrence identity and Routine effective-local-date rules. The three documents form one decision family and must be read together.

Later implementation authority is divided as follows: Discussion 019A owns canonical persistence and invariants, Discussion 019B owns transaction and concurrency behavior, and Discussion 019C owns event and retention details. Those resolutions refine implementation without replacing this execution model.

Claude confirmed that no blocking issue remains after the final corrections. Mahdi accepted the execution model below.

Related accepted discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]

---

## 1. Scope

This discussion defines how approved Tasks, Projects, Routines, RoutineOccurrences, and the Today view behave during normal execution.

It determines:

- how Today is assembled
- when a Task becomes actionable today
- how Carry, completion, dropping, and unresolved past Tasks behave
- how Routines generate or derive executable occurrences
- how occurrences become Done or Missed
- how historical execution may be corrected
- how Routine stop, continuation, and recurrence edits behave
- how Project and Goal terminal transitions affect active children
- how local dates and timezone changes affect execution
- which execution facts become eligible for Reconcile
- which execution evidence may later inform Adaptive Planning

This discussion defines execution semantics only. It does not define the full Reconcile flow or the Adaptive Planning algorithm.

---

## 2. Explicitly Out of Scope

This discussion does not define:

- AI planning conversation — Discussion 013
- PlanningDraft structure and approval — Discussion 014
- Reconcile grouping, prioritization, and resolution suggestions — Discussions 016–017
- Adaptive Planning scoring, workload adjustment, or pattern thresholds
- safety and provider-failure behavior — Discussion 018
- persistence tables, transactions, and event schemas — Discussion 019
- runtime, API, and provider architecture — Discussion 020
- final validation plan — Discussion 021
- implementation sequence — Discussion 022
- exact Today visual design

Later discussions may consume execution data defined here, but may not silently redefine these lifecycle semantics.

---

## 3. Accepted Dependencies from Discussion 012

Canonical concepts:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

Accepted ownership:

```txt
Project → one Goal or standalone
Task → one Goal, one Project, or standalone
Routine → one Goal, one Project, or standalone
RoutineOccurrence → exactly one Routine
```

Task and Routine may not belong to Goal and Project simultaneously.

Accepted lifecycle boundaries:

```txt
Goal: ACTIVE → ACHIEVED | ABANDONED
Project: ACTIVE → COMPLETED | STOPPED
Task: ACTIVE → COMPLETED | DROPPED
Routine: ACTIVE → STOPPED
RoutineOccurrence: PENDING → DONE | MISSED
```

Accepted invariants:

- direct Goal-owned Tasks and Routines are valid
- Project-owned Routines are specific to that Project
- Project completion automatically stops active Project-owned Routines
- historical RoutineOccurrences remain historical facts
- Carry changes Task placement and is not a Task status
- RoutineOccurrence is never Carried
- execution facts do not prove Goal achievement

---

## 4. Separation of Execution, Reconcile, and Adaptive Planning

These responsibilities are connected but distinct.

### 4.1 Execution

Execution records what happened to canonical work:

```txt
Task completed, carried, dropped, or left unresolved
RoutineOccurrence done or missed
Project completed or stopped
Routine stopped
```

### 4.2 Reconcile

Reconcile resolves unresolved or inconsistent past execution.

Examples:

- a Task date passed while the Task remained active
- a Task was carried repeatedly
- several old Tasks require explicit decisions
- historical Task or occurrence facts require correction
- a parent lifecycle action conflicts with active children

Reconcile may change execution facts through explicit accepted actions. It does not independently design the next weekly or long-term plan.

### 4.3 Adaptive Planning

Adaptive Planning proposes future workload or schedule changes using reliable execution evidence.

It may consume explicit Reconcile outcomes such as repeated Carry, Drop, or correction decisions. It must evaluate the reliability and repetition of that evidence.

Core guardrails:

```txt
absence is not failure
missing data is not negative evidence
one weak period is not a stable pattern
major adaptation requires repeated reliable evidence or explicit user feedback
```

A long absence reduces confidence. It must not independently justify an aggressive workload reduction.

---

## 5. Today Execution View

### 5.1 Today Is Derived

Today is not a canonical entity or persisted Plan.

It is a local-date execution view assembled from canonical Tasks and RoutineOccurrences.

```txt
Today(localDate)
= active Tasks whose authoritative plannedDate equals localDate
+ pending RoutineOccurrences scheduled for localDate
+ entry points for unresolved earlier work
```

Goal and Project provide context and grouping but are not executable checklist items.

### 5.2 Task Ownership Does Not Change Today Eligibility

Today may contain:

- standalone Tasks
- Goal-owned Tasks
- Project-owned Tasks

### 5.3 Authoritative Task Entry Rule

A Task becomes actionable in Today only when:

```txt
Task.plannedDate = currentLocalDate
```

Manual placement, Carry, accepted AI scheduling, and accepted Reconcile actions must all update the same authoritative `plannedDate`.

There is no second hidden Today-membership mechanism.

Consequences:

- an undated Task does not appear automatically every day
- a future Task does not appear early
- a completed or dropped Task is not executable in Today
- carrying a Task to today changes its authoritative date to today

### 5.4 Overdue Work

An overdue Task is a derived condition:

```txt
Task.status = ACTIVE
and Task.plannedDate < currentLocalDate
```

`OVERDUE` is not a canonical lifecycle status.

Overdue Tasks appear in a separate unresolved or Reconcile entry area rather than remaining indefinitely inside the ordinary Today checklist.

### 5.5 Ordering

Today may use temporary date-level or view-level ordering.

This must not become a universal canonical Task ordering field. Exact persistence belongs to Discussion 019.

---

## 6. Task Execution Model

### 6.1 Lifecycle

```txt
ACTIVE → COMPLETED
ACTIVE → DROPPED
```

Dated, undated, future, due-today, and unresolved-past are execution conditions of an active Task, not lifecycle states.

### 6.2 Complete

Completing a Task:

- changes it to `COMPLETED`
- records when completion was entered
- records the effective local date on which the user says it occurred
- removes it from active execution
- preserves ownership and history
- does not automatically complete its Project or achieve its Goal

### 6.3 Drop

Dropping a Task means the user no longer intends to perform it.

It:

- changes it to `DROPPED`
- removes active placement
- preserves history and parent relationship
- may become Reconcile and Adaptive Planning evidence
- does not automatically affect siblings

### 6.4 Carry

Carry is an explicit placement transition:

```txt
Task remains ACTIVE
old plannedDate → new plannedDate
Carry event recorded
```

Rules:

- only an active Task may be carried
- destination local date must be explicit
- no duplicate Task is created
- ownership and identity remain unchanged
- the current `plannedDate` is authoritative
- Carry history remains available
- midnight never performs hidden Carry

### 6.5 Unresolved Past Task

When a planned date passes without completion, Drop, or Carry:

- the Task remains `ACTIVE`
- the old planned date remains execution history
- the Task does not silently receive today as its date
- it becomes Reconcile-eligible
- it appears through unresolved-work UX rather than ordinary current-day work

### 6.6 Historical Task Correction

The user may correct historical Task execution.

The product distinguishes:

```txt
recordedAt = when the correction was entered
completedForLocalDate = when the user says the work occurred
```

Accepted principles:

- no final fixed seven-day correction limit is defined here
- long absence must not make truthful history permanently uncorrectable
- original events must remain auditable
- older or consequential correction may require stronger confirmation
- exact retention and event implementation belong to Discussion 019

### 6.7 Restore Completed or Dropped Task

A completed or dropped Task may be explicitly restored to `ACTIVE` as an audited correction.

Rules:

- the original terminal event remains in history
- the restored Task receives a new explicit date or becomes undated
- restoration is not silent history replacement

Accepted consistency principle from final Claude review:

> An entity may be corrected in place only when reversing its status does not resume generative or cascading behavior.

Task restoration is allowed because a Task has no occurrence-generation or child-cascade behavior.

This does not permit in-place reopening of Routine or Project.

---

## 7. Routine Execution Model

### 7.1 Lifecycle

```txt
ACTIVE → STOPPED
```

MVP does not introduce canonical `PAUSED`.

A stopped Routine never transitions back to `ACTIVE` as the same entity.

### 7.2 Resume Means New Continuation Routine

The UI may offer `Resume`, but its product meaning is:

```txt
old Routine remains STOPPED
→ create new ACTIVE continuation Routine
```

The stopped Routine and all of its historical RoutineOccurrences remain unchanged.

The new Routine uses the old one as editable source material. Its recurrence and ownership may be reviewed before creation.

An optional conceptual `continues from` relationship may support history continuity. Technical representation belongs to Discussion 019.

### 7.3 Stop Routine

Stopping a Routine:

- prevents occurrence eligibility after its effective stop boundary
- preserves historical occurrences
- does not convert past pending facts to Done
- does not carry missed behavior forward

### 7.4 Recurrence and Metadata Editing

Routine edits apply prospectively unless the user explicitly corrects historical execution.

A recurrence edit requires an effective local date.

Default:

```txt
effectiveDate = next local date after edit
```

The user may apply the edit today only when today's occurrence is still `PENDING` and the consequence is shown explicitly.

Rules:

- past occurrences are not regenerated
- a DONE or MISSED occurrence for today is not replaced
- future eligibility is recalculated from the effective date
- same-day applicability changes require explicit confirmation

---

## 8. RoutineOccurrence Execution Model

### 8.1 Meaning and Uniqueness

A RoutineOccurrence represents one Routine scheduled for one user-local date.

```txt
one Routine + one scheduled local date
→ at most one ordinary RoutineOccurrence
```

Multiple repetitions per day require a future explicit model extension.

### 8.2 Derivation and Materialization

User-visible behavior must not depend on whether occurrences are physically pre-created or lazily materialized.

Required semantics:

- the current-date occurrence becomes execution-relevant when Today is assembled
- missed scheduled dates can be reconstructed deterministically
- duplicate occurrences are forbidden
- untouched future projections are not historical facts
- exact generation horizon belongs to Discussion 019

Recommended conceptual behavior:

```txt
materialize or derive current local date
reconstruct missing past dates in bounded batches
optionally derive a short future preview
```

### 8.3 App Inactivity

When the app was not opened:

- past scheduled dates are reconstructed from recurrence
- unresolved past occurrences become `MISSED` on the next evaluation
- they do not become Carry debt in Today
- the user may later correct what actually happened

Important distinction:

```txt
MISSED execution fact
≠ proof of low user capacity
```

A long absence produces low-confidence evidence for Adaptive Planning unless the user clarifies the period.

### 8.4 Lifecycle

```txt
PENDING → DONE
PENDING → MISSED
```

MVP does not add canonical `SKIPPED`.

- `DONE` means the scheduled behavior occurred
- `MISSED` means it was not recorded as Done by the resolution boundary
- illness, intentional rest, or not-applicable may be optional feedback rather than a new lifecycle state

`MISSED` is neutral. It is not a moral judgment, punishment, streak failure, or accumulated debt.

### 8.5 Resolution Boundary

A pending occurrence becomes `MISSED` after its scheduled local date ends and the product next evaluates it.

No midnight background job is required for semantic correctness.

### 8.6 Historical Occurrence Correction

The user may explicitly correct:

```txt
MISSED → DONE
DONE → MISSED
```

Rules:

- scheduled local date never changes
- correction time is recorded
- original history remains auditable
- occurrence is never Carried
- no final fixed seven-day limit is accepted here
- older consequential correction may require stronger confirmation

### 8.7 No Carry

A missed occurrence stays attached to its original local date.

Doing the behavior today does not move or duplicate the missed occurrence.

---

## 9. Project Completion and Stop Cascades

### 9.1 Active Child Tasks Must Be Resolved

No active Task may remain owned by a terminal Project.

Before `COMPLETED` or `STOPPED` is finalized, the product shows all active child Tasks and allows explicit per-item or grouped resolution:

```txt
1. complete selected Tasks
2. drop selected Tasks
3. detach or reparent eligible selected Tasks
4. cancel the Project transition and resolve later
```

This final Claude correction prevents completed real-world work from being falsely recorded as Dropped merely to finish a Project transition.

The system must not silently complete, drop, preserve, detach, or reparent Tasks.

### 9.2 Project-Owned Routines

For either terminal transition:

```txt
Project ACTIVE → COMPLETED | STOPPED
→ active Project-owned Routines → STOPPED
```

A Routine survives only if the user explicitly changes its ownership before the Project transition.

### 9.3 Atomic Product Meaning

The Project transition, Task resolution choices, and automatic Routine stop are one effective product operation.

Technical transaction behavior belongs to Discussion 019.

### 9.4 Same-Day Occurrence

When a Project completes or stops on local date D:

- occurrences before D remain historical
- dates after D are no longer eligible
- existing same-day DONE or MISSED occurrences remain unchanged
- an existing same-day PENDING occurrence remains a scheduled fact for D
- the user may still complete it that day
- if unresolved after D, it becomes MISSED

The Project transition stops future execution after D. It does not rewrite an occurrence that already belonged to D.

### 9.5 Future Projections

After a Project-owned Routine stops:

- future projections must not appear as executable work
- untouched technical future records may be removed
- interacted or historical records must not be silently rewritten

### 9.6 Project Continuation and Undo

A completed or stopped Project is not later reopened as the same active entity.

Continuing the effort creates a new active phase or Project while preserving the old Project's history.

A short-lived immediate Undo may be implemented as rollback of an accidental action. It is not a later lifecycle reversal. Exact UX timing is deferred.

---

## 10. Goal Terminal Lifecycle Effects

### 10.1 Achieve Goal

Goal achievement is explicit user confirmation of real-world outcome.

Before finalization, active direct Tasks, Routines, and Projects must be shown and resolved.

Valid outcomes:

- child Projects complete, stop, or detach
- direct Tasks complete, drop, or detach
- direct Routines stop or detach

Nothing active remains owned by an achieved Goal.

### 10.2 Abandon Goal

Default cascade:

- direct Tasks are dropped unless explicitly detached
- direct Routines stop unless explicitly detached
- child Projects stop unless explicitly detached

Nothing active remains owned by an abandoned Goal.

This execution invariant belongs in Discussion 015. Exact lifecycle-screen UX may be specified later.

---

## 11. Timezone and Local-Date Rules

### 11.1 Effective Timezone

Execution uses a user-selected IANA timezone.

Examples:

```txt
Asia/Tehran
Europe/Berlin
America/Toronto
```

UTC timestamps may support storage, but daily product meaning is based on local date.

### 11.2 Historical Stability

Timezone changes must not silently rewrite historical scheduled dates.

Enough context must be preserved to interpret:

- scheduled local date
- timezone used for that schedule
- UTC event timestamp

Exact fields belong to Discussion 019.

### 11.3 Travel and Timezone Changes

- future Today assembly uses the newly effective timezone
- future recurrence evaluation uses the new timezone
- past occurrences retain original local-date context
- timezone transition must not create duplicate occurrences
- per-Routine fixed timezone is excluded from MVP

### 11.4 DST

Date-based recurrence remains attached to intended local dates.

Exact instant handling for nonexistent or repeated clock times belongs to Discussions 019–020.

---

## 12. Reconcile Eligibility

Discussion 015 identifies eligibility. Discussions 016–017 define grouping, prioritization, and actions.

### 12.1 Task Eligibility

A Task may become Reconcile-eligible when:

- its planned date passed unresolved
- it has been carried repeatedly
- it was dropped while supporting active parent work
- it was historically corrected or restored
- a parent terminal transition conflicts with it

### 12.2 Routine and Occurrence Eligibility

Routine execution may become Reconcile-eligible when:

- occurrences are repeatedly missed across observed periods
- historical corrections materially change the pattern
- recurrence is repeatedly edited
- a parent lifecycle transition stops the Routine

A single missed occurrence does not automatically require a major intervention.

### 12.3 Reconcile Output as Adaptive Input

- Reconcile may produce explicit decisions such as Carry, Drop, correction, or acknowledgement
- those decisions may become evidence for Adaptive Planning
- Adaptive Planning evaluates evidence quality and repetition
- absence-contaminated periods reduce confidence
- unresolved inactivity is not confirmed low capacity

The exact pattern model belongs outside Discussion 015.

---

## 13. Final Accepted Decisions

- Today is a derived local-date execution view
- `plannedDate` is the single authoritative Task entry mechanism for Today
- overdue is derived and shown separately from ordinary Today work
- Task Carry is explicit and changes placement, not status
- no hidden midnight Carry exists
- unresolved past Tasks become Reconcile-eligible
- Task terminal status may be corrected in place with audit because Task has no generative or cascading side effects
- Routine executes through RoutineOccurrence
- RoutineOccurrence never carries
- occurrence lifecycle is `PENDING → DONE | MISSED`
- MVP has no canonical `SKIPPED` or `PAUSED`
- MISSED is neutral and non-punitive
- stopped Routine cannot reactivate as the same entity
- Resume creates a new continuation Routine
- recurrence edits apply prospectively from an explicit effective date
- historical occurrence facts remain preserved and auditable
- no fixed seven-day historical correction expiry is accepted
- Project completion and stop both stop Project-owned Routines
- terminal Project flow may complete, drop, or detach selected active child Tasks
- terminal parent may not retain active dependent children
- an existing same-day occurrence remains a scheduled fact
- future occurrence eligibility ends after the stop boundary
- terminal Project continuation creates a new phase or entity
- Goal terminal transitions require explicit child resolution
- execution uses IANA timezone and stable historical local dates
- absence is not execution failure
- Reconcile and Adaptive Planning are separate flows
- Adaptive Planning may consume reliable repeated Reconcile outcomes

---

## 14. Remaining Deferred Questions

No blocking or important product-coherence question remains in Discussion 015.

The following implementation or later-policy details remain intentionally deferred:

- exact physical occurrence materialization horizon — Discussion 019
- exact strength and UX of confirmation for old historical corrections
- exact event-retention and audit schema — Discussion 019
- exact immediate Undo duration and UI
- exact DST instant-resolution algorithm — Discussions 019–020
- exact Reconcile grouping and action model — Discussions 016–017
- exact Adaptive Planning evidence weights and repetition thresholds

These do not reopen the accepted execution semantics above.

---

## 15. Scenario Checks

### Scenario A — Task Date Passed

```txt
Task planned for Tuesday
Tuesday ends without action
```

Expected:

- Task remains ACTIVE
- Tuesday remains its last planned date
- Task becomes overdue and Reconcile-eligible
- Task does not move automatically to Wednesday
- Task does not appear as ordinary Wednesday work unless rescheduled

### Scenario B — Repeated Carry

Expected:

- Task identity remains unchanged
- current plannedDate changes each time
- Carry history remains available
- repeated Carry may become reliable evidence when interaction is known

### Scenario C — Month-Long Absence

Expected:

- scheduled occurrences can be reconstructed
- historical facts remain correctable
- absence is low-confidence Adaptive Planning evidence
- no major capacity conclusion is inferred solely from non-use

### Scenario D — Resume Routine

Expected:

- old Routine remains STOPPED
- old occurrence history remains attached to it
- new active continuation Routine is created
- new recurrence may be edited before confirmation

### Scenario E — Complete Project with Active Work

Expected:

- active Tasks are shown
- user may mark selected Tasks complete
- user may drop selected Tasks
- user may detach or reparent eligible Tasks
- user may cancel the transition
- Project-owned Routines stop automatically
- no active child remains owned by the terminal Project

### Scenario F — Stop Project Today

Expected:

- existing occurrence today remains resolvable
- if unresolved at day end, it becomes MISSED
- no later occurrence remains executable

### Scenario G — Historical Correction After Long Gap

Expected:

- user may state that an old Task or occurrence was actually Done
- correction time and claimed execution date remain distinct
- original history remains auditable
- a fixed seven-day expiry does not make history permanently false

### Scenario H — Restore Dropped Task

Expected:

- original Drop event remains in history
- Task returns to ACTIVE explicitly
- new plannedDate is selected or Task becomes undated
- no child cascade or occurrence generation is resumed

---

## 16. Review Resolution

Claude's first review produced:

```txt
F1 — Blocking: Routine reactivation contradicted one-way lifecycle
F2 — Important: fixed seven-day correction window conflicted with long-gap recovery
F3 — Minor: MISSED needed neutral, non-punitive semantics
```

Integrated resolutions:

- F1 accepted: Resume creates a new continuation Routine
- F2 accepted: no fixed seven-day correction boundary
- F3 accepted: MISSED is neutral and non-punitive

Claude's final review produced two important clarifications:

```txt
F4 — Task in-place correction needed an explicit consistency principle
F5 — Project terminal flow needed Complete selected Tasks
```

Integrated resolutions:

- F4 accepted: in-place restoration is allowed only when no generative or cascading behavior resumes
- F5 accepted: terminal Project resolution includes completing selected active Tasks

Claude confirmed:

- `plannedDate` alone is sufficient for Today entry
- separating overdue work from ordinary Today is coherent
- same-day Project-stop occurrence behavior is coherent
- Goal terminal cascade may remain in Discussion 015
- no blocking finding remains

Mahdi accepted the final corrected model. Discussion 015 is closed.

---

## 17. Mind Map Impact — Precise Consolidation Instructions

Record these changes during consolidation after Discussion 021. Do not apply them silently before that consolidation pass.

### 17.1 Product Vision

Add these product principles:

```txt
The planner supports truthful execution, not guilt-driven backlog accumulation.
Today represents the current local-date execution surface.
Past unresolved work is surfaced for conscious resolution rather than silently carried.
The system preserves historical truth while allowing explicit correction.
Absence is uncertainty, not failure.
```

Clarify that the product does not optimize raw completion percentage at the cost of truthful history or user context.

### 17.2 MVP Core Loop

Replace or refine the execution portion of the core loop as:

```txt
Approved weekly execution window
→ Today derives today's Tasks and RoutineOccurrences
→ user completes, carries, or drops Tasks
→ user completes RoutineOccurrences
→ past unresolved Tasks and missed patterns become Reconcile-eligible
→ Reconcile records explicit recovery decisions
→ repeated reliable execution patterns may inform later Adaptive Planning
→ next execution window is proposed or continued
```

Add these loop invariants:

- Task Carry is always explicit
- RoutineOccurrence is never Carried
- overdue work does not silently flood Today
- one missed day does not trigger aggressive adaptation
- absence reduces evidence confidence

### 17.3 User Flow

Add or revise the following flows.

#### Daily execution flow

```txt
Open Today
→ derive current local date
→ show Tasks with plannedDate = today
→ show today's pending RoutineOccurrences
→ complete / carry / drop Task
→ mark occurrence Done
→ show unresolved-past entry separately
```

#### Overdue Task flow

```txt
Task date passes unresolved
→ Task remains ACTIVE
→ overdue condition derived
→ Task appears in unresolved/Reconcile area
→ user completes / carries / drops / leaves for later review
```

#### Routine stop and resume flow

```txt
Stop Routine
→ current Routine becomes STOPPED
→ future occurrence eligibility ends
→ history remains unchanged

Resume in UI
→ create new ACTIVE continuation Routine
→ review/edit recurrence
→ preserve optional continuity with old Routine
```

#### Project terminal flow

```txt
Complete or stop Project
→ show all active child Tasks
→ complete selected Tasks
→ drop selected Tasks
→ detach/reparent eligible selected Tasks
→ cancel transition if needed
→ automatically stop Project-owned Routines
→ finalize Project transition atomically
```

#### Historical correction flow

```txt
Open history
→ select Task or RoutineOccurrence
→ enter corrected execution fact
→ preserve original event
→ record correction time and effective local date
→ request stronger confirmation for older/consequential edits
```

#### Goal terminal flow

```txt
Achieve or abandon Goal
→ show active child Projects, direct Tasks, and direct Routines
→ explicitly resolve or detach each active child
→ finalize only when no active owned child remains
```

### 17.4 AI Responsibilities

Add:

- use canonical Task `plannedDate` when proposing or changing Today placement
- never create a hidden second Today-membership rule
- treat Carry, Drop, completion, and occurrence results as execution evidence
- distinguish confirmed execution decisions from missing interaction
- consume Reconcile outcomes only as evidence, not as automatic proof of user capacity
- require repeated reliable patterns or explicit feedback before proposing major workload changes
- lower confidence for absence-contaminated periods
- preserve long-term Goal direction while adapting only future execution windows

Explicitly exclude from AI responsibility:

- silently Carrying Tasks
- converting missed RoutineOccurrences into debt
- inferring low capacity from app absence alone
- reopening stopped Routines or terminal Projects in place
- rewriting historical execution without explicit user correction

### 17.5 AI Guardrails

Add these guardrails verbatim or equivalently:

```txt
Absence is not failure.
Missing data is not negative evidence.
One weak period is not a stable pattern.
Major adaptation requires repeated reliable evidence or explicit user feedback.
Carry must be explicit.
RoutineOccurrence is never Carried.
MISSED is neutral and non-punitive.
Historical facts are not silently rewritten.
Terminal generative or cascading entities are not reopened in place.
No active dependent child remains under a terminal parent.
```

Add a quality rule:

> Adaptive recommendations must communicate uncertainty when observed execution is incomplete or absence-contaminated.

### 17.6 Data Events

Record the need for these conceptual events. Exact schema belongs to Discussion 019.

#### Task events

```txt
TASK_PLANNED_DATE_SET
TASK_COMPLETED
TASK_DROPPED
TASK_CARRIED
TASK_RESTORED
TASK_HISTORY_CORRECTED
```

Each relevant event should preserve:

- entity identity
- recorded timestamp
- effective local date
- timezone context
- previous and new placement/status where relevant
- initiating actor or source

#### Routine events

```txt
ROUTINE_CREATED
ROUTINE_STOPPED
ROUTINE_CONTINUATION_CREATED
ROUTINE_RECURRENCE_CHANGED
```

#### Occurrence events

```txt
ROUTINE_OCCURRENCE_MATERIALIZED_OR_DERIVED
ROUTINE_OCCURRENCE_DONE
ROUTINE_OCCURRENCE_MISSED
ROUTINE_OCCURRENCE_CORRECTED
```

#### Parent lifecycle events

```txt
PROJECT_COMPLETED
PROJECT_STOPPED
PROJECT_CHILD_TASK_RESOLVED
PROJECT_CHILD_ROUTINE_AUTO_STOPPED
GOAL_ACHIEVED
GOAL_ABANDONED
GOAL_CHILD_RESOLVED
```

#### Evidence-quality metadata to support later Adaptive Planning

Record conceptual need for:

```txt
observed interaction coverage
absence-contaminated period flag
explicit Reconcile decision source
repetition across evaluable periods
user-provided explanation or feedback
```

Do not define scoring thresholds here.

### 17.7 Traction Metrics

Do not use raw completion rate alone as a product-success metric.

Add or refine metrics into three groups.

#### Execution usability

- percentage of Today Tasks explicitly resolved
- percentage of overdue Tasks later resolved through complete, Carry, or Drop
- frequency of silent unresolved accumulation, expected to decrease
- time from overdue eligibility to explicit resolution
- frequency of accidental terminal-action Undo

#### Routine execution quality

- Done/Missed distribution over evaluable periods
- percentage of historical occurrences corrected
- frequency of recurrence edits
- number of continuation Routines created after Stop

#### Adaptive trust and usefulness

- acceptance rate of workload-adjustment proposals
- percentage of adaptations based on repeated evaluable patterns
- percentage of suggestions shown with low-confidence warning
- user rejection rate when absence-contaminated data was involved
- reduction in repeated Carry after accepted adaptation

Guardrail metric:

> Never present absence-only completion decline as evidence of improved or degraded user capacity.

### 17.8 Current Decisions

Add the following finalized decisions:

- Today is a derived local-date view
- Task `plannedDate` is the only authoritative Today-entry field
- overdue is derived and separated from ordinary Today work
- Carry is explicit and preserves Task identity
- Task may be restored in place only as audited correction without generative/cascade side effects
- Routine executes through RoutineOccurrence
- RoutineOccurrence states are Pending, Done, and Missed
- MVP has no Skipped or Paused state
- Missed is neutral and creates no debt
- stopped Routine resumes through a new continuation Routine
- recurrence edits are prospective from an explicit effective date
- historical correction has no fixed seven-day expiry
- Project completion and stop both stop Project-owned Routines
- Project terminal flow resolves active Tasks through Complete, Drop, Detach/Reparent, or Cancel
- same-day occurrence remains a scheduled fact
- terminal Project continuation creates a new phase/entity
- terminal Goal requires child resolution
- execution uses IANA timezone and stable historical local dates
- Reconcile resolves past execution; Adaptive Planning designs future execution
- Adaptive Planning may use reliable repeated Reconcile outcomes
- absence and missing interaction reduce evidence confidence

### 17.9 Open Questions

Remove these questions because Discussion 015 resolves them:

- whether Today is a persisted Plan
- whether overdue is a Task status
- whether Carry happens automatically
- whether RoutineOccurrence can be Carried
- whether Routine needs Paused in MVP
- whether stopped Routine returns to Active
- whether Project STOPPED also stops child Routines
- whether active Tasks may remain under a terminal Project
- whether same-day occurrence disappears when Project stops
- whether Task and Routine may belong directly to Goal
- whether Missed creates accumulated debt
- whether app absence counts as poor performance

Retain or create these later-discussion questions:

- exact Reconcile grouping and suggested actions — Discussions 016–017
- exact historical-correction confirmation threshold
- exact occurrence materialization horizon — Discussion 019
- exact audit-event schema — Discussion 019
- exact Adaptive Planning evidence weights and repetition thresholds
- exact DST instant-selection strategy — Discussions 019–020
- exact immediate Undo duration and UX

---

## 18. Affected Formal Documents — Handoff to Discussion 022

After consolidation, accepted decisions must update or create:

- Today execution specification
- Task lifecycle, Carry, restoration, and historical-correction specification
- Routine stop, continuation, and recurrence-edit specification
- RoutineOccurrence derivation, lifecycle, and correction specification
- Project terminal transition and child-resolution specification
- Goal terminal transition and child-resolution specification
- timezone and local-date execution specification
- Reconcile eligibility and execution-input specification
- Adaptive Planning evidence-quality guardrails
- data and event specification in Discussion 019
- API/runtime specification in Discussion 020
- validation plan in Discussion 021
- implementation plan in Discussion 022

Potential ADRs:

- Today as a derived local-date view
- Task plannedDate as the single Today-entry source of truth
- explicit Carry with preserved placement history
- occurrence derivation/materialization semantics
- Routine continuation as a new entity rather than lifecycle reversal
- in-place Task restoration only for non-generative and non-cascading correction
- terminal parent child-resolution behavior
- auditable historical correction without fixed seven-day expiry
- separation of Reconcile recovery and Adaptive Planning adaptation

Discussion 022 owns the consolidation pass and formal-document updates. Closing this discussion alone does not apply those changes.

---

# خلاصهٔ فارسی

بحث ۰۱۵ مدل اجرای روزانه را تعریف می‌کند. Today یک view مشتق‌شده از تاریخ محلی است و شامل Taskهای فعال با `plannedDate = today` و `RoutineOccurrence`های pending همان روز می‌شود. Today یک Plan ذخیره‌شده نیست و overdue نیز status جداگانهٔ Task محسوب نمی‌شود.

Carry یک تغییر صریح `plannedDate` با حفظ هویت Task است و نباید خودکار انجام شود. Task می‌تواند Complete یا Drop شود و correction تاریخی و Restore فقط با حفظ audit trail انجام می‌شوند. Routine از طریق occurrence اجرا می‌شود؛ occurrence فقط `PENDING → DONE | MISSED` دارد، هرگز Carry نمی‌شود و missed occurrence به بدهی امروز تبدیل نمی‌گردد.

توقف Routine تاریخچه را حفظ می‌کند و Resume با یک Routine ادامه‌دهندهٔ جدید انجام می‌شود. پایان Project و Goal نیازمند تعیین تکلیف childهای فعال است و تاریخچه نباید بازنویسی شود. timezone از IANA و local-date پایدار استفاده می‌کند. قواعد temporal و Backlog در ۰۱۵A و هویت روزانه و effective local dates در ۰۱۵B تکمیل شده‌اند.
