# Discussion 014 — AI Planning Output Contract

## Status

Accepted and closed after GPT × Claude review.

Required companion amendment:

- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]

This document owns the base `PlanningDraft` hierarchy, limits, review semantics, approval boundary, and seven-day detailed execution horizon. Discussion 014A adds the accepted temporal-checkpoint fields, defaults, provenance, and validation rules. They form one decision family and must be read together. Where temporal wording differs, Discussion 014A is authoritative.

Mahdi approved the final product decisions. Claude's final review found no blocking or important issue. Its final minor documentation finding was resolved by adding `BLOCKED_BY_ANCESTOR` to the canonical review-state enum.

Related accepted discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]

---

## 1. Scope

This discussion defines the structured, bounded `PlanningDraft` produced by Planning AI before user approval.

It defines:

- supported proposed entities and relationships
- maximum one Goal per draft
- maximum seven-day detailed planning horizon
- first-week calibration and later adaptive continuation
- assumptions, warnings, unresolved questions, and blocking behavior
- hierarchy review, editing, exclusion, and approval semantics
- parent-child dependency behavior
- authoritative sources for Task dates and Routine recurrence

The `PlanningDraft` is ephemeral. It creates no canonical entity until explicit user approval.

> Conversation produces a proposal. Approval creates product entities.

---

## 2. Explicitly Out of Scope

This discussion does not define:

- conversation entry and clarification limits — Discussion 013
- exact visual components, responsive layout, colors, animation, or wireframes
- Today execution and `RoutineOccurrence` generation — Discussion 015
- exact Reconcile signals, thresholds, and adaptation actions — Discussions 016–017
- detailed safety, privacy, or provider-failure policy — Discussion 018
- persistence, transactions, and events — Discussion 019
- provider, runtime, API, DTO, and schema-enforcement implementation — Discussion 020
- implementation sequencing — Discussion 022

Later discussions may define implementation details but may not silently change the accepted product semantics here.

---

## 3. Supported Proposals and Ownership

Planning AI may propose:

```txt
Goal
Project
Task
Routine
```

It does not directly propose `RoutineOccurrence`.

Ownership rules inherited from Discussion 012:

```txt
Project → one Goal or standalone
Task → one Goal, one Project, or standalone
Routine → one Goal, one Project, or standalone
```

A Task or Routine may not belong to Goal and Project simultaneously.

---

## 4. Core Contract Principles

### 4.1 Draft, Not Hidden Execution

Planning AI returns a proposal that can be rendered, edited, validated, and approved.

It must not:

- create canonical entities before approval
- bypass review through hidden actions
- invent concepts outside Discussion 012
- silently change user intent
- claim proposed ownership, recurrence, or dates were already applied

### 4.2 One Coherent Intention and Maximum One Goal

One `PlanningDraft` represents one coherent planning intention.

It may contain:

```txt
zero Goals
or exactly one Goal
```

It must never propose more than one Goal in one draft.

If the user expresses multiple independent outcomes, the AI must ask the user to choose one, prioritize one coherent intention with visible omissions, or separate them into future planning flows.

A contextual planning flow may reference one existing Goal but must not introduce another unrelated Goal into the same draft.

### 4.3 Minimal Complete Structure

The draft contains only structures justified by the user's intention.

Valid examples include:

- one standalone Task
- one standalone Routine
- one standalone Project with child work
- one Goal with direct Tasks and Routines
- one Goal with Projects and child work
- multiple standalone Tasks for one coherent intention

The AI must not create artificial Goal or Project wrappers merely for visual neatness.

### 4.4 Long-Term Direction, Seven-Day Detailed Horizon

Goals, Projects, and Routines may last months or years.

One `PlanningDraft` may schedule detailed actionable work for no more than seven consecutive calendar days.

Even if the user requests a one-year or two-year plan, the AI must not generate a fully scheduled long-term backlog. It may represent the long-term Goal and meaningful Projects, but only the first seven days receive detailed Task dates and Routine placements.

The seven-day limit applies to detailed execution, not to the lifetime of canonical Goal, Project, Task, or Routine entities.

### 4.5 Adaptive Weekly Continuation

The first approved seven-day execution window is a calibration period because the product does not yet know the user's real capacity, friction, or fit with the proposed plan.

At the transition from week one to week two, the product must obtain an explicit lightweight decision:

```txt
CONTINUE_AS_IS
ADJUST
PAUSE_OR_STOP
REVIEW_WITH_AI
```

