# Discussion 025 — Task Dependency Sequences and Hierarchical Reconcile Grouping

## Status

**CLOSED — accepted after two Claude review rounds.**

```txt
STATUS = CLOSED
CLAUDE_REVIEW_ROUND_1 = COMPLETED
ROUND_1_FINDINGS = INTEGRATED
CLAUDE_REVIEW_ROUND_2 = COMPLETED
ROUND_2_FINDINGS = INTEGRATED
BLOCKING_FINDINGS = 0
IMPORTANT_FINDINGS = 0
MIND_MAP = NOT_APPLIED
FORMAL_DOC_RECONCILIATION = PENDING
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is now authoritative product direction, but Mind Map/spec/implementation reconciliation remains a separate step.

Primary related discussions:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
- [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
- [[01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context]]
- [[01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics]]

---

## 1. Problem

Some Tasks are independent, while others are strict prerequisites in a linear execution path.

Example:

```txt
Research
→ Wireframe
→ Visual design
→ Frontend
→ QA
```

This is not priority. Priority answers which Task matters more. Dependency answers which Task must be resolved before later work becomes actionable.

A second problem appears in Reconcile. If a sequence originally covered Day 1–10, the user completed Task 1–3, and it is now Day 13, showing Task 4–10 as seven separate overdue decisions is noisy and structurally wrong.

The product needs one coherent unit that can be carried or dropped together when that shared decision is valid.

Core rule:

> Reconcile should surface the highest coherent decision unit that can resolve the underlying issue without forcing redundant child decisions.

---

## 2. MVP Dependency Model

Task remains one canonical entity type.

Conceptually:

```txt
Task
- sequenceId?
- sequenceOrder?
```

Rules:

```txt
both absent
→ independent Task

both present
→ member of one linear dependency sequence
```

Additional invariants:

- one Task belongs to at most one sequence in MVP,
- `sequenceOrder` is unique within a sequence,
- order values do not need to be contiguous,
- `sequenceId` is a durable domain identifier, not a UI correlation token,
- dependency is never inferred from title, plannedDate ordering, UI position, or AI memory.

No separate `TaskSequence` row is required for MVP.

---

## 3. Sequence Scope

All members of one sequence must belong to exactly one coherent ownership scope:

```txt
A. same Project
OR
B. same direct Goal
OR
C. all standalone
```

A sequence may not mix Project-owned, Goal-owned, and standalone Tasks.

Cross-parent dependency graphs remain out of MVP scope.

---

## 4. HARD Linear Dependency Semantics

MVP uses a hard linear dependency.

```txt
Task N+1 is BLOCKED while a required earlier Task remains unresolved.
```

Dependency satisfaction:

```txt
COMPLETED predecessor
→ dependency satisfied

ACTIVE predecessor
→ unresolved
→ downstream BLOCKED

ACTIVE predecessor in BACKLOG
→ unresolved
→ downstream BLOCKED

DROPPED predecessor
→ does NOT silently satisfy dependency
→ downstream remains BLOCKED until explicit structural resolution
```

After a middle prerequisite is dropped, allowed explicit resolution families are:

```txt
RESTORE_PREDECESSOR
DETACH_OR_REBASE_REMAINING_SEQUENCE
DROP_REMAINING_SEQUENCE
```

Exact UI copy may vary, but the system must not guess that downstream work is still valid.

Rebasing/detaching the remaining segment may preserve the same durable `sequenceId` where the remaining sequence is still the same execution path; a new root concept is not required for MVP.

---

## 5. Planned Date vs Execution Eligibility

`plannedDate` and dependency state mean different things.

```txt
plannedDate
= intended execution date

BLOCKED
= execution eligibility gate
```

Therefore this state is valid:

```txt
plannedDate = today
BLOCKED = true
```

The date still preserves temporal intent even while dependency prevents ordinary execution.

---

## 6. Today Behavior

A blocked Task with `plannedDate = today` must not appear as a normal actionable checklist item.

It should remain visible in Today as subdued/non-actionable blocked context so dependency does not create temporal invisibility.

Example presentation concept:

```txt
Task B
Blocked by Task A
```

If the predecessor becomes COMPLETED during the same local day, a downstream Task whose `plannedDate = today` becomes actionable immediately without another confirmation.

Today does not silently move dates. Accumulated schedule drift belongs to Reconcile.

---

## 7. Reconcile Hierarchy

Reconcile uses hierarchical suppression:

```txt
Project-level coherent issue
→ Project decision unit

else shared sequence-level issue
→ Sequence decision unit

