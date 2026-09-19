# Discussion 016A — Review Checkpoint Trigger and Presentation Amendment

## Status

Accepted and closed as a required amendment following Discussion 012A and Discussion 015A.

This amendment extends [[01-Closed-Discussions/016-reconcile-trigger-and-severity]] without reopening its accepted execution-backlog severity bands, once-per-local-day primary prompt policy, Today access, absence guardrails, or action-specific blocking model.

Discussion 017 owns the final action and recommendation semantics for this lane. Discussion 021 owns immutable pre-session severity reporting, and Discussion 022 owns Mind Map and formal-document application.

Related accepted decisions:

- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]

---

## 1. New Reconcile-Eligible Fact Type

A reached review checkpoint may make Reconcile eligible:

```txt
REVIEW_DUE
entity remains ACTIVE
AND reviewDate <= currentLocalDate
AND checkpoint has not already been resolved or deferred
```

Eligible entities:

- Goal
- Project
- Task

Routine temporal visibility continues through recurrence and RoutineOccurrence. Routine mismatch remains governed by bounded evidence rules rather than generic review-date eligibility.

---

## 2. Eligibility Is Still Separate from Execution Severity

A review-due fact is actionable because the user may need to reaffirm, schedule, defer, stop, drop, or otherwise resolve the checkpoint.

It is not execution backlog.

Accepted separation:

```txt
reviewDueCount
≠ unresolvedExecutionTaskCount
```

Review-due items must not be inserted into the count or age thresholds that produce `LIGHT`, `MEDIUM`, or `RECOVERY` for unresolved execution.

Examples:

```txt
10 REVIEW_DUE entities
0 execution-overdue Tasks
→ Reconcile eligible
→ not automatic MEDIUM or RECOVERY
```

```txt
1 REVIEW_DUE Goal
8 actionable execution-overdue Tasks
→ execution severity may be RECOVERY
→ Goal checkpoint remains a separate review lane
```

---

## 3. Review Presentation Lane

Review checkpoints must appear in a distinct presentation group from execution backlog.

Conceptual grouping:

```txt
Reconcile
├── Execution decisions
│   ├── overdue Tasks
│   ├── repeated Carry
│   └── bounded Routine evidence
└── Commitment reviews
    ├── Goal continuation
    ├── Project checkpoint
    └── Backlog Task checkpoint
```

The exact visual design remains deferred, but the user must not mistake review checkpoints for missed work.

---

## 4. Grouping and Chunking

System defaults may cause multiple checkpoints created on similar dates to become due together.

Accepted guardrail:

```txt
multiple REVIEW_DUE items
→ group by entity type and stable ownership
→ present in limited chunks
→ do not create one interruptive prompt per entity
```

Recommended product behavior:

- prioritize checkpoints with an earlier target date or deadline.
- preserve stable Project/Goal ownership grouping.
- show a summary count before expanding large groups.
- process a limited chunk and allow the user to continue Today.
- remaining review items stay discoverable without repeated interruption.

Exact chunk size belongs to UX and validation, not the core severity contract.

---

## 5. Primary Prompt and Same-Day Suppression

The existing once-per-local-day primary Reconcile prompt remains authoritative.

Review checkpoints do not create a second general primary prompt merely because another checkpoint becomes due later that day.

Allowed behavior:

- badge/count update
- non-interruptive commitment-review indicator
- manual opening
- action-specific lifecycle conflict flow

Goal Continuation Check has an additional per-Goal cadence defined in Discussion 017 final resolution.

---

## 6. Absence and Review Checkpoints

Absence alone still does not make Reconcile eligible.

Absence may not directly generate an intent conclusion.

Accepted model:

```txt
absence or stale descendant execution
→ may influence deterministic scheduling of a future review checkpoint under product policy

review checkpoint reached
→ explicit bounded user decision
```

Normal Reconcile evaluation must not repeatedly recalculate a free-form heuristic and ask whether the Goal still matters on every return.

---

## 7. Reason Codes and Deduplication

An entity may carry several deterministic reason codes:

```txt
EXECUTION_OVERDUE
REVIEW_DUE
REPEATED_CARRY
DEADLINE_RISK
STRUCTURAL_CONFLICT
```

The entity should appear once per coherent resolution group, with all relevant reason codes preserved.

Rules:

- deadline protection may restrict available actions.
- execution severity uses only accepted execution inputs.
- review lane ordering may use target/deadline proximity.
- structural conflict remains a separate scoped blocking flag.

---

## 8. Review-Lane Actions

Discussion 016 only defines appearance and suppression, not full action semantics.

Expected action families passed to Discussion 017:

```txt
Goal review
→ CONTINUE | REVIEW_LATER | ABANDON_GOAL

Project review
→ KEEP_WITH_NEW_REVIEW_DATE | ADJUST_CHILD_EXECUTION | COMPLETE | STOP

Backlog Task review
→ SCHEDULE | KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE | DROP
```

Consequential lifecycle actions remain user-confirmed and preserve Discussion 015 cascade requirements.

---

## 9. Metrics and Guardrails

Add product metrics:

- review checkpoints due per session
- review groups opened
- review items resolved or deferred
- percentage of review-due sessions that continue Today
- same-day repeated review-prompt rate, expected near zero
- checkpoint burst size by system-default cohort

Guardrail metrics:

- review-due items incorrectly counted as execution backlog, expected zero
- review-only sessions classified as Recovery, expected zero
- one-prompt-per-entity behavior, expected zero
- Goal continuation prompt repeated inside its suppression window, expected zero

---

## 10. Final Amendment Decisions

- review due is Reconcile-eligible but not execution severity.
- commitment reviews use a distinct lane.
- checkpoint bursts are grouped and chunked.
- exact chunk size is deferred to UX/validation.
- Today remains accessible.
- once-per-local-day primary prompt remains in force.
- absence does not directly infer intent.
- reason codes are preserved without duplicate entity presentation.
- Goal continuation also obeys a separate per-Goal cadence.

---

# خلاصهٔ فارسی

۰۱۶A amendment مربوط به review checkpointهاست. رسیدن `reviewDate` می‌تواند Reconcile را eligible کند، اما `REVIEW_DUE` execution backlog یا نشانهٔ شکست اجرا نیست و نباید در محاسبهٔ Light، Medium یا Recovery وارد شود.

review checkpointها در lane جداگانهٔ `Commitment reviews` نمایش داده می‌شوند. اگر تعداد زیادی checkpoint هم‌زمان برسند، باید بر اساس entity type و ownership گروه‌بندی و در chunkهای محدود ارائه شوند؛ نمایش یک prompt جدا برای هر entity ممنوع است. یک entity با چند reason code نیز باید فقط یک بار در گروه مناسب دیده شود.

سیاست یک prompt اصلی در هر local day و دسترسی دائمی به Today همچنان برقرار است. Goal continuation علاوه بر suppression روزانه، cadence اختصاصی خود را رعایت می‌کند. actionهای نهایی Task، Project و Goal در ۰۱۷B تعریف شده‌اند.