This check concerns the next detailed execution window. It does not reconfirm the existence of approved Goals, Projects, Tasks, or Routines.

After the first explicit continuation decision, later weekly windows may continue automatically when observed execution signals indicate that the plan remains suitable.

The product surfaces another decision only when Reconcile detects meaningful drift, overload, repeated deferral, repeated missed Routine occurrences, user changes, or another signal that the plan may no longer fit.

Exact signals, thresholds, passive-on-open behavior, and optional notifications belong to Discussions 015–017. This mechanism integrates with Reconcile and must not become a separate mandatory weekly interruption.

---

## 5. PlanningDraft Shape

```txt
PlanningDraft
- draftSummary
- proposals[]
- assumptions[]
- warnings[]
- unresolvedQuestions[]
- firstWeekPlan?
- continuationPolicy
```

### 5.1 Proposal

```txt
Proposal
- draftId
- entityType: GOAL | PROJECT | TASK | ROUTINE
- title
- description?
- parentDraftId?
- source: EXPLICIT | INFERRED
- confidence: HIGH | MEDIUM | LOW
- fields
```

`draftId` is temporary and exists only inside the draft.

Allowed parent mappings:

```txt
PROJECT → GOAL
TASK → GOAL | PROJECT
ROUTINE → GOAL | PROJECT
```

A Task or Routine with no parent is standalone.

### 5.2 Goal Fields

```txt
GoalFields
- desiredOutcome
```

Rules:

- required when a Goal is proposed
- maximum one proposed Goal per draft
- may clarify wording but must not silently replace the user's intended outcome
- contains no AI-calculated achievement percentage

### 5.3 Project Fields

```txt
ProjectFields
- completionMeaning?
```

A Project must represent a finite or independently manageable effort. It must not exist only as an artificial wrapper.

### 5.4 Task Fields

```txt
TaskFields
- plannedDate?
```

A Task date may be included only when explicit, deterministically derived from confirmed context, or presented as a visible editable assumption.

Any detailed `plannedDate` must fall inside the current seven-day execution window.

### 5.5 Routine Fields

```txt
RoutineFields
- recurrence
- preferredStartDate?
- preferredTime?
- durationMinutes?
```

Initially supported recurrence patterns:

```txt
DAILY
WEEKDAYS
SPECIFIC_WEEKDAYS
WEEKLY
N_TIMES_PER_WEEK
MONTHLY_ON_DAY
```

Routine recurrence may describe behavior beyond one week, but the first-week view may project only occurrences inside the current seven-day window.

Unsupported recurrence must not be silently converted.

### 5.6 Continuation Policy

```txt
ContinuationPolicy
- firstTransitionRequiresExplicitReview: true
- laterContinuationMode: SIGNAL_BASED
- allowedChoices:
  - CONTINUE_AS_IS
  - ADJUST
  - PAUSE_OR_STOP
  - REVIEW_WITH_AI
```

This policy applies to detailed execution windows, not to the continued existence of canonical entities.

---

## 6. Assumptions, Warnings, and Unresolved Questions

Material inferred ownership, date, recurrence, entity classification, or structural choice must be visible.

Warnings use:

```txt
INFO
IMPORTANT
BLOCKING
```

A blocking warning prevents approval until the affected structure is corrected or excluded.

Examples include:

- invalid parent reference
- unsupported recurrence
- impossible date
- multiple proposed Goals
- Task or Routine assigned to Goal and Project simultaneously
- detailed date outside the seven-day horizon
- Goal outcome too ambiguous to support its dependent hierarchy

Unresolved questions support partial drafts and `Draft now`, but must not restart an unlimited interview.

Pre-draft clarification and form validation should prevent ordinary invalid values where possible. A blocked Goal is an exceptional review state, not a normal planning path.

Safety-crisis input produces no `PlanningDraft` and routes to `SAFETY_FALLBACK` from Discussion 013.

---

## 7. First-Week Plan and Source of Truth

```txt
FirstWeekPlan
- startDate
- endDate
- entries[]
```

```txt
FirstWeekEntry
- draftId
- date
- note?
```

The detailed horizon obeys:

```txt
endDate - startDate <= 6 days
```

The initial approval draft must not contain detailed placements for week two or later.

`firstWeekPlan` is a derived review projection, not an independent source of planning truth.

For Tasks:

```txt
TaskFields.plannedDate = source of truth
FirstWeekEntry.date = derived projection
```