else
→ individual Task decision unit
```

A higher-level card suppresses lower cards only when the higher-level action genuinely governs/resolves the same child decision surface.

Independent child conflicts that survive the higher-level action remain visible.

A deadline risk on one sequence Task may still require disclosure even when a Project-level card suppresses the Sequence card.

When Project review chooses `ADJUST_CHILD_EXECUTION`, sequence-aware child replanning should be used where relevant rather than flattening everything into unrelated Task decisions.

---

## 8. Sequence-Level Reconcile Eligibility

A sequence-level prompt is appropriate when:

```txt
same sequenceId
+
multiple relevant remaining Tasks
+
one coherent shared replan/drop decision
+
no dominant Project-level decision suppresses it
```

Mere sequence membership does not automatically create grouping.

One affected Task generally falls back to Task-level Reconcile.

---

## 9. BLOCKED + Overdue Severity Deduplication

A blocked descendant may still be historically overdue, but it is not independently actionable.

Example:

```txt
Task 4 overdue + actionable
Task 5 overdue + BLOCKED
Task 6 overdue + BLOCKED
Task 7 overdue + BLOCKED
```

This is not four independent actionable backlog items.

Accepted rule:

```txt
BLOCKED descendant
→ excluded from independent actionableBacklogCount
→ excluded from unresolved actionable-task count
→ excluded from oldest actionable unresolved age
```

The same actionable set must drive both count-based and age-based severity inputs.

Historical overdue evidence may still be preserved for sequence reasoning, but it must not inflate severity independently.

Reconcile may count/surface:

```txt
- the actually actionable predecessor
and/or
- one coherent sequence-level drift signal
```

This is a narrow amendment to Discussion 016 severity derivation.

---

## 10. Sequence-Level Actions

MVP sequence actions:

```txt
CARRY_ALL
DROP_ALL
REVIEW_INDIVIDUALLY
REVIEW_WITH_AI
```

All grouped actions require:

```txt
candidate set
→ deterministic validation
→ preview
→ explicit confirmation
→ atomic bounded application
```

No hidden partial success.

---

## 11. CARRY_ALL

`CARRY_ALL` re-anchors the remaining eligible ACTIVE sequence schedule while preserving:

```txt
Task identities
sequenceId
sequenceOrder
relative planned-date offsets
```

Example:

```txt
Task 4 → Day 4
Task 5 → Day 5
Task 6 → Day 6
...
Task 10 → Day 10
```

User chooses:

```txt
newStartDate = Day 14
```

Result:

```txt
Task 4 → Day 14
Task 5 → Day 15
Task 6 → Day 16
...
Task 10 → Day 20
```

If multiple Tasks originally share a date, that relative spacing remains.

Do not normalize to one Task per day.

The selected anchor is the first remaining eligible scheduled Task's new plannedDate.

---

## 12. Backlog Members During CARRY_ALL

Backlog is placement, not lifecycle.

A sequence member currently in Backlog remains unresolved and BLOCKED semantics still apply downstream.

A Backlog member is not silently scheduled by `CARRY_ALL`.

During preview it is classified explicitly, for example:

```txt
IN_BACKLOG_UNSCHEDULED
```

The user must explicitly include/schedule it if the grouped action is to move it into scheduled execution.

Moving a predecessor to Backlog does not immediately force a new Reconcile prompt. It waits for ordinary Reconcile eligibility/drift rules rather than questioning an explicit user decision instantly.

---

## 13. Protected Manual Scheduling

A newer explicit user scheduling decision must not be silently overwritten by `CARRY_ALL`.

Use existing mutation/event provenance, especially actor distinction such as:

```txt
USER
SYSTEM_DETERMINISTIC
```

to determine whether a Task has a newer protected manual schedule.

Preview may classify Tasks as:

```txt
WILL_SHIFT_NORMALLY
HAS_PROTECTED_MANUAL_SCHEDULE
IN_BACKLOG_UNSCHEDULED
HAS_TEMPORAL_CONFLICT
```

For a protected Task, the user must explicitly choose:

```txt
include in new group shift
OR
keep manual date
```

If the protected Task keeps its date, all other non-protected Tasks use one global shift based on their original relative offsets. The system does not invent segmented smart scheduling.

If this produces unusual chronological spacing around the protected Task, preview must show it clearly.

A reduced explicit affected set does not weaken hard sequence semantics because blocking derives from `sequenceOrder + lifecycle state`, not from membership in the current batch operation.

---

## 14. Deadline and Temporal Guardrails

`CARRY_ALL` must not silently move Tasks beyond:

- Task deadlines,
- accepted hard temporal constraints,
- applicable PlanningFact HARD constraints.

Conflicts are shown before commit.

Possible user resolutions include:

```txt
adjust dates
review individually
review with AI
cancel
```

The final confirmed affected set must be explicit.

---

## 15. DROP_ALL

`DROP_ALL` applies to the remaining eligible ACTIVE sequence segment.

Example:

```txt
Task 1–3 COMPLETED
Task 4–10 ACTIVE
```

After confirmation:

```txt
Task 4–10 → DROPPED
```

Completed history remains unchanged.

This is a grouped set of Task lifecycle transitions, not a sequence lifecycle transition.

---

## 16. Reorder and Restore

Accepted reorder rule:

```txt
COMPLETED historical prefix
→ immutable order

