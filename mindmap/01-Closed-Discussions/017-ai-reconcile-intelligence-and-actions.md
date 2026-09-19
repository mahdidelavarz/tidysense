# Discussion 017 — Final Reconcile Intelligence and Actions Resolution

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative final resolution for Reconcile intelligence and actions. It incorporates the accepted Goal-continuation and temporal-checkpoint decisions. Earlier drafts and the intermediate amendment were removed after consolidation; this document is the sole product-semantic authority for Discussion 017.

Accepted dependencies:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]

---

## 1. Final Governing Principle

Reconcile intelligence is bounded and metric-driven.

```txt
deterministic canonical facts
→ stable ownership grouping
→ approved metric calculation
→ versioned bounded rule match
→ predefined action options
→ explicit user decision
```

AI may explain matched facts in plain language. It may not invent a problem, metric, reason, recommendation type, or lifecycle conclusion.

---

## 2. AI Question Boundary

AI must not ask Reconcile questions about:

- why work was not done
- motivation
- emotion or mood
- discipline
- personal capacity
- lifestyle fit
- when the user expects to feel better
- when the user predicts they will have more energy or time
- any free-text explanation intended to feed rule matching

Free-text user content:

```txt
may remain a user-authored note
must not enter rule matching
must not become an inferred metric
must not become AI-derived rationale
```

Reconcile may present deterministic closed decision checkpoints when the answer directly changes an explicit product state. Such checkpoints are product actions, not open-ended AI clarification.

---

## 3. Goal Continuation Check

### Trigger

Goal continuation is presented when an accepted Goal review checkpoint is reached:

```txt
Goal.status = ACTIVE
AND Goal.reviewDate <= currentLocalDate
AND the checkpoint is not resolved or deferred
AND per-Goal suppression window has elapsed
```

Absence or stale descendant execution may contribute to deterministic product policy that schedules a future review checkpoint. They do not directly produce an AI judgment about whether the Goal still matters.

### Fixed Neutral Prompt

```txt
Do you still want to continue this Goal?
```

The prompt must not mention failure, abandonment, inactivity, backlog, discipline, motivation, or inferred decline in interest.

### Allowed Actions

