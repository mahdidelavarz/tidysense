# Discussion 023 — Persistent Planning Facts and Rolling Execution Context

## Status

**Accepted and closed after two Claude review rounds.**

All round-one findings (1 Blocking, 6 Important, 5 Minor) were resolved and re-reviewed. The final Claude review found no new Blocking or Important issue. The remaining retention-class closure condition is resolved in this document.

```txt
STATUS = CLOSED
CLAUDE_REVIEW_ROUND_1 = COMPLETED
ROUND_1_FINDINGS = RESOLVED
CLAUDE_FINAL_REVIEW = COMPLETED
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
MIND_MAP = NOT_APPLIED
IMPLEMENTATION = NOT_YET_RECONCILED_IN_FORMAL_SPECS
```

**Mind Map status: NOT APPLIED.**

Closing this discussion does not itself modify `00-Canvas/Planner-Mindmap.canvas`, the formal specs, or the implementation plan. Those changes require a separate reconciliation/application step.

---

## 1. Problem Resolved

The accepted Planning model allows a long-lived Goal or Project while limiting detailed AI-generated execution to a maximum seven-day window.

A continuity gap existed:

> How does Week 2, Week 3, or Week 20 retain important information the user supplied during the original Planning conversation without depending on model-session memory or permanently storing the whole conversation?

Example:

```txt
Goal: Reach English B2 within one year.

User-provided planning details:
- current level is A2
- Friday must remain free
- only a phone is available
- conversation practice is preferred
- IELTS preparation is excluded
```

The accepted solution is **product memory, not model memory**.

The product persists only reviewed, structured, future-relevant Planning Facts that have no appropriate canonical home. Later weekly Planning contexts are rebuilt from current product state.

---

## 2. Governing Principle

Do not persist the full Planning conversation as long-term planning truth.

Do not persist free-form AI strategy narrative as durable planning truth.

Persist only user-reviewed structured Planning Facts that:

1. materially affect future planning,
2. have no existing canonical source-of-truth field,
3. do not introduce unsupported psychological or behavioral inference,
4. have explicit provenance,
5. remain visible, editable, and removable by the user.

Every later rolling Planning context is rebuilt from:

```txt
canonical current state
+
confirmed applicable Planning Facts
+
recent bounded execution evidence
+
relevant scoped deterministic Reconcile facts
+
current local temporal context
```

Model-session memory is never a correctness dependency.

---

## 3. No New Plan Entity

The canonical MVP work entities remain:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

There is still no canonical persisted `Plan` entity.

Planning Facts are subordinate durable planning context. They are not a new top-level work entity and do not replace Goal, Project, Task, Routine, or RoutineOccurrence.

PlanningDraft remains temporary proposal/recovery state before approval.

---

## 4. Seven-Day Detailed Horizon Remains Intact

Discussion 023 does not change the accepted detailed execution horizon.

Long-lived Goal, Project, and Routine structure may span months or years.

AI-generated detailed Task execution remains limited to no more than seven consecutive local calendar days per execution window.

A one-year request must not become a 365-day scheduled Task backlog.

---

## 5. Three-Way Information Placement Rule

Every potentially persistent planning detail must be classified as follows.

### Case A — Existing canonical home exists

Store it only in the existing canonical field.

Examples:

```txt
Goal target date
→ Goal.targetDate

Project target date
→ Project.targetDate

Project completion meaning
→ Project.completionMeaning

Task execution date
→ Task.plannedDate

Task deadline
→ Task.deadline

Routine-specific recurring weekday pattern
→ Routine.recurrenceDefinition
```

Do not duplicate the same meaning inside Planning Facts.

### Case B — Future-relevant but no canonical home exists

AI may propose a structured Planning Fact for explicit user review.

Examples:

```txt
current English level = A2
Friday is unavailable across this planning scope
available device = phone only
conversation-focused learning is preferred
IELTS preparation is excluded
```

### Case C — Draft-local only

Keep the information only inside the Planning flow and discard it with the draft lifecycle.

Core rule:

> Persistence is justified by future planning value, not merely because something appeared in conversation.

---

## 6. Planning Fact Scope

A durable Planning Fact belongs to exactly one of:

```txt
Goal
OR
standalone Project
```

Conceptually:

