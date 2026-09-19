# Discussion 016 — Reconcile Trigger and Severity

## Status

Accepted and closed after GPT × Claude review.

Required companion amendment:

- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]

This document owns the base Reconcile eligibility, execution-backlog severity, blocking-conflict, Today-access, prompt-suppression, and retrigger policy. Discussion 016A adds the accepted `REVIEW_DUE` eligibility and distinct commitment-review presentation lane. They form one decision family and must be read together. Where review-checkpoint wording differs, Discussion 016A is authoritative.

Discussion 017 owns final grouping, explanation, recommendation, and action semantics. Discussions 019–021 own persistence/events, API/runtime realization, and immutable pilot severity segmentation. Discussion 022 owns Mind Map and formal-document application.

This discussion defines when Reconcile becomes eligible, how strongly it is presented, how absence affects confidence, how Today remains accessible, and how same-day retrigger is controlled.

Related accepted discussion:

- [[01-Closed-Discussions/015-task-and-routine-execution-model]]

---

## 1. Scope

This discussion answers:

```txt
When should Reconcile appear?
How prominent should it be?
When must it not appear?
Can the user skip it and enter Today?
How often may it prompt in one local day?
Which facts determine LIGHT, MEDIUM, or RECOVERY?
How are blocking conflicts separated from severity?
Which context must be retained for deterministic validation?
```

Discussion 016 defines **trigger and presentation policy** only.

Discussion 017 defines:

- grouping of Reconcile items
- recommendations and explanations
- resolution actions and bulk actions
- detailed Reconcile interaction flow

---

## 2. Accepted Inputs from Discussion 015

The following are inherited and not reopened:

- an unresolved past-due Task remains `ACTIVE`
- overdue is a derived condition
- unresolved past Tasks become Reconcile-eligible
- Carry is explicit and repeated Carry may become evidence
- RoutineOccurrence never carries
- `MISSED` is a neutral historical fact, not debt or moral failure
- raw `MISSED` counts are not automatically actionable backlog
- historical corrections may become Reconcile evidence
- parent lifecycle conflicts may require explicit resolution
- Reconcile resolves unresolved past execution
- Adaptive Planning proposes future plan changes
- Adaptive Planning may consume reliable Reconcile outcomes
- absence is not failure
- missing interaction is not negative evidence
- one weak period is not a stable behavioral pattern

---

## 3. Core Separation

The product must keep three decisions separate:

```txt
1. Eligibility
   Is there actionable unresolved execution to review?

2. Severity
   How prominently should Reconcile be presented?

3. Blocking conflict
   Is one specific lifecycle action blocked until a local conflict is resolved?
```

These are not interchangeable.

```txt
eligible = true
≠ severity = RECOVERY

blockingConflict = true
≠ Today is blocked

blockingConflict = true
≠ global severity is automatically increased
```

Severity describes the amount and complexity of unresolved execution context. It does not diagnose discipline, motivation, capability, or personal worth.

MVP uses deterministic rule bands rather than an opaque weighted score.

---

## 4. Reconcile Eligibility

Reconcile becomes eligible when at least one **actionable unresolved execution fact** exists.

### 4.1 Eligible Task facts

A Task may make Reconcile eligible when:

- `status = ACTIVE` and `plannedDate < currentLocalDate`
- the same Task has been Carried at least twice
- it was dropped or historically corrected in a context that still requires review
- it conflicts with an attempted parent lifecycle transition
- its ownership became unresolved through an explicit lifecycle operation

A single recently overdue Task is sufficient for eligibility, but normally results only in `LIGHT` presentation.

### 4.2 Eligible Routine and occurrence facts

Routine execution may make Reconcile eligible when:

- a repeated missed pattern exists across observed periods
- historical corrections materially change previously understood execution
- recurrence was repeatedly edited and may no longer fit
- a parent lifecycle transition stops the Routine and user context requires review
- execution facts remain genuinely unresolved rather than deterministically classifiable