Editing a Task through the weekly view updates `TaskFields.plannedDate`.

For Routines:

```txt
Routine recurrence = source of truth
FirstWeekEntry dates = derived projection of recurrence
```

Any edit must explicitly distinguish between changing only the current weekly occurrence and changing the underlying Routine recurrence. Exact occurrence behavior belongs to Discussion 015.

Children participating in a seven-day plan must remain inside the applicable execution window. Longer-term child work remains undated or represented at Project level until a later window is prepared.

---

## 8. Numeric Limits

Limits per `PlanningDraft`:

```txt
Goals: maximum 1
Projects: maximum 5
Tasks: maximum 15
Routines: maximum 5
Total proposals: maximum 20
First-week entries: maximum 21
Assumptions: maximum 10
Warnings: maximum 10
Unresolved questions: maximum 5
Detailed planning horizon: maximum 7 calendar days
```

These limits apply to one AI draft, not to all canonical user data.

The AI must not silently truncate oversized input. It should prioritize one coherent immediate subset and state what was omitted.

---

## 9. Validation and Repair

A `PlanningDraft` is valid only when:

- each proposal has a unique `draftId`
- only supported entity types appear
- at most one Goal is proposed
- titles and required fields are present
- parent references and mappings are valid
- exclusive ownership is preserved
- Routine recurrence is supported or blocked
- dates are parseable and remain inside the seven-day horizon
- first-week entries reference valid Task or Routine proposals
- first-week projection agrees with Task dates and Routine recurrence
- counts stay within limits
- assumptions, warnings, and unresolved questions reference valid items

Repair sequence:

```txt
1. deterministic validation
2. one bounded structural repair attempt
3. revalidation
4. GENERATION_FAILED if still invalid
```

Repair may fix formatting and obvious structural defects. It must not silently change user intent, entity classification, ownership, dates, recurrence, parent-removal outcome, or the seven-day horizon.

---

## 10. Draft Review UX Semantics

### 10.1 Visible Hierarchy

The user must be able to understand the proposed hierarchy:

```txt
Goal
├── Project
│   ├── Task
│   └── Routine
├── direct Task
└── direct Routine
```

The exact visual component is deferred, but the structure must not be flattened into an ambiguous list.

Each item must show its entity type, parent or standalone status, review state, attached assumptions or warnings, and first-week placement when relevant.

### 10.2 Edit Before Approval

The user may edit consequential fields before creation, including title, description, valid entity classification, ownership, Task date, Routine recurrence and timing, first-week placement, and inclusion or exclusion.

AI-assisted revision remains an unapproved draft until final confirmation.

### 10.3 Canonical Review States

```txt
INCLUDED
EXCLUDED
BLOCKED
BLOCKED_BY_ANCESTOR
```

- `INCLUDED`: valid and selected for creation
- `EXCLUDED`: will not be created
- `BLOCKED`: cannot be approved until its own blocking issue is corrected
- `BLOCKED_BY_ANCESTOR`: cannot be approved because a selected parent or ancestor is blocked

### 10.4 Approval Unit

Items are reviewed individually, but all currently included and valid items are created through one final explicit confirmation.

Partial approval is allowed only when the remaining hierarchy is valid.

### 10.5 Parent Exclusion and Child Obedience

A child follows its selected parent by default.

If a Goal or Project is excluded, all dependent descendants are excluded by default.

The product must show this consequence before applying it. It must not silently preserve, reparent, or convert children.

A child may survive only when the user explicitly edits the hierarchy before approval by detaching it into a valid standalone state, where allowed, or assigning it to another valid parent.

After detachment or reparenting, all affected items are revalidated.

Excluding a child does not exclude its parent.

### 10.6 Blocked Ancestor Cascade

If a proposed parent or ancestor is `BLOCKED`, every dependent descendant becomes `BLOCKED_BY_ANCESTOR` and cannot be approved.

The product must show:

- the root blocking reason
- affected descendants
- a clear instruction to clarify or correct the root proposal

The user should not be forced to repair each descendant separately when dependency on the blocked ancestor is their only problem.

After the root proposal is corrected, the system revalidates the affected subtree.

- descendants blocked only by ancestry become eligible again automatically
- descendants with independent validation problems remain blocked

This cascade is temporary. It does not detach children or convert them to standalone items.

### 10.7 Item-Local Feedback

Warnings, assumptions, blocking reasons, and unresolved questions appear beside the affected item. A global summary may supplement but not replace item-level context.