```txt
PlanningFact
- goalId?
- projectId?

constraint:
exactly one is non-null
```

Rules:

- Goal-owned Projects consume the parent Goal's Planning Facts by default.
- Goal facts apply to all descendant Projects by default in MVP.
- No per-child applicability subset is introduced in MVP.
- standalone Projects may own their own Planning Facts.
- Task and Routine do not own persistent Planning Facts in MVP.
- a one-off standalone Task does not justify a persistent planning-memory scope.
- a standalone Routine-specific schedule rule belongs in `Routine.recurrenceDefinition` where representable.
- standalone Routine-only soft preferences with no parent Goal/Project are intentionally unsupported as durable Planning Facts in MVP.
- global/user-level planning preferences remain out of scope.

---

## 7. PlanningFact Contract

Conceptual durable shape:

```txt
PlanningFact
- id
- goalId?
- projectId?
- factType
- strength
- structuredValue
- source
- status
- sourcePlanningAttemptId?
- capturedAt
- lastConfirmedAt
- updatedAt
- expiredAt?
- removedAt?
```

Exactly one of `goalId` or `projectId` is present.

### 7.1 Category is derived

`category` is not independently mutable or authoritative.

It is derived from `factType` through a closed, versioned mapping.

Representative categories:

```txt
CONSTRAINT
AVAILABILITY
RESOURCE
PREFERENCE
STARTING_STATE
INTENT
```

Representative mappings:

```txt
UNAVAILABLE_WEEKDAY → AVAILABILITY
UNAVAILABLE_DATE → AVAILABILITY
UNAVAILABLE_DATE_RANGE → AVAILABILITY
AVAILABLE_DEVICE → RESOURCE
CURRENT_LEVEL → STARTING_STATE
LEARNING_FOCUS → PREFERENCE
EXCLUDED_PATH → INTENT
```

### 7.2 Provenance

Supported provenance includes:

```txt
USER_EXPLICIT
USER_CONFIRMED_AI_EXTRACTION
```

`sourcePlanningAttemptId?` may link the fact to its originating Planning attempt/draft for audit correlation without preserving the full conversation as durable product context.

AI-extracted facts do not become durable until explicitly confirmed by the user.

### 7.3 Initial confirmation

Initial approval in Planning Draft Review is the first confirmation.

Therefore:

```txt
capturedAt = initial persistence time
lastConfirmedAt = initial confirmation time
```

An ACTIVE durable fact always has `lastConfirmedAt`.

---

## 8. Planning Fact Lifecycle

Planning Facts use:

```txt
ACTIVE
EXPIRED
REMOVED
```

### ACTIVE

The fact currently participates in applicable Planning context.

### EXPIRED

A fact with explicit deterministic date validity has naturally passed that range.

Example:

```txt
UNAVAILABLE_DATE_RANGE
2026-12-01 → 2026-12-20
```

After the end local date, it may transition deterministically to `EXPIRED`.

Expiration preserves identity, provenance, and historical audit.

### REMOVED

The user explicitly removes the fact from future Planning context.

Removed facts no longer participate in active context but remain represented according to audit/retention policy.

### Mutation rule

Editing a Planning Fact mutates the same identity in place.

```txt
same PlanningFact.id
→ structured value / supported metadata changes
→ updatedAt advances
→ prior value preserved through semantic audit event
```

Editing does not create a new PlanningFact identity merely to preserve history.

AI may suggest that a non-date-bounded fact appears stale, but it may not silently rewrite, expire, or remove it.

---

## 9. Strength Semantics

```txt
HARD
SOFT
INFORMATIONAL
```

### HARD

HARD is permitted only when:

1. `factType` belongs to the closed HARD vocabulary,
2. `structuredValue` is schema-valid,
3. the current MVP has enough canonical data for deterministic enforcement.

A conflicting AI-generated execution placement is invalid.

### SOFT

A user preference the AI should respect but which does not deterministically block the proposal.

A material contradiction may surface as a non-blocking warning.

If contradiction detection itself requires AI interpretation, the warning must be labelled as AI-generated review assistance rather than deterministic rule output.

### INFORMATIONAL

Future-relevant context that informs Planning but cannot generally be enforced deterministically.

Example:

```txt
AVAILABLE_DEVICE = PHONE_ONLY
```