A single ordinary `MISSED` occurrence does not independently trigger Reconcile.

### 4.3 Structural conflicts

A structural conflict exists when an attempted lifecycle action cannot remain coherent without explicit child resolution.

Examples:

- completing a Project with active child Tasks
- stopping a Goal while active dependent work remains
- leaving active owned work under a terminal parent

A structural conflict:

- may open a local resolution path immediately
- blocks only the affected lifecycle action
- does not block Today
- does not automatically set global Reconcile severity to `RECOVERY`

### 4.4 Non-actionable facts

The following do not independently create Reconcile eligibility:

- user absence without actionable unresolved work
- isolated `MISSED` occurrences requiring no decision
- facts already resolved for the evaluated boundary
- deterministic cleanup results
- analytics-only signals
- Adaptive Planning calibration signals without unresolved execution
- future Tasks or future RoutineOccurrences
- completed or dropped history requiring no correction

---

## 5. Deterministic Cleanup Before Severity

Severity is calculated only after deterministic execution cleanup.

Required order:

```txt
1. determine current local date and effective timezone
2. derive or materialize required RoutineOccurrences
3. convert eligible past PENDING occurrences to MISSED
4. remove future projections and non-actionable historical facts
5. identify actionable Reconcile-eligible facts
6. deduplicate facts already handled inside the evaluated boundary
7. identify scoped blocking conflicts
8. calculate global presentation severity from actionable backlog
```

This prevents reconstructed occurrence history from inflating severity.

```txt
30 reconstructed MISSED occurrences
+ no explicit user decision required
≠ 30 actionable backlog items
```

---

## 6. Accepted Severity Inputs

### 6.1 Primary backlog inputs

- `actionableBacklogCount`
- `unresolvedTaskCount`
- `oldestUnresolvedAgeDays`
- `repeatedCarryTaskCount`
- `maximumCarryCountForOneTask`
- `deadlineRiskCount`
- `affectedProjectCount`
- `affectedGoalCount`
- `actionableCorrectionCount`
- `newItemsSinceLastReconcile`

### 6.2 Routine summary inputs

- `actionableRoutinePatternCount`
- `recentMissedPatternCount`
- `observedOccurrenceCount`
- `occurrenceCorrectionCount`
- `recurrenceEditCount`

Routine inputs must represent an actionable pattern or unresolved context, not raw missed-date volume.

### 6.3 Absence context

- `absenceDays`
- `activityObservedDuringPeriod`
- `evidenceConfidence`

Accepted rule:

```txt
absenceDays modifies context and confidence
absenceDays does not independently create eligibility
absenceDays does not independently increase severity
```

### 6.4 Blocking-conflict context

- `blockingConflict`
- `blockingConflictCount`
- `blockingConflictScope[]`

Blocking conflict is recorded beside severity rather than folded into it.

### 6.5 Actionable backlog definition

```txt
actionableBacklogCount
= Reconcile-eligible facts that currently require an explicit user decision
```

It includes unresolved Tasks, repeated-Carry Tasks needing review, actionable corrections, and similar decision-bearing facts.

It excludes raw `MISSED` occurrence history, future work, and already deterministic facts.

---

## 7. Final Severity Bands

Higher bands override lower bands when their backlog conditions are met.

### 7.1 LIGHT

Use `LIGHT` when unresolved work is small, recent, and understandable without a dedicated review session.

Typical rule:

```txt
1–2 actionable unresolved items
oldest age <= 2 local days
no meaningful deadline risk
no broad parent spread
no Task carried twice or more requiring deliberate review
```

Presentation:

- small inline prompt, banner, or entry point
- fully optional
- does not interrupt Today
- may offer a quick resolution action
- may be dismissed for the current local day

Example meaning:

> One task from yesterday still needs a decision.

### 7.2 MEDIUM

Use `MEDIUM` when deliberate review is useful but the situation does not justify broad recovery.

Any of these may qualify:

```txt
3–7 actionable unresolved items
oldest unresolved age between 3 and 7 local days
1–2 actionable items older than 7 local days
same Task carried at least twice
more than one affected Project or Goal
one or more meaningful deadline risks
multiple related corrections or drops
```

Presentation:

- prominent Reconcile card or page entry
- recommended before future planning changes
- still skippable
- Today remains accessible
- skipped state remains discoverable through badge or reminder

Repeated Carry threshold:

```txt
first Carry on a Task
→ normal rescheduling

second Carry on the same Task
→ repeated-Carry signal
→ Reconcile eligible
→ normally at least deliberate LIGHT or MEDIUM review depending on other context
```

The second Carry creates the signal. It does not automatically prove broad failure or force `RECOVERY`.

### 7.3 RECOVERY

Use `RECOVERY` when actionable unresolved execution is broad, stale, or spread across several contexts and is difficult to resolve safely through one lightweight action.

Any strong backlog condition may qualify:

```txt
8+ actionable unresolved items
oldest unresolved age > 7 local days
AND actionableBacklogCount >= 3
3+ affected parent contexts
large actionable backlog after meaningful absence
several periods of unresolved Carry or Drop decisions
```

Important edge rule:

```txt
1–2 old actionable items
—even when older than 7 days—
→ MEDIUM at most
```

Age alone does not create Recovery. Recovery requires breadth as well as staleness, unless another independently broad backlog rule applies.

Presentation:

- dedicated, chunked recovery entry
- explicitly allows continuing Today first
- remains skippable
- uses neutral, non-punitive language
- does not claim absence or backlog proves low ability

`RECOVERY` describes the product's need to organize unresolved execution. It does not describe the user as failing.

---

## 8. Blocking Conflict Policy

Blocking conflicts are independent from severity.

Conceptual model:

```txt
ReconcileContext
- severity: LIGHT | MEDIUM | RECOVERY
- blockingConflict: boolean
- blockingConflictScope[]
```

Example:

```txt
severity = LIGHT
blockingConflict = true
blockingConflictScope = [PROJECT_COMPLETION]
```

Behavior:

- the affected lifecycle action remains blocked
- the product opens or offers a focused child-resolution path
- Today remains accessible
- unrelated Reconcile severity is unchanged
- resolving the conflict does not imply the entire backlog is reconciled

---

## 9. Absence Rules

### 9.1 Absence alone

```txt
absenceDays > 0
+ no actionable unresolved execution
→ no Reconcile
```

A neutral welcome-back message may exist outside Reconcile.

### 9.2 Absence with backlog

When absence and actionable backlog coexist:

- backlog determines eligibility
- actionable count, age, deadline risk, and spread determine severity
- absence explains uncertainty and stale context
- evidence confidence is reduced
- the product asks for context rather than inferring low capacity

### 9.3 Adaptive Planning boundary

Reconcile may resolve items from an absence period, but downstream adaptation must distinguish:

```txt
explicit Carry / Drop / Complete / correction decisions
from
unobserved inactivity and automatically reconstructed facts
```

Absence-contaminated periods must not independently drive aggressive workload reduction.

---

## 10. Today Access and Skip Behavior

### 10.1 Reconcile does not block Today

```txt
Reconcile is non-blocking at every severity.
```

The user may enter Today even during `RECOVERY`.

Only a specific conflicting lifecycle action may be blocked.

### 10.2 LIGHT skip

- may be dismissed for the current local day
- no confirmation required
- unresolved count remains discoverable

### 10.3 MEDIUM skip

- explicit skip action
- may offer `Review later today` or `Remind me tomorrow`
- Today opens immediately

### 10.4 RECOVERY skip

- remains skippable
- explicitly acknowledges unresolved work remains
- may choose a later review time or next-open reminder
- no artificial urgency unless a real deadline exists

### 10.5 Skip is not resolution

```txt
presentation skipped
≠ execution facts reconciled
```

Skipping changes presentation state only.