```txt
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

Meanings:

- `CONTINUE`: Goal remains ACTIVE; explicit current intent is reaffirmed; the next review checkpoint is assigned.
- `REVIEW_LATER`: Goal remains ACTIVE; no paused lifecycle is invented; a future review date is assigned.
- `ABANDON_GOAL`: user initiates the accepted Goal terminal flow and child-resolution consequences from Discussion 015.

The product does not recommend abandonment. It merely exposes it as one explicit lifecycle option.

### Cadence

```txt
Goal Continuation Check
→ maximum once per 30 local days per Goal
```

A user-entered manual Goal review may occur sooner. Automatic presentation may not.

The once-per-local-day Reconcile prompt policy from Discussion 016 also remains in force.

---

## 4. Deterministic Grouping

Grouping order:

```txt
1. canonical ownership
2. entity type and review lane
3. matched rule relationship
4. risk/protection constraints
```

Ownership groups:

- Project-owned work under that Project
- direct Goal-owned work under that Goal
- standalone work in standalone context
- RoutineOccurrences under their Routine

The MVP excludes free semantic grouping, inferred shared intent, and duplicate detection based only on language similarity.

The user may remove items from a rule group, inspect individually, reject the recommendation, or apply allowed actions only to selected items.

---

## 5. Protected Items

A Task is protected when an accepted deterministic condition applies, including:

- explicit user protection
- hard deadline
- legal, financial, health, or external obligation flag
- accepted blocking relationship
- active high-priority parent
- recent explicit reaffirmation
- currently in progress

Protected items:

- receive no automatic or bulk Drop suggestion
- are not silently moved to Backlog
- retain visible deadline/risk context
- expose only safe rule-attached actions

Field representation belongs to Discussion 019.

---

## 6. Final MVP Rule Catalog

### R1 — Repeated Carry Task

```txt
Task.status = ACTIVE
carryCount >= 2
```

Allowed actions:

- `REPLAN_TO_EXPLICIT_DATE`
- `MOVE_TO_BACKLOG`
- `SPLIT_TASK`
- `DROP_TASK` only when unprotected and without deadline risk
- `KEEP_UNCHANGED`

One Carry is ordinary. Carry count concerns the same Task identity and execution-date movement only.

### R2 — Old Execution-Unresolved Task

Applies to Tasks with past execution placement, not merely to reached review checkpoints.

```txt
Task.status = ACTIVE
executionAgeDays >= staleExecutionAgeThreshold
```

Current MVP threshold:

```txt
staleExecutionAgeThreshold = 7 local days
```

This threshold is independent from Discussion 016 severity thresholds.

Allowed actions:

- `REPLAN_TO_EXPLICIT_DATE`
- `MOVE_TO_BACKLOG`
- `DROP_TASK` when safe
- `KEEP_UNCHANGED`

### R3 — Deadline Risk

```txt
deadline exists
Task unresolved
remainingExecutionWindow <= accepted deterministic risk threshold
```

Allowed actions:

- `SCHEDULE_NEXT_ACTION`
- `SPLIT_TASK`
- `REVIEW_CONFLICTING_TASKS`
- `KEEP_WITH_ACKNOWLEDGED_RISK`

No automatic Drop or concealing Backlog suggestion is allowed.

### R4 — Routine Mismatch Candidate

```txt
Routine.status = ACTIVE
postCalibrationObservedOccurrenceCount >= 6
missedRatio >= 0.5
evidenceQuality = SUFFICIENT
```

Canonical evidence quality is calculated once and consumed by the rule. Calibration-period occurrences do not count. Raw reconstructed MISSED count does not match this rule.

Allowed actions:

- `CHANGE_ROUTINE_DAYS`
- `REDUCE_ROUTINE_FREQUENCY`
- `REVIEW_ROUTINE_TIME`
- `STOP_ROUTINE`
- `KEEP_ROUTINE_UNCHANGED`

Stopping requires confirmation and later resumption creates a new continuation Routine under Discussion 015.

### R5 — Project Execution Overload Candidate

The rule matches only after at least two observed periods and at least two affected Tasks.

Absolute branch:

```txt
activeTaskCount >= 4
AND repeatedCarryTaskCount >= 2
```

Proportional branch:

```txt
activeTaskCount >= 2
AND repeatedCarryTaskCount >= 2
AND repeatedCarryTaskCount / activeTaskCount >= 0.5
```

Allowed actions:

- `MOVE_SELECTED_TASKS_TO_BACKLOG`
- `SPLIT_SELECTED_TASKS`
- `KEEP_PROJECT_UNCHANGED`

No generic “review this Project” advice is allowed. The exact affected count, ratio, Tasks, and observed periods must be stated.

No Project target-date extension action is included because Project target dates were not canonical when the original rule was proposed. Future target-date actions must use the accepted temporal model and an explicit user action, not be resurrected silently from historical text.

### R6 — Structural Lifecycle Conflict

This is deterministic, not AI-discovered.

It exposes only lifecycle options already accepted in Discussion 015 and blocks only the specific conflicting transition.

AI may explain the exact children and deterministic consequences but cannot choose for the user.

### R7 — Review Checkpoint Resolution

Review checkpoints use the distinct commitment-review lane from Discussion 016A.

Task checkpoint actions:

- `SCHEDULE_TO_EXPLICIT_DATE`
- `KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE`
- `KEEP_CURRENT_PLACEMENT_WITH_NEW_REVIEW_DATE`
- `DROP_TASK` when safe

Project checkpoint actions:

- `KEEP_WITH_NEW_REVIEW_DATE`
- `ADJUST_CHILD_EXECUTION`
- user-initiated `COMPLETE_PROJECT`
- user-initiated `STOP_PROJECT`

Goal checkpoint actions use the Goal Continuation Check in Section 3.

Review-due facts do not inflate execution severity.

---

## 7. Bulk Actions

Bulk suggestions are allowed only when:

- all selected items match the same accepted rule
- all support the same action
- protected items are excluded where required
- every affected item is visible
- consequences are previewed
- the user explicitly confirms

Bulk-safe candidates:

- `MOVE_SELECTED_TASKS_TO_BACKLOG`
- `REPLAN_SELECTED_TASKS_TO_ONE_EXPLICIT_DATE`
- `KEEP_SELECTED_ITEMS`
- `DROP_SELECTED_TASKS` only when every item is unprotected and has no deadline risk

Before bulk Backlog or Drop confirmation, disclose when the operation leaves a Project or Goal with no active executable work.

The parent remains ACTIVE unless the user separately initiates a terminal lifecycle decision.

Item-level confirmation remains required for completion, correction, splitting, stopping Routines, reparenting, contextual-risk Drop, and all parent terminal actions.

---

## 8. Recommendation Frequency

AI-backed recommendations require a matched rule and sufficient evidence.

The product contract requires recommendations to be:

```txt
limited
prioritized
consolidated
chunked
```

Exact numeric group limits belong to UX and validation rather than this core contract.

Simple eligible items use deterministic quick actions without unnecessary AI text.

Checkpoint bursts use grouped commitment-review chunks and do not create one interruptive prompt per entity.

---

## 9. Evidence and Rationale Contract

Every recommendation preserves:

```txt
matchedRuleId and version
affectedEntityIds
observedMetrics
reasonCodes
exact problem statement
allowedActions
consequence summary
evidenceQuality
```

Rationale must explain only accepted facts and rule consequences.

Forbidden rationale includes claims about motivation, productivity identity, discipline, lifestyle fit, personal failure, Goal meaning, or unsupported capacity.

No fabricated numerical confidence percentage is shown.

---

## 10. Reconcile and Adaptive Planning Boundary

Reconcile may produce structured resolved evidence:

- completed, replanned, Backlog, and dropped Task actions
- confirmed Routine changes
- review deferrals and intent reaffirmations
- recommendation acceptance or rejection
- evidence quality and absence contamination

Reconcile may summarize and offer entry into a separate planning review.

It must not silently regenerate a week, alter future workload, infer long-term capacity, or treat one Reconcile session as permission for broad adaptation.

---

## 11. Scenario Closure Checks

### One recent overdue Task

Deterministic quick actions only. No AI interpretation required.

### Task carried twice

R1 matches; exact Carry count and limited actions are shown.

### Routine evidence includes calibration or absence reconstruction

R4 does not match until six post-calibration observed occurrences and sufficient evidence exist.

### Two-Task Project, both repeatedly carried

R5 proportional branch matches after two observed periods.

### Ten review checkpoints due, no overdue execution

Reconcile is eligible through the commitment-review lane; execution severity does not become Medium or Recovery; checkpoints are grouped and chunked.

### Goal review checkpoint reached

Fixed neutral Goal continuation question appears only when its per-Goal cadence permits. No cause or emotion question is asked.

### Bulk Drop leaves Project empty

Preview explicitly warns that the Project will have no active executable work and will remain ACTIVE until a separate lifecycle decision.

---

## 12. Dependency Audit

### Explicit amendments completed

- Discussion 012A: canonical temporal visibility principle
- Discussion 014A: PlanningDraft fields, defaults, validation, and low-friction behavior
- Discussion 015A: execution/review semantics, placement, history, and Today separation
- Discussion 016A: eligibility, review lane, severity separation, grouping, chunking, and suppression

### No semantic amendment required

- Discussion 013: low-friction conversation and bounded clarification remain compatible; checkpoint defaults add no mandatory question.
- Discussion 018: no new safety category or crisis behavior is introduced; existing no-psychological-inference guardrails remain compatible.

### Required later implementation/detail consumers

- Discussion 019: fields, provenance, events, constraints, indexes, and reason-code persistence
- Discussion 020: deterministic default engine, rule versions, no-free-text rule boundary, and runtime validation
- Discussion 021: scenario tests, timezone tests, cadence suppression, default capping, burst chunking, and forbidden-inference tests
- Discussion 022: sequencing and migration of existing active entities without checkpoints

These later discussions are expected consumers, not blockers to closing the product semantics in Discussion 017.

---

## 13. Mind Map Impact

### Product Vision

- AI organizes operational evidence and does not guess about the user.
- active commitments do not become temporally invisible.
- Backlog is deliberate deferral with a future review.
- review checkpoints are not framed as failure.

### MVP Core Loop

```txt
Open Reconcile
→ deterministic cleanup and temporal derivation
→ ownership and review-lane grouping
→ bounded rule matching
→ exact evidence and limited actions
→ explicit user decision
→ structured evidence handoff
```

### User Flow

Add:

- execution-decision lane
- commitment-review lane
- Goal continuation checkpoint
- grouped/chunked review bursts
- parent-empty bulk consequence preview

### AI Responsibilities

- explain matched deterministic rules
- present only predefined actions
- consolidate repeated recommendations
- summarize resolved evidence

### AI Guardrails

- no causal, emotional, motivational, capacity, or prediction questions
- no free-text rule matching
- no recommendation without a rule
- no protected destructive suggestion
- no Goal or Project lifecycle inference
- no conflation of review due and execution overdue

### Data Events for Discussion 019

```txt
RECONCILE_RULE_EVALUATED
RECONCILE_RULE_MATCHED
RECONCILE_RECOMMENDATION_PRESENTED
RECONCILE_RECOMMENDATION_ACCEPTED
RECONCILE_RECOMMENDATION_REJECTED
RECONCILE_BULK_PREVIEWED
RECONCILE_BULK_CONFIRMED
TEMPORAL_CHECKPOINT_DEFAULTED
TEMPORAL_CHECKPOINT_REACHED
ENTITY_REVIEW_DEFERRED
ENTITY_INTENT_REAFFIRMED
GOAL_CONTINUATION_PRESENTED
GOAL_CONTINUATION_RESOLVED
```

---

## 14. Closure Resolution

GPT and Claude review identified and resolved:

- unrestricted clarification leakage
- small-Project threshold blindness
- calibration contamination
- duplicated evidence gates
- unsafe parent-empty bulk effects
- temporal invisibility of active work
- review-versus-execution conflation
- Goal continuation wording and cadence

No blocking or important unresolved product-semantic issue remains inside Discussion 017.

Discussion 017 is closed.

---

# خلاصهٔ فارسی

بحث ۰۱۷ قرارداد نهایی هوشمندی و actionهای Reconcile را مشخص می‌کند. Reconcile ابتدا از canonical state، ownership، metricهای deterministic و ruleهای versioned استفاده می‌کند؛ AI فقط مجاز است نتیجهٔ ruleهای پذیرفته‌شده را توضیح دهد و حق ندارد problem، metric، علت، recommendation type یا lifecycle conclusion جدید اختراع کند. free text کاربر وارد rule matching و metric calculation نمی‌شود.

Goal Continuation Check یک checkpoint قطعی با متن خنثی است و فقط سه گزینهٔ `CONTINUE`، `REVIEW_LATER` و `ABANDON_GOAL` دارد. نمایش خودکار آن برای هر Goal حداکثر یک‌بار در ۳۰ local day است. absence یا inactivity به‌تنهایی intent را تعیین نمی‌کند و محصول هیچ‌گاه abandonment را توصیه نمی‌کند.

Grouping ابتدا بر اساس ownership و سپس entity type، review lane، rule match و risk انجام می‌شود. recommendation فقط با rule ID معتبر و evidence کافی مجاز است. protected itemها از actionهای مخرب حذف می‌شوند، bulk action نیازمند preview و تأیید صریح است و خالی‌شدن parent باید قبل از commit نمایش داده شود. commitment review از execution backlog جداست و `REVIEW_DUE` severity اجرایی را افزایش نمی‌دهد.

۰۱۷ مرجع نهایی semantics محصول است؛ ۰۱۷A اثرات temporal آن را برای Mind Map تجمیع می‌کند، ۰۱۸ authority و reversibility را تکمیل می‌کند و ۰۱۹ تا ۰۲۱ مسئول persistence، runtime و validation هستند.