Without machine-readable Task resource requirements, the product cannot prove that every arbitrary proposed Task is phone-compatible.

---

## 10. Closed HARD Vocabulary — MVP

The accepted initial HARD vocabulary is exactly:

```txt
UNAVAILABLE_WEEKDAY
UNAVAILABLE_DATE
UNAVAILABLE_DATE_RANGE
```

No AI runtime may invent new HARD types.

### 10.1 UNAVAILABLE_WEEKDAY

```txt
structuredValue:
- weekdays: [MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY]
```

For applicable AI Task proposals:

```txt
Task.plannedDate weekday ∈ unavailable weekdays
→ invalid
```

For newly proposed Routines, recurrence must avoid prohibited weekdays when the accepted recurrence representation can express the rule.

### 10.2 UNAVAILABLE_DATE

```txt
structuredValue:
- localDate
```

```txt
Task.plannedDate = unavailable localDate
→ invalid
```

### 10.3 UNAVAILABLE_DATE_RANGE

```txt
structuredValue:
- startLocalDate
- endLocalDate
```

The range is inclusive.

```txt
Task.plannedDate within unavailable range
→ invalid
```

### Deferred HARD candidates

The following are explicitly not HARD in the current MVP:

```txt
DAILY_TIME_WINDOW
MAX_DAILY_PLANNED_MINUTES
```

The current Task model does not have canonical planned-time or estimated-duration data sufficient to enforce them deterministically.

They may be reconsidered only after the underlying Task temporal/capacity model supports real enforcement.

### Unsupported natural-language hard constraints

If the user expresses a hard constraint outside the supported vocabulary:

```txt
unsupported hard meaning
→ visible unsupported-constraint state
→ no false claim of deterministic enforcement
→ user may rephrase into supported HARD form
   OR explicitly retain weaker contextual guidance as SOFT/INFORMATIONAL
```

The product must not silently weaken a user statement.

Unsupported HARD guidance does not automatically block approval of unrelated valid work proposals.

---

## 11. AI Extraction Is Proposal, Not Truth

Extracting future-relevant Planning Facts from conversation is an AI proposal operation.

```txt
conversation
→ AI proposes structured facts
→ deterministic schema validation
→ deterministic canonical-duplication validation
→ user reviews
→ accept / edit / reject individually
→ accepted facts persist
```

No silent absorption.

No background profiling.

No inferred motivation, discipline, personality, diagnosis, or psychological state.

No persistence merely because information might someday be useful.

### Independent approval units

Work proposals and Planning Fact proposals are independently selectable within the Planning review.

The user may approve valid work while rejecting every proposed Planning Fact.

If all Planning Facts are rejected, the product shows a lightweight non-blocking disclosure such as:

> No additional planning details will be remembered for future planning windows.

This does not block work approval.

---

## 12. Deterministic No-Duplication Gate

The system must not depend on AI judgment to decide whether information belongs in canonical state or Planning Facts.

A closed, versioned classification/mapping table defines known canonical homes.

Minimum accepted rules include:

| User meaning / proposed datum | Authoritative home | PlanningFact allowed? |
|---|---|---|
| Goal target date | `Goal.targetDate` | No |
| Goal review date | `Goal.reviewDate` | No |
| Project target date | `Project.targetDate` | No |
| Project completion meaning | `Project.completionMeaning` | No |
| Task planned date | `Task.plannedDate` | No |
| Task deadline | `Task.deadline` | No |
| Task backlog review checkpoint | `Task.reviewDate` | No |
| Routine-specific recurrence rule | `Routine.recurrenceDefinition` | No for the same routine-specific meaning |
| Goal/Project-wide unavailable weekday | PlanningFact `UNAVAILABLE_WEEKDAY` | Yes |
| Goal/Project-wide unavailable date | PlanningFact `UNAVAILABLE_DATE` | Yes |
| Goal/Project-wide unavailable date range | PlanningFact `UNAVAILABLE_DATE_RANGE` | Yes |
| available device with no canonical resource field | PlanningFact | Yes |
| starting level with no canonical Goal field | PlanningFact | Yes |
| planning preference with no canonical field | PlanningFact | Yes |
| explicit path/content exclusion with no canonical field | PlanningFact | Yes |

Important distinction:

> A Goal-wide `UNAVAILABLE_WEEKDAY` is not considered duplicate merely because a currently proposed Routine also excludes that weekday. The Goal Planning Fact governs future Tasks and future child planning across rolling windows; the Routine recurrence governs that Routine's own canonical schedule.

The validator uses scope and semantic ownership, not factType alone, when deciding duplication.

---

## 13. Deterministic Enforcement Scope

HARD Planning Facts participate in the existing Discussion 020C validation pipeline.

```txt
provider output
→ schema validation
→ semantic validation
→ temporal validation
→ PlanningFact hard-constraint validation
→ context/policy validation
→ usable proposal
```

A Week-N proposal generated without required applicable ACTIVE HARD Planning Facts in its input context fails context-integrity validation.

### Manual actions

In MVP, HARD Planning Facts gate **AI-generated Planning proposals**.

They do not block direct user-authorized manual actions such as Quick Create or manual Task/Routine edits.

Rationale:

- the user may intentionally create an exception,
- direct manual authority remains with the user,
- forcing every manual mutation through a new constraint engine is outside this discussion's evidence and scope.

Therefore internal `HARD` terminology must not be translated into user-facing copy that promises universal enforcement across manual actions.

This limitation must be reflected in later UX copy.

---

## 14. Routine and Task Consumption

Planning Facts are stored once at their planning scope and consumed where applicable.

### AI Task generation

Every future Planning operation for the Goal or standalone Project receives its confirmed applicable ACTIVE Planning Facts.

Supported HARD date constraints are validated against every proposed Task `plannedDate` in that scope.

### AI Routine generation

Applicable Planning Facts are supplied while proposing new Routines.

Where a scheduling constraint can be represented directly by the Routine recurrence model, the resulting Routine encodes the appropriate recurrence.

After creation, `Routine.recurrenceDefinition` remains canonical for that Routine.

The Goal/Project Planning Fact may still remain valid at the broader planning scope because it governs future Task and Routine proposals beyond the single current Routine.

---

## 15. Week-N Planning Context Contract

A rolling Planning operation must receive a deterministic, bounded context assembled from current product truth.

```txt
WEEKLY_PLANNING_CONTEXT

1. Planning scope
   Goal OR standalone Project

2. Confirmed applicable ACTIVE Planning Facts

3. Active Projects in scope
   where Goal exists

4. Active Routines in scope

5. Relevant unfinished Tasks

6. Previous execution window only
   - completed Tasks where relevant
   - carried/replanned Tasks where relevant
   - dropped Tasks where relevant
   - Routine DONE/MISSED facts

7. Relevant deterministic Reconcile facts
   - only entities inside the same Goal/Project planning scope

8. Current local date and timezone

9. Next detailed execution window
   - maximum seven local calendar days
```

### Context inheritance

For a Goal-scoped Planning operation, Goal Planning Facts apply to descendant Projects by default.

For a standalone Project, only that Project's own Planning Facts apply.

### Bounded history

The default execution-history window is the immediately previous detailed execution window.

No unlimited history transcript is sent merely to make the model feel informed.

### Context priority

Planning Facts are added to the existing Discussion 020C context-priority system as part of the required correctness floor for the relevant planning scope.

No separate competing priority mechanism is introduced.

Applicable ACTIVE HARD Planning Facts are mandatory context and cannot be silently truncated.

---

## 16. Reconfirmation and Staleness

Planning Facts are not write-once memory.

The user may edit or remove them at any time through the eventual Planning-context UX.

### Reconfirmation

Do not turn Goal or Project review into a mandatory mini-form containing every Planning Fact.

Instead, when the existing Goal/Project review interaction is shown, a lightweight optional entry may appear when useful:

```txt
Planning details: N active
Review details
```

The normal continuation/review interaction remains low-friction.

STARTING_STATE facts may be good candidates to surface because they are more likely to become stale, but MVP does not add a new time-based reconfirmation trigger solely for them.

### Date-bounded expiration

Explicit date/date-range facts expire deterministically using the accepted local-date semantics.

AI does not choose their expiration date.

### Other stale facts

AI may suggest that an ACTIVE non-date-bounded fact may need review, but may not silently change its status or value.

---

## 17. SOFT Contradiction Warnings

SOFT and INFORMATIONAL facts do not create deterministic blocking gates merely because AI might ignore them.