---

## 11. Trigger Timing

Eligibility may be evaluated:

- when the app opens
- when Today opens
- after deterministic occurrence cleanup
- after an execution action creates new unresolved context
- before a parent lifecycle transition requiring child resolution
- when the user manually opens Reconcile

Default automatic behavior:

```txt
passive evaluation on app or Today open
→ at most one automatic primary Reconcile prompt per local day
```

The product must not visibly reopen full Reconcile after every execution event.

---

## 12. Same-Day Presentation and Retrigger

### 12.1 Primary prompt limit

At most one automatic primary Reconcile prompt may be shown per user-local day.

This applies after:

- completion
- skip
- dismissal
- entering Today directly

### 12.2 Updates after the prompt

New unresolved facts may update:

- badge count
- Reconcile page contents
- non-interruptive status text

They do not automatically reopen the primary prompt.

### 12.3 Same-day retrigger exceptions

A second interruptive presentation is allowed only when:

- the user explicitly opens Reconcile
- a new scoped blocking conflict appears
- a real deadline risk or safety-critical execution condition emerges

Normal new overdue work is not enough for forced same-day retrigger.

### 12.4 Next-day recalculation

On the next local day:

- eligibility is recalculated
- prior skip no longer suppresses presentation
- severity may rise, fall, or disappear
- resolved items do not return

---

## 13. Reconcile Session Boundary

The product distinguishes:

```txt
facts evaluated at session start
+ decisions made in the session
+ facts created after that boundary
```

Facts created after completion become `newItemsSinceLastReconcile`.

They are available for manual review or a later session, but do not invalidate the truth of the completed evaluated snapshot.

The product must not claim the entire current backlog is resolved when new facts appeared after the evaluated boundary.

---

## 14. Required Validation Context

The following conceptual context must be available:

```txt
ReconcileContext
- evaluatedLocalDate
- effectiveTimezone
- evaluatedAt
- evaluatedBoundary
- triggerReasons[]
- severity
- actionableBacklogCount
- actionableUnresolvedTaskCount
- oldestUnresolvedAgeDays
- repeatedCarryTaskCount
- maximumCarryCountForOneTask
- deadlineRiskCount
- affectedProjectCount
- affectedGoalCount
- actionableRoutinePatternCount
- actionableCorrectionCount
- absenceDays?
- activityObservedDuringAbsence
- evidenceConfidence
- blockingConflict
- blockingConflictCount
- blockingConflictScope[]
- lastPresentedLocalDate?
- lastCompletedAt?
- lastSkippedAt?
- newItemsSinceLastReconcile
- presentationState
```

Conceptual presentation states:

```txt
NOT_PRESENTED
PRESENTED
DISMISSED
SKIPPED
STARTED
COMPLETED
```

Exact storage belongs to Discussion 019.

---

## 15. Final Answers to Original Questions

### 1. Is one unresolved Task from yesterday enough?

Yes for eligibility. It normally produces `LIGHT` presentation.

### 2. Does absence create a separate entry path?

Absence is context, not an independent Reconcile trigger or severity source.

### 3. When must Reconcile not be shown?

When no actionable unresolved execution exists, only deterministic or analytics-only facts exist, or all eligible facts were already handled for the evaluated boundary.

### 4. Can the user skip and enter Today?

Yes, at every severity.

### 5. How often can Reconcile trigger in one local day?

At most one automatic primary prompt, except explicit user action, a new scoped blocking conflict, or a real deadline/safety-critical condition.

### 6. Which inputs determine severity?

Actionable backlog count, age, repeated Carry, deadline risk, affected parent spread, actionable corrections, actionable routine patterns, and backlog context after cleanup.

Absence modifies confidence only.

### 7. What are the exact MVP bands?

- `LIGHT`: small and recent actionable backlog
- `MEDIUM`: moderate, older, repeated, or risk-bearing backlog
- `RECOVERY`: broad actionable backlog, or stale backlog with at least three actionable items