remaining unresolved segment
→ may be reordered with explicit consequence preview
```

`sequenceOrder` values may contain gaps. Contiguous renumbering is not required.

If restoring a previously dropped Task creates a direct `sequenceOrder` collision with a reordered remaining member, the system must ask for an explicit placement rather than invent one automatically.

Restore-in-place preserves Task identity.

---

## 17. Manual Single-Task Carry

Manual Carry of one predecessor does not cascade dates automatically.

```txt
user carries one Task
→ downstream dates unchanged
→ downstream may become blocked/drifted
→ Reconcile may later offer sequence-level replan
```

This preserves direct user authority and avoids hidden schedule mutations.

---

## 18. AI Planning Boundary

AI may propose HARD sequence semantics only when the user's intent explicitly expresses prerequisite dependency, for example:

```txt
"after X"
"when X is finished"
"before Y can start"
```

Mere list order is insufficient.

PlanningDraft must expose:

```txt
sequence membership
sequence order
hard dependency meaning
```

The user reviews/edits/rejects before approval.

Sequence state has canonical structural home and is not a PlanningFact.

Week-N Planning must respect accepted sequence state and may not silently reorder it.

For MVP, grouped `CARRY_ALL` / sequence re-anchor remains a Reconcile action rather than a normal Week-N AI Planning operation.

AI may assist inside the explicit Reconcile review path, but mutation authority remains unchanged.

---

## 19. Events and Audit

`sequenceId + sequenceOrder` on Task is sufficient for MVP persistence.

A grouped action follows existing multi-entity decision/event correlation patterns:

```txt
one confirmed grouped decision
→ one shared correlationId / command context
→ one field/lifecycle event per affected Task
```

Events must preserve meaningful `changedFields` rather than only an ambiguous generic `TASK_UPDATED` label.

No new sequence-specific event family is required merely for ordinary reorder/restore if ordinary Task field-change events preserve:

- sequenceId changes,
- sequenceOrder changes,
- plannedDate changes,
- actor/provenance,
- correlationId.

---

## 20. Source-of-Truth Discipline

Do not infer dependency from:

- Task title,
- date order,
- UI list order,
- AI narrative,
- model/session memory.

Canonical structural fields are authoritative:

```txt
sequenceId
sequenceOrder
```

---

## 21. Explicit Amendments / Affected Accepted Rules

If this discussion is reconciled into formal specs, the affected accepted rule families include:

### Discussion 016

Severity inputs must use the same actionable Task set for both count and age metrics.

BLOCKED descendants do not independently contribute to:

```txt
actionableBacklogCount
unresolvedTaskCount
oldestUnresolvedAgeDays
```

unless they become independently actionable.

### Discussions 017 / 018

Reconcile grouping/suppression and confirmation must understand Sequence as a derived decision unit between Project and Task.

### Discussion 019A

Task structural persistence gains optional:

```txt
sequenceId
sequenceOrder
```

with coherent-scope and unique-order invariants.

### Discussion 019C

Existing actor/provenance and correlation patterns are reused for protected manual scheduling and grouped Task mutations.

### Discussion 023

Sequence state has canonical home and therefore must not be duplicated into PlanningFact.

---

## 22. Final Accepted Direction Summary

```txt
Task remains one canonical entity type.

Independent Task:
sequenceId = null
sequenceOrder = null

Sequence Task:
sequenceId = stable durable ID
sequenceOrder = explicit position
```

Scope:

```txt
same Project
OR same direct Goal
OR all standalone
```

Dependency:

```txt
linear HARD sequence
COMPLETED predecessor → satisfied
ACTIVE/BACKLOG predecessor → unresolved
DROPPED predecessor → explicit structural resolution required
```

Today:

```txt
plannedDate may be today
BLOCKED means non-actionable but still visible as blocked context
predecessor completion can unlock same-day Task immediately
```

Reconcile:

```txt
Project coherent issue
→ Project prompt

else shared sequence issue
→ Sequence prompt

else
→ Task prompt
```

Severity:

```txt
BLOCKED descendants
→ excluded from independent actionable count
→ excluded from oldest actionable age
```

Grouped actions:

```txt
CARRY_ALL
DROP_ALL
REVIEW_INDIVIDUALLY
REVIEW_WITH_AI
```

Core principle:

> Preserve structural dependency, surface the highest coherent decision unit, preserve explicit user authority, and never silently cascade or overwrite Task scheduling merely because Tasks belong to a sequence.

---

## 23. Mind Map Impact — NOT YET APPLIED

Likely affected areas:

- Task model and invariants,
- Today blocked Task behavior,
- Reconcile Project → Sequence → Task hierarchy,
- severity derivation,
- grouped Carry/Drop,
- Backlog interaction,
- AI Planning output contract,
- event correlation,
- API/frontend contracts.

```txt
MIND_MAP = NOT_APPLIED
FORMAL_DOC_RECONCILIATION = PENDING
```

Do not treat this closed discussion alone as authorization to mutate prototype/runtime contracts before the reconciliation pass.