When a contradiction can be reliably detected, a visible non-blocking warning may be shown.

When contradiction detection requires open-ended AI interpretation, the result must be identified as AI-generated assistance rather than deterministic validation.

No parallel warning framework is introduced if the existing Planning warning mechanism can represent it.

---

## 18. Sensitive Data and Data Minimization

Planning Facts inherit the privacy and data-minimization principles from Discussions 018A and 019C.

Only the structured operational value needed for future planning may persist.

Example:

User says:

```txt
I cannot study on Fridays because of a health condition.
```

The durable scheduling fact may be:

```txt
UNAVAILABLE_WEEKDAY = FRIDAY
```

The product must not persist the unnecessary explanation:

```txt
reason = health condition
```

unless a separate accepted product requirement creates a legitimate necessary home for it.

Do not persist:

- unnecessary free-text reasons behind constraints,
- inferred diagnoses,
- inferred psychological state,
- motivation/discipline labels,
- raw conversation merely as support for a structured fact.

The existing prohibition against psychological and health inference remains authoritative.

---

## 19. Retention and Access Mapping

The closure condition from final Claude review is resolved here.

Discussion 019C requires every persisted record type to have an explicit retention class.

Accepted mapping:

### Durable PlanningFact current record

```txt
Retention class: R1 — CANONICAL_AUDIT
```

Reason:

A confirmed Planning Fact is durable user-approved product context that can materially affect future planning decisions. It is neither temporary draft state (R3), bounded session history (R2), operational diagnostics (R4), security-only telemetry (R5), nor raw AI content (R6).

R1 here is used as the existing durable user-decision/audit retention family. This assignment does **not** make PlanningFact a canonical work entity.

### PlanningFact lifecycle/mutation events

```txt
PLANNING_FACT_CREATED
PLANNING_FACT_CONFIRMED
PLANNING_FACT_UPDATED
PLANNING_FACT_EXPIRED
PLANNING_FACT_REMOVED

Retention class: R1
```

Material value-change events should record structured/minimized field changes and avoid unnecessary sensitive text.

### Proposed fact before approval

A fact that exists only inside an unapproved PlanningDraft remains part of the draft/proposal retention family:

```txt
Retention class: R3 — TEMPORARY_DRAFT
```

### AI operational metadata

AIOperation and context-scope metadata remain:

```txt
Retention class: R4 — OPERATIONAL_DIAGNOSTICS
```

### Raw prompt / response

Raw AI content remains governed by:

```txt
Retention class: R6 — RAW_AI_CONTENT
```

and is not the source of durable PlanningFact truth.

### Access

User-visible ACTIVE Planning Facts are accessible through normal product access needed to operate Planning.

Engineering/analytics access must follow the existing least-privilege and minimization rules of 019C. PlanningFact values must not be copied into `AIContextScopeManifest`; the manifest records category/scope/count metadata only.

Exact retention durations remain subject to the same legal/security review already reserved by Discussion 019C.

---

## 20. PlanningDraft and Approval Contract

PlanningDraft may include:

```txt
proposedPlanningFacts[]
```

These are temporary until explicitly approved.

Work-entity approval and PlanningFact approval are independent selections.

Final confirmed application may therefore create:

```txt
canonical work entities
+
confirmed durable Planning Facts
```

This does not create a Plan entity.

The transactional/API mechanics must later reconcile the Discussion 014, 019, and 020 families before implementation becomes authoritative.

---

## 21. Context Integrity and Observability

Discussion 019C's `AIContextScopeManifest` remains scope metadata only.

Planning operations may record inclusion metadata such as:

```txt
GOAL_PLANNING_FACTS
PROJECT_PLANNING_FACTS
```

with counts/field-group categories as appropriate.

The manifest must not duplicate actual PlanningFact values, user wording, sensitive explanations, or raw conversation.

A Week-N AI operation that silently omits required applicable ACTIVE HARD Planning Facts is invalid under the existing Discussion 020C context-integrity gate.

---

## 22. Derived Long-Term Big Picture

The long-term/yearly view remains derived rather than persisted as stale AI strategy narrative.

Persisted inputs may include:

```txt
Goal desiredOutcome
Goal targetDate
Projects
Project targetDates
Project completion meanings
confirmed Planning Facts
actual current lifecycle state
recent execution / Reconcile evidence
```

