# Discussion 017A — Temporal Checkpoint Mind Map Impact Consolidation

## Status

Accepted and closed as the authoritative Mind Map impact record for the temporal-checkpoint amendment chain.

This document consolidates the Mind Map changes required by:

- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]

It records changes for Discussion 022 FigJam consolidation. It does not modify the Mind Map by itself.

---

## 1. Product Vision

Add:

- active commitments must not become temporally invisible
- Backlog is deliberate deferral with a future review checkpoint, not permanent disappearance
- review checkpoints are management events, not evidence of failure
- AI analyzes operational facts and does not infer motivation, emotion, capacity, lifestyle fit, or Goal meaning
- system-generated temporal defaults preserve low-friction planning
- user-owned lifecycle intent remains explicit

---

## 2. MVP Core Loop

Replace or extend the current loop with:

```txt
Create or approve Goal / Project / Task / Routine
→ use explicit temporal value when provided
→ otherwise apply visible deterministic review default
→ derive nextTemporalCheckpoint
→ execute through Today when execution is scheduled
→ surface REVIEW_DUE separately from EXECUTION_OVERDUE
→ group by ownership and review lane
→ match bounded rules
→ show exact evidence and predefined actions
→ user confirms, defers, edits, or rejects
→ persist structured history for later adaptation
```

Add the invariant:

```txt
Every ACTIVE entity has a derivable future temporal checkpoint.
```

Routine satisfies this through valid recurrence and a derivable next occurrence.

---

## 3. User Flow

### Planning Draft Review

Add:

```txt
Goal
- targetDate optional
- reviewDate visible
- system default marked when applicable

Project
- targetDate or reviewDate
- system default marked when applicable

Task
- plannedDate or reviewDate
- placement: SCHEDULED or BACKLOG
- deadline may cap reviewDate

Routine
- recurrence provides next checkpoint
```

System defaults must be editable but must not introduce another mandatory clarification question.

### Today

Keep:

```txt
Today contains only:
- ACTIVE Tasks with plannedDate = current local date
- RoutineOccurrences scheduled for current local date
```

Do not add review-only items to Today.

### Reconcile

Add two clearly distinct lanes:

```txt
Reconcile
├── Execution decisions
│   ├── overdue Tasks
│   ├── repeated Carry
│   ├── deadline risk
│   └── bounded Routine mismatch
└── Commitment reviews
    ├── Goal continuation
    ├── Project checkpoint
    └── Backlog Task checkpoint
```

Add grouped and chunked presentation when many review checkpoints become due together.

### Goal Continuation

Add:

```txt
Do you still want to continue this Goal?

CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

Use fixed neutral wording and a maximum automatic cadence of once per 30 local days per Goal.

### Bulk Consequences

Add a preview warning when bulk Backlog or Drop leaves a Project or Goal with no active executable work.

The parent remains ACTIVE until a separate user-owned lifecycle action occurs.

---

## 4. AI Responsibilities

Add:

- explain deterministic rule matches in plain language
- present only actions attached to accepted rule IDs
- summarize observed metrics and reason codes
- consolidate duplicate recommendations for the same entity
- create structured Reconcile summaries for later planning evidence
- explain visible system defaults without claiming they came from the user

Remove or explicitly forbid:

- asking why work was not done
- asking about motivation, emotion, discipline, capacity, energy, lifestyle, or when the user expects to feel better
- using free-text user explanations in rule matching, metric creation, or AI rationale
- inventing checkpoint dates through psychological or semantic inference
- vague Project or Goal review advice
- interpreting absence as abandonment or failure

---

## 5. AI Guardrails

Add:

- no recommendation without a matched accepted rule
- no invented metric, problem type, or action type
- no causal or emotional Reconcile questions
- no free-text input in rule matching
- no conflation of REVIEW_DUE and EXECUTION_OVERDUE
- no destructive recommendation involving protected items
- no automatic Goal achievement or abandonment inference
- no automatic Project completion or stopping inference
- no lifecycle mutation from review-date evaluation alone
- no hidden editable `nextTemporalCheckpoint` field
- no mandatory clarification solely to obtain a review date
- no review-only cohort inflating MEDIUM or RECOVERY execution severity

---

## 6. Data Events

Add candidates for Discussion 019:

```txt
TEMPORAL_CHECKPOINT_DEFAULTED
TEMPORAL_CHECKPOINT_CHANGED
TEMPORAL_CHECKPOINT_REACHED
REVIEW_DATE_DEFAULTED
REVIEW_DATE_CHANGED
REVIEW_DEFERRED
PLACEMENT_CHANGED_TO_BACKLOG
PLACEMENT_CHANGED_TO_SCHEDULED
ENTITY_INTENT_REAFFIRMED
GOAL_CONTINUATION_PRESENTED
GOAL_CONTINUATION_RESOLVED
RECONCILE_RULE_EVALUATED
RECONCILE_RULE_MATCHED
RECONCILE_RECOMMENDATION_PRESENTED
RECONCILE_RECOMMENDATION_ACCEPTED
RECONCILE_RECOMMENDATION_REJECTED
RECONCILE_BULK_PREVIEWED
RECONCILE_BULK_CONFIRMED
RECONCILE_PROTECTED_ITEM_EXCLUDED
RECONCILE_ADAPTIVE_HANDOFF_CREATED
```

Each relevant event should later preserve:

- entity ID and type
- ownership context
- rule ID and version when applicable
- reason codes
- authoritative date fields
- default provenance: USER or SYSTEM_DEFAULT
- previous and new placement
- allowed and selected actions
- evidence quality
- local-date and timezone boundary

---

## 7. Traction Metrics

Add product metrics:

- percentage of active entities with a valid derivable checkpoint
- percentage of checkpoint defaults edited before approval
- review checkpoints due per session
- review groups opened
- review items resolved, deferred, scheduled, kept, dropped, completed, or stopped
- percentage of review-only sessions that continue to Today
- Goal continuation choices by action
- Backlog Tasks scheduled after review
- repeated review deferral rate
- checkpoint burst size by default cohort
- recommendation acceptance and rejection by rule ID
- return-to-execution after Reconcile

Add guardrail metrics:

- active entity with no checkpoint, expected zero
- review date later than an earlier target date or deadline, expected zero
- mandatory clarification generated only for reviewDate, expected zero
- review-due item inserted into execution backlog count, expected zero
- review-only session classified as RECOVERY, expected zero
- one interruptive prompt per review entity, expected zero
- Goal continuation repeated inside 30-day suppression, expected zero
- free-text content used in rule matching, expected zero
- unsupported recommendation rate, expected zero
- protected destructive suggestion rate, expected zero

---

## 8. Current Decisions

Record:

- Goal, Project, and Task use authoritative temporal fields
- Goal reviewDate is required conceptually and system-defaulted when absent
- Project has targetDate or reviewDate
- Task has plannedDate or reviewDate
- Backlog is an explicit Task placement and retains reviewDate
- Routine recurrence provides its normal checkpoint
- system defaults are visible, editable, and source-labelled
- default review dates are capped by earlier target dates or deadlines
- nextTemporalCheckpoint is derived, not independently editable
- Today remains execution-only
- REVIEW_DUE and EXECUTION_OVERDUE are distinct reason codes
- review checkpoints use a separate Reconcile lane
- checkpoint bursts are grouped and chunked
- review-only facts do not inflate execution severity
- Goal continuation uses neutral fixed wording and explicit choices
- AI consumes operational facts only and does not ask causal or emotional questions
- Reconcile remains separate from Adaptive Planning

---

## 9. Open Questions to Remove or Narrow

Remove resolved questions about:

- whether active entities may remain permanently undated and unreviewed
- whether Backlog replaces review checkpoints
- whether reviewDate should be an AI clarification requirement
- whether nextTemporalCheckpoint should be a separate editable source of truth
- whether REVIEW_DUE is equivalent to overdue execution
- whether absence alone may imply Goal abandonment
- whether Goal continuation may ask causal or emotional questions

Keep for later validation or implementation:

- exact default interval for undated Task review policy
- exact UX chunk size for large review cohorts
- persistence and indexing strategy
- migration policy for existing active entities without checkpoints
- event idempotency and timezone implementation
- user-visible wording for system-default provenance

---

## 10. Affected Formal Documents

Record for consolidation:

- canonical product model specification
- PlanningDraft schema and validation contract
- execution and Today semantics
- Task placement and Backlog specification
- temporal checkpoint and derived-date specification
- Reconcile eligibility and severity specification
- bounded Reconcile rule catalog
- Goal continuation contract
- protected-item and bulk-action policy
- persistence and event model in Discussion 019
- runtime and deterministic default engine in Discussion 020
- validation matrix in Discussion 021
- implementation and migration sequence in Discussion 022

Potential ADRs:

- active temporal visibility invariant
- deterministic system review defaults instead of mandatory clarification
- derived nextTemporalCheckpoint instead of duplicated persisted truth
- separate review-due and execution-overdue semantics
- separate commitment-review Reconcile lane
- bounded operational AI with no causal or emotional questioning

---

## 11. Consolidation Rule

When the FigJam Mind Map is updated, use this document together with the final resolution and Mind Map Impact in Discussion 017.

Where older Discussion 014, 015, 016, or 017 Mind Map notes conflict with these accepted amendments, this consolidation and Discussion 017 are authoritative.

---

# خلاصهٔ فارسی

۰۱۷A سند تصمیم محصولی جدید نیست؛ اثرات پذیرفته‌شدهٔ زنجیرهٔ temporal checkpoint را برای انتقال به Mind Map تجمیع می‌کند. invariant اصلی این است که هر entity فعال باید checkpoint آیندهٔ قابل‌استخراج داشته باشد و Backlog نباید به معنای فراموش‌شدن دائمی کار باشد.

در Planning، defaultهای زمانی باید deterministic، قابل‌مشاهده، قابل‌ویرایش و دارای provenance باشند. Today فقط execution را نمایش می‌دهد و review-only item وارد آن نمی‌شود. در Reconcile نیز execution decisions و commitment reviews دو lane جدا هستند و `REVIEW_DUE` نباید با `EXECUTION_OVERDUE` یا failure اشتباه شود.

AI فقط ruleها و evidence عملیاتی پذیرفته‌شده را توضیح می‌دهد و حق پرسش دربارهٔ انگیزه، احساس، ظرفیت یا علت انجام‌نشدن کار را ندارد. Goal continuation با wording ثابت و گزینه‌های محدود انجام می‌شود. این فایل مرجع migration نقشه است، اما خود Mind Map را تغییر نمی‌دهد؛ اعمال نهایی آن بر عهدهٔ بحث ۰۲۲ است.