### 8. Severity before or after occurrence cleanup?

After deterministic cleanup.

### 9. Does Reconcile block Today?

No.

### 10. What if new overdue work appears after completion?

Update counts and defer automatic primary presentation until a later allowed boundary.

### 11. How is same-day retrigger prevented?

Local-date presentation state plus the evaluated session boundary.

### 12. Which context fields are required?

The conceptual context in Section 14.

---

## 16. Scenario Checks

### Scenario A — One Task from Yesterday

Expected:

- eligible
- `LIGHT`
- optional inline entry
- Today accessible
- dismissal suppresses another automatic primary prompt that day

### Scenario B — One Old Task

```txt
1 actionable Task
age = 9 days
no deadline risk
no repeated Carry
```

Expected:

- eligible
- `MEDIUM`, not `RECOVERY`
- no dedicated broad recovery flow

### Scenario C — Three Old Tasks

```txt
3 actionable Tasks
oldest age = 9 days
```

Expected:

- eligible
- `RECOVERY` may apply because staleness and breadth coexist
- recovery remains skippable

### Scenario D — One-Month Absence, No Backlog

Expected:

- no Reconcile
- optional neutral welcome-back elsewhere
- no failure interpretation
- no automatic workload reduction signal

### Scenario E — One-Month Absence with Ten Old Tasks

Expected:

- eligible
- likely `RECOVERY`
- severity comes from actionable backlog and age
- absence lowers evidence confidence
- recovery is chunked and skippable

### Scenario F — Many Reconstructed MISSED Occurrences

```txt
20 reconstructed MISSED occurrences
0 actionable decisions
```

Expected:

- deterministic cleanup completes
- no twenty-item Reconcile backlog
- summarized pattern may appear only if it becomes actionable

### Scenario G — Repeated Carry

```txt
same Task carried twice
still ACTIVE
```

Expected:

- repeated-Carry signal exists
- Reconcile eligible
- deliberate review may be `LIGHT` or `MEDIUM` depending on surrounding backlog
- no Recovery from Carry alone

### Scenario H — Project Completion Conflict

Expected:

- Project completion remains blocked
- `blockingConflict = true`
- scope identifies Project completion
- global severity is calculated independently
- Today remains accessible

### Scenario I — New Deadline Risk After Reconcile

Expected:

- badge/context updates
- same-day interruptive retrigger is permitted because a real deadline risk emerged
- unrelated ordinary overdue work would not qualify

---

## 17. Final Review Resolution

Claude review found no blocking issue.

Accepted findings:

```txt
F1 — Important
Age alone could incorrectly create RECOVERY for one old Task.

Resolution:
RECOVERY-by-age requires actionableBacklogCount >= 3.
One or two old actionable items remain MEDIUM at most.

F2 — Important
A local blocking lifecycle conflict could incorrectly force global RECOVERY.

Resolution:
blockingConflict is an independent scoped flag.
It blocks only the affected lifecycle action and does not automatically alter global severity.
```

Accepted direct answers:

- repeated Carry begins on the second Carry of the same Task
- `RECOVERY` remains skippable
- Today remains accessible at every severity
- real deadline risk may trigger a same-day exception
- raw `MISSED` occurrence count is excluded from actionable backlog severity

No unresolved product question remains inside Discussion 016.

---

## 18. Mind Map Impact — Handoff to Discussion 022

The following changes must be applied precisely to the shared Mind Map through Discussion 022 consolidation.

### 18.1 Product Vision

Add a subsection named **Recovery Without Punishment** with these nodes:

```txt
Reconcile reduces the cost of returning after deviation
Past backlog must not block present-day action
Absence is uncertainty, not failure
Recovery severity describes product assistance, not user quality
```

Connect:

```txt
Adaptive Planner
→ supports return after deviation
→ preserves access to Today
→ avoids shame-based recovery
```

### 18.2 MVP Core Loop

Add this flow after normal execution evaluation:

```txt
Open App / Today
→ deterministic execution cleanup
→ collect actionable unresolved facts
→ detect scoped blocking conflicts
→ calculate LIGHT / MEDIUM / RECOVERY
→ optional Reconcile entry
→ Today remains accessible
→ accepted decisions update execution history
```

Add an explicit side branch:

```txt
No actionable unresolved facts
→ no Reconcile
```

Add another branch:

```txt
Blocking lifecycle conflict
→ block only affected action
→ keep Today accessible
```

### 18.3 User Flow

Add three entry patterns:

```txt
LIGHT
→ small inline prompt
→ quick resolve or dismiss

MEDIUM
→ prominent entry
→ review now / later / tomorrow

RECOVERY
→ dedicated chunked recovery
→ continue Today first or review backlog
```

Add same-day suppression flow:

```txt
Primary prompt shown
→ later facts update badge/content only
→ no second automatic prompt
→ next local day recalculates
```

Add exceptions:

```txt
explicit user open
or new blocking conflict
or real deadline risk
→ same-day retrigger allowed
```

### 18.4 AI Responsibilities

Add:

- AI does not decide eligibility before deterministic cleanup
- AI may explain severity using accepted rule inputs
- AI distinguishes actionable backlog from raw historical facts
- AI treats absence as low-confidence context
- AI does not infer poor capacity from non-use
- AI recommendations after opening Reconcile remain defined by Discussion 017
- Adaptive Planning may consume explicit Reconcile outcomes but must discount absence-contaminated periods

### 18.5 AI Guardrails

Add these exact guardrails:

```txt
No Reconcile from absence alone
No Reconcile from raw MISSED count alone
No hidden interpretation of backlog as low capability
No blocking Today because of Reconcile severity
No automatic primary prompt more than once per local day
No automatic resolution when presentation is skipped
No opaque severity without explainable trigger reasons
No RECOVERY from one old item alone
No global severity escalation from a scoped lifecycle conflict alone
```

### 18.6 Data Events

Record the following event candidates for Discussion 019:

```txt
RECONCILE_ELIGIBILITY_EVALUATED
RECONCILE_SEVERITY_CALCULATED
RECONCILE_BLOCKING_CONFLICT_DETECTED
RECONCILE_PRESENTED
RECONCILE_DISMISSED
RECONCILE_SKIPPED
RECONCILE_STARTED
RECONCILE_COMPLETED
RECONCILE_NEW_ITEMS_DETECTED
RECONCILE_SAME_DAY_RETRIGGERED
```

Required conceptual payload groups:

```txt
Evaluation boundary
Local date and timezone
Trigger reasons
Actionable backlog summary
Age summary
Carry summary
Deadline risk summary
Affected parent summary
Absence and confidence context
Severity
Blocking conflict flag and scope
Presentation state
```

Do not record raw reconstructed `MISSED` count as actionable backlog count.

### 18.7 Traction Metrics

Add product metrics:

- eligible-session to Reconcile-start rate
- completion rate by severity band
- median actionable items resolved per Reconcile session
- backlog-age reduction after Reconcile
- percentage continuing Today after skip
- return-to-execution rate after `RECOVERY`
- same-day repeated automatic prompt rate, expected near zero
- percentage of scoped blocking conflicts resolved without abandoning Today

Add guardrail metrics:

- abandonment after Reconcile presentation
- excessive prompt frequency
- Recovery sessions caused by fewer than three old actionable items, expected zero
- Recovery sessions caused only by blocking conflict, expected zero
- Recovery sessions caused mainly by absence, expected zero
- reconstructed MISSED facts incorrectly surfaced as individual actions
- Today access failure while Reconcile is eligible, expected zero

Do not treat Reconcile completion rate alone as proof of product value without retention and return-to-execution context.

### 18.8 Current Decisions

Add these accepted decisions:

- eligibility, severity, and blocking conflict are separate concepts
- Reconcile requires actionable unresolved execution
- one recent unresolved Task is enough for `LIGHT` eligibility
- severity is deterministic and rule-based in MVP
- deterministic cleanup precedes severity
- raw `MISSED` count does not inflate actionable backlog
- absence alone does not trigger Reconcile
- absence does not independently increase severity
- second Carry on the same Task creates repeated-Carry evidence
- one or two old actionable items are `MEDIUM` at most
- age-based `RECOVERY` requires at least three actionable items
- scoped blocking conflict does not force global `RECOVERY`
- Today remains accessible at all severities
- `RECOVERY` remains skippable
- one automatic primary prompt is allowed per local day
- new deadline risk may allow same-day retrigger
- skipping changes presentation state, not execution facts

### 18.9 Open Questions

Remove these resolved questions from the Mind Map:

- whether absence alone triggers Recovery
- whether every MISSED occurrence becomes a Reconcile item
- whether Recovery blocks Today
- whether blocking conflict always means Recovery
- whether one old Task creates Recovery
- whether repeated Carry begins after two or three Carry actions

Keep or create only downstream questions:

- Discussion 017: how eligible items are grouped
- Discussion 017: what recommendations and explanations appear
- Discussion 017: whether bulk resolution is supported
- Discussion 019: exact persistence of evaluation boundary and presentation state
- Discussion 020: runtime evaluation and same-day retrigger implementation
- Discussion 021: validation scenarios and threshold calibration tests

---

## 19. Affected Formal Documents — Handoff to Discussion 022

After consolidation, update or create:

- Reconcile eligibility specification
- Reconcile severity and presentation policy
- scoped blocking-conflict policy
- Today/Reconcile coexistence specification
- same-day prompt suppression and retrigger specification
- Reconcile context and evaluation-boundary specification
- Adaptive Planning evidence-quality guardrails
- Discussion 017 grouping and recommendation contract
- Discussion 019 data and event specification
- Discussion 020 runtime evaluation specification
- Discussion 021 validation plan
- Discussion 022 implementation plan

Potential ADRs:

- rule-based explainable Reconcile severity for MVP
- separation of eligibility, severity, and scoped blocking conflict
- non-blocking Reconcile and permanent Today access
- absence as confidence context rather than failure signal
- once-per-local-day automatic primary presentation
- age-based Recovery requiring minimum actionable breadth

Discussion 022 owns the consolidation pass and formal-document updates. Closing this discussion alone does not apply those changes.

---

# خلاصهٔ فارسی

بحث ۰۱۶ مشخص می‌کند Reconcile چه زمانی eligible می‌شود و با چه شدت و نحوه‌ای نمایش داده می‌شود. `eligibility`، `severity` و `blocking conflict` سه مفهوم جدا هستند. پیش از محاسبهٔ شدت، سیستم باید occurrenceهای لازم را به‌صورت deterministic ارزیابی، داده‌های غیرقابل‌اقدام را حذف و فقط backlog نیازمند تصمیم کاربر را محاسبه کند.

شدت‌های MVP شامل `LIGHT`، `MEDIUM` و `RECOVERY` هستند. یک Task جدید و حل‌نشده معمولاً Light است؛ work قدیمی یا repeated Carry می‌تواند Medium شود؛ و Recovery برای backlog گسترده یا backlog قدیمی با حداقل سه آیتم actionable است. یک یا دو Task قدیمی، absence، تعداد خام occurrenceهای Missed یا یک conflict محدود به‌تنهایی Recovery ایجاد نمی‌کنند.

Reconcile در هیچ شدتی Today را مسدود نمی‌کند و کاربر می‌تواند آن را skip کند. prompt اصلی به‌طور خودکار حداکثر یک بار در هر local day نمایش داده می‌شود؛ فقط خطر واقعی deadline یا conflict جدید و فوری می‌تواند exception محدود ایجاد کند. قواعد `REVIEW_DUE` و commitment-review lane در ۰۱۶A تکمیل شده‌اند.