A current roadmap/yearly glance may be regenerated from those facts.

Generated roadmap narrative is presented as an updated AI interpretation/explanation, not historical committed truth.

Project `targetDate` remains the primary structured signal for broad sequencing where appropriate.

If a regenerated roadmap differs materially from an older presentation, the UI should communicate that it is an updated interpretation based on current state rather than pretending the original narrative was a durable commitment.

---

## 23. End-to-End Example

User enters:

```txt
I want to reach English B2 within one year.
```

Clarification yields:

```txt
current level = A2
Friday unavailable
phone only
conversation preferred
IELTS excluded
```

Planning produces:

```txt
Goal proposal
Project / Task / Routine proposals
first seven-day execution window
proposed Planning Facts
assumptions / warnings
```

The user reviews work and Planning Facts separately.

Accepted result may persist:

```txt
Goal
Projects
Tasks / Routines approved now
confirmed Planning Facts
```

Week 1 executes.

Before Week 2:

```txt
Goal current state
+ ACTIVE confirmed Planning Facts
+ active Projects / Routines
+ unfinished Tasks
+ previous execution window evidence
+ scoped Reconcile facts
+ local date/timezone
→ deterministic bounded Week-N context
```

If Friday is an ACTIVE HARD unavailable weekday:

```txt
AI proposes Task.plannedDate = Friday
→ deterministic validation failure
```

Week 2 therefore continues the user's approved planning context without storing or replaying the original conversation.

---

## 24. Final Guardrails

Do not:

- create a canonical Plan entity,
- persist the whole Planning chat as long-term planning truth,
- persist free-form AI strategy narrative as authoritative roadmap state,
- invent PlanningFact types at runtime,
- invent HARD types at runtime,
- claim deterministic enforcement for unsupported constraints,
- silently downgrade unsupported hard user meaning,
- duplicate canonical fields in Planning Facts,
- store unnecessary free-text reasons behind structured constraints,
- infer motivation, discipline, personality, health diagnosis, or psychological state,
- silently mutate facts because AI thinks reality changed,
- send unlimited historical context to Week-N Planning,
- omit required ACTIVE HARD facts from Planning context,
- claim internal HARD facts universally block manual user actions.

---

## 25. Review Resolution

### Claude round one

Claude found:

```txt
1 Blocking
6 Important
5 Minor
```

Resolved changes included:

- removed unenforceable Task time/duration constraints from MVP HARD vocabulary,
- derived `category` from `factType`,
- added deterministic canonical-duplication validation,
- explicitly bounded HARD enforcement to AI Planning for MVP,
- extended durable fact scope to Goal or standalone Project,
- kept reconfirmation optional beside existing low-friction review,
- prohibited persistence of unnecessary sensitive constraint reasons,
- defined ACTIVE / EXPIRED / REMOVED lifecycle,
- defined initial `lastConfirmedAt`,
- made work and PlanningFact approvals independent,
- added source Planning attempt provenance,
- scoped Reconcile evidence to the same planning owner.

### Claude final re-review

Claude confirmed all round-one findings were correctly resolved.

The 13 re-review questions produced no new Blocking or Important finding.

Accepted final clarifications from that review:

- Task/Routine PlanningFact ownership remains intentionally unsupported in MVP.
- PlanningFact edits mutate the same identity and preserve old values in audit events.
- the canonical-home duplication gate uses a closed deterministic mapping table.
- Goal Planning Facts apply to descendant Projects by default.
- deterministic date-bounded expiration is safe under existing local-date semantics.
- rejecting all proposed facts produces only a lightweight non-blocking disclosure.
- internal HARD terminology must not overpromise universal manual enforcement in user copy.
- STARTING_STATE reconfirmation remains optional in MVP.
- Planning Facts join the existing 020C required-context priority system rather than creating a parallel priority model.
- regenerated roadmap + Project target dates are sufficient for the long-term view in MVP.
- the final retention-class closure condition is resolved in Section 19.

No unresolved Blocking or Important finding remains.

---

## 26. Mind Map Impact — NOT APPLIED

The following impacts are accepted but have **not** yet been written into `00-Canvas/Planner-Mindmap.canvas`.

### Product Model

Add subordinate durable Planning Facts scoped to:

```txt
Goal
OR standalone Project
```

while preserving the existing canonical work-entity set.

### AI Responsibilities

Add:

- propose future-relevant structured Planning Facts,
- never silently persist extracted facts,
- consume ACTIVE confirmed applicable Planning Facts in future rolling windows,
- distinguish deterministic HARD constraints from SOFT/INFORMATIONAL context,
- rebuild current long-term roadmap narrative from current facts/state.

### AI Guardrails

Add:

- closed HARD vocabulary,
- no arbitrary HARD type creation,
- no unsupported-hard silent downgrade,
- no required-context omission,
- no duplicate PlanningFact where an authoritative canonical field exists,
- no unnecessary sensitive reason persistence,
- no model-memory correctness dependency.

### User Flow

Add conceptually:

```txt
Planning conversation
→ structured fact proposals
→ user review
→ independent accept/edit/reject
→ approval
→ rolling Week-N context from product state
```

### Data / Events / Context

Add conceptually:

- PlanningFact subordinate durable record,
- PlanningFact lifecycle/mutation events,
- R1 retention mapping for confirmed durable facts/events,
- R3 retention while only proposed in draft,
- PlanningFact context categories in context-scope metadata,
- Week-N required-context integrity.

**Mind Map application remains a separate next step.**

---

## 27. Affected Formal Documents — NOT YET APPLIED

This accepted discussion requires later reconciliation of:

- Discussion 014 PlanningDraft/output contract,
- Discussion 019 persistence/events/retention contracts,
- Discussion 020 context-builder/runtime/validation contracts,
- Goal/Project review UX specification,
- rolling weekly continuation specification,
- implementation plan,
- Mind Map.

Closing Discussion 023 does not silently edit those sources.

---

## 28. Closure

Discussion 023 is closed.

Final accepted principle:

> The AI does not need to remember the original planning conversation. The product retains only confirmed, structured, future-relevant planning facts and deterministically rebuilds the bounded context required for each future execution window.

Final state:

```txt
STATUS = CLOSED
CLAUDE_REVIEW = COMPLETE
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
MIND_MAP = NOT_APPLIED
FORMAL_DOC_RECONCILIATION = PENDING
```

---

# خلاصهٔ فارسی

Discussion 023 مسئلهٔ حافظهٔ برنامه‌ریزی بین هفته‌های مختلف را حل می‌کند. کل مکالمه یا narrative استراتژی AI ذخیره نمی‌شود. فقط اطلاعات آینده‌دار، ساختاریافته و تأییدشدهٔ کاربر که خانهٔ canonical مناسبی ندارند به‌صورت PlanningFact نگه داشته می‌شوند.

PlanningFact در MVP متعلق به Goal یا Project مستقل است. Project زیر Goal به‌صورت پیش‌فرض از Facts همان Goal استفاده می‌کند. Task و Routine صاحب PlanningFact مستقل نیستند. HARD فقط برای سه نوع قابل‌اجرای قطعی پذیرفته شده: روز هفتهٔ غیرقابل‌استفاده، تاریخ غیرقابل‌استفاده و بازهٔ تاریخ غیرقابل‌استفاده. محدودیت ساعت روز و سقف دقیقهٔ روزانه تا وقتی Task زمان/مدت canonical ندارد HARD محسوب نمی‌شوند.

AI فقط Fact پیشنهاد می‌دهد؛ کاربر Factها را مستقل از work entities تأیید، ویرایش یا رد می‌کند. Weekهای بعدی context خود را از state واقعی، Facts فعال و تأییدشده، پنجرهٔ اجرایی قبلی، Reconcile facts همان scope و زمان محلی می‌گیرند. حافظهٔ session مدل هیچ نقشی در correctness ندارد.

Factهای تأییدشده و eventهای مادی آن‌ها در retention family `R1 — CANONICAL_AUDIT` قرار می‌گیرند؛ Factهای تأییدنشده داخل Draft در `R3` می‌مانند؛ operational metadata در `R4` و raw AI content در `R6` باقی می‌ماند. این assignment PlanningFact را به canonical work entity تبدیل نمی‌کند.

Discussion بسته شده ولی تغییرات Mind Map و formal specs هنوز اعمال نشده‌اند و باید در مرحلهٔ جداگانه reconcile شوند.