---

## 11. Zero and Partial Output

Zero Tasks or zero Routines are valid when the intention does not justify them.

Zero proposals are valid only when no coherent supported proposal can be produced, and the result must explain why.

A partial draft may contain valid proposals while unresolved portions remain omitted or blocked.

The AI must not create filler work merely to occupy all seven days.

---

## 12. Review Resolution

Claude's first review produced:

```txt
F1 — Important: weekly continuation ambiguity
F2 — Important: blocked-parent cascade missing
F3 — Minor: duplicate Task date sources
```

Integrated resolutions:

- F1 accepted with Mahdi's adaptive calibration model: mandatory first transition, then signal-based continuation
- F2 accepted with full dependent-subtree blocking and root-level clarification
- F3 accepted: Task date and Routine recurrence are authoritative; first-week entries are derived

Claude's final review found no blocking or important issues. It reported one minor documentation omission: `BLOCKED_BY_ANCESTOR` was used by the cascade rule and scenarios but missing from the canonical review-state enum.

Final correction:

- `BLOCKED_BY_ANCESTOR` was added to the enum and defined explicitly

Mahdi accepted the resulting contract and closed Discussion 014.

---

## 13. Mind Map Impact — Handoff to Discussion 022

After consolidation, record or revise:

### AI Responsibilities

- propose at most one Goal per draft
- preserve long-term direction while planning only seven detailed days
- treat week one as calibration
- use signal-based continuation after the first explicit weekly confirmation
- expose assumptions, warnings, and blocking reasons
- maintain derived first-week projections from authoritative Task and Routine fields
- block dependent subtrees when an ancestor is blocked

### User Flow

```txt
Draft generated
→ hierarchy review
→ edit / include / exclude
→ resolve blocked roots and parent-child consequences
→ review seven-day execution window
→ one final confirmation
→ explicit week-two decision
→ later signal-based continuation and Reconcile when needed
```

### AI Guardrails

- no multiple-Goal draft
- no detailed schedule beyond seven days
- no automatic weekly reconfirmation of canonical Routine existence
- no silent child preservation, deletion, detachment, or reparenting
- no approval through a blocked ancestor
- no independent duplicate date in the weekly projection
- no PlanningDraft for safety fallback

No Mind Map change is applied yet.

---

## 14. Affected Formal Documents — Handoff to Discussion 022

After consolidation, accepted decisions should update or create:

- PlanningDraft product contract
- AI planning responsibility specification
- draft review and approval UX specification
- hierarchy and dependency UX specification
- weekly planning and continuation specification
- Today intake specification with Discussion 015
- Reconcile and adaptation specification with Discussions 016–017
- AI guardrail specification
- data and transaction specification in Discussion 019
- runtime structured-output specification in Discussion 020
- validation plan in Discussion 021
- implementation plan in Discussion 022

Potential ADRs:

- ephemeral PlanningDraft plus selective approval
- one-Goal-per-draft boundary
- seven-day detailed planning and adaptive continuation

No formal document is updated before consolidation.

---

# خلاصهٔ فارسی

بحث ۰۱۴ قرارداد محصولی `PlanningDraft` را تعریف می‌کند. draft موقت است و می‌تواند برای یک نیت منسجم، Goal، Project، Task و Routine پیشنهاد دهد؛ اما تا پیش از تأیید کاربر هیچ‌کدام به canonical state تبدیل نمی‌شوند. ساخت hierarchy مصنوعی صرفاً برای مرتب دیده‌شدن مجاز نیست.

هر draft حداکثر یک Goal دارد و برنامه‌ریزی اجرایی دقیق آن به هفت روز محلی محدود است، هرچند Goal، Project و Routine می‌توانند عمر طولانی‌تری داشته باشند. محدودیت‌های MVP شامل حداکثر ۵ Project، ۱۵ Task، ۵ Routine و ۲۰ proposal در یک draft است.

کاربر باید hierarchy، assumptionها، warningها و placement هفتهٔ اول را ببیند و بتواند آیتم‌ها را ویرایش، حذف، رد یا انتخاب کند. validation و repair فقط می‌توانند خطاهای ساختاری و قابل‌اثبات را اصلاح کنند و اجازهٔ تغییر پنهانی intent، entity type، ownership، date یا recurrence را ندارند. قواعد temporal این قرارداد در ۰۱۴A تکمیل شده‌اند.
