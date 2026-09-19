# Discussion 018 — Final Action Permissions, Trust, and Reversibility Resolution

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative final resolution for AI action permissions, trust, confirmation, and reversibility. The earlier Part A draft was removed after consolidation.

Final companion safety and failure resolution:

- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]

Accepted dependencies:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]

---

## 1. Governing Principle

AI may prepare, organize, explain, and propose.

AI may not silently authorize or commit canonical consequences.

```txt
AI output
→ validated proposal or explanation
→ visible consequences
→ explicit user decision
→ commit-time revalidation
→ deterministic product mutation
```

The language model is never the authorization boundary.

---

## 2. Final AI Permission Taxonomy

Every AI-connected behavior must fit exactly one category:

```txt
READ_ONLY_ALLOWED
CONFIRMATION_REQUIRED
FORBIDDEN
```

A behavior that cannot be classified deterministically is not allowed for MVP.

### Deterministic-system boundary

Deterministic system transitions with no AI involvement fall outside this three-category AI taxonomy.

Examples include:

- automatic RoutineOccurrence derivation or materialization
- automatic MISSED marking under the accepted execution contract
- `REVIEW_DUE` derivation
- deterministic default insertion
- deterministic eligibility or reason-code calculation

Such transitions remain governed by their originating discussion and must be audited with:

```txt
actor = SYSTEM_DETERMINISTIC
```

No fourth AI-permission category is introduced.

---

## 3. READ_ONLY_ALLOWED

Without canonical mutation, AI may:

- interpret an in-scope planning request
- prepare or revise an unapproved PlanningDraft
- organize proposed entity hierarchy
- explain deterministic defaults and validation errors
- summarize the first execution window
- consume deterministic Reconcile facts and matched rules
- explain exact metrics and consequences
- present only accepted rule-attached actions
- group by canonical ownership and accepted rule relationship
- produce a session summary
- distinguish fact, rule match, explanation, default, and user decision
- state that no change has occurred yet

Read-only output must never be represented as a completed action.

---

## 4. CONFIRMATION_REQUIRED

Explicit confirmation tied to a visible action preview is required for all canonical creation and consequential mutation.

### Entity creation

- create Goal
- create Project
- create Task
- create Routine
- approve all or selected parts of a PlanningDraft

This remains true even when the user says phrases such as “do whatever you think is best.” Such language authorizes proposal generation, not unlimited future mutation.

### Temporal and placement changes

- set or change `plannedDate`
- set or change `reviewDate`
- set or change `deadline`
- set or change `targetDate`
- change Routine recurrence
- move Task to Backlog
- move Backlog Task to an explicit execution date
- defer a review checkpoint

### Goal Continuation Check

All three accepted Goal continuation actions are explicitly confirmation-required:

```txt
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

`CONTINUE` and `REVIEW_LATER` preserve `ACTIVE` lifecycle state, but they still mutate current intent or review state and therefore require explicit confirmation.

`ABANDON_GOAL` enters the accepted terminal Goal lifecycle and child-resolution flow.

### Lifecycle changes

- complete Task
- Drop Task
- stop Routine
- complete Project
- stop Project
- achieve Goal
- abandon Goal
- restore dropped Task
- detach or reparent child

### Structural and bulk changes

- split Task
- bulk replan
- bulk move to Backlog
- bulk Drop under accepted strict eligibility
- parent-level child-resolution operation
- AI-proposed hierarchy change

---

## 5. Confirmation Contract

A valid preview must include:

```txt
- action type
- affected entity or entities
- current state
- proposed state
- material consequences
- protected or deadline context
- parent-empty consequence when applicable
- reversibility status
- proposal or preview version
```

Confirmation must be:

- explicit
- action-specific
- attached to the latest validated proposal
- invalidated when material proposal data changes
- recorded with actor and time

A generic confirmation such as “Apply AI suggestions” is insufficient when it hides materially different consequences.

Confirmation for one action does not authorize an adjacent action.

```txt
Confirm MOVE_TO_BACKLOG
≠ permission to DROP
```

```txt
Confirm Project completion
≠ permission to abandon parent Goal
```

---

## 6. Revalidate Before Commit

Every confirmed mutation must be independently revalidated against current canonical state immediately before commit.

This requirement applies regardless of whether a prior invalidation event was recorded.

Commit-time validation must re-check at least:

- current lifecycle state
- current ownership
- authorization
- protection status
- deadline and target context
- selected entity set
- structural conflicts
- material consequences
- action eligibility
- proposal assumptions or expected version

If any material condition changed:

```txt
no mutation occurs
→ previous confirmation expires
→ preview is regenerated from current state
→ explicit confirmation is required again
```

The implementation may use entity versions, `updatedAt`, expected-state hashes, proposal versions, or equivalent concurrency controls. Exact storage belongs to Discussions 019 and 020.

A successful invalidation event is useful, but it is not the sole safety boundary.

---

## 7. FORBIDDEN

AI must never autonomously:

### Mutation and authorization

- create or change canonical entities without approval
- complete, Drop, stop, achieve, abandon, restore, detach, or reparent without approval
- bypass product validation or authorization
- treat generated text as permission
- infer consent from silence, inactivity, absence, or dismissal

### Unsupported interpretation

- diagnose motivation, emotion, discipline, personality, capacity, illness, or lifestyle compatibility
- infer that a Goal is meaningless, achieved, or should be abandoned
- infer that a Project should stop merely from difficult execution
- use free-text notes as Reconcile rule evidence
- invent a metric, rule, protection reason, risk, or confidence score
- produce rule-required recommendations without an accepted matched rule

### Destructive behavior

- permanently delete user data as a normal Planning or Reconcile action
- erase history
- overwrite historical RoutineOccurrences
- rewrite prior decisions without an auditable correction path
- hide deadline or protection context

### Trust deception

- claim mutation succeeded before deterministic confirmation
- present a system default as user-authored
- present AI explanation as deterministic fact
- fabricate numerical confidence
- claim professional authority outside product scope

---

## 8. Bulk Approval

Bulk actions are allowed only when:

- every selected entity is visible
- every selected entity supports the same action
- the same accepted rule or deterministic operation justifies the action
- protected entities are excluded where required
- deadline risks are visible
- consequences are previewed
- the user explicitly confirms the exact selected set
- the selected set and eligibility are revalidated immediately before commit

Bulk-safe MVP candidates:

- move selected Tasks to Backlog
- replan selected Tasks to one explicit date
- keep selected items unchanged
- defer selected review checkpoints to one explicit review date
- Drop selected Tasks only under the strict rule below

Bulk Drop requires every selected Task to be:

- unprotected
- deadline-safe
- individually visible
- free of unresolved structural conflict
- not currently in progress

Before confirmation, disclose whether the action leaves a Goal or Project with zero active executable work.

The parent remains `ACTIVE` unless the user separately initiates a lifecycle transition.

Not bulk-safe for MVP:

- complete multiple Tasks based only on AI inference
- stop multiple Routines
- complete or stop multiple Projects
- achieve or abandon multiple Goals
- detach or reparent multiple children
- correct multiple historical RoutineOccurrences
- split multiple Tasks through generated content without item review

---

## 9. Reversibility Model

The product distinguishes:

```txt
DROP_TASK
ARCHIVE_ENTITY
DELETE_DATA
```

These are not synonyms.

### Task Drop

```txt
DROP_TASK
→ terminal execution decision for the Task
→ identity and history remain
→ active execution surfaces stop showing it
→ explicit Restore is available
```

### Task Restore

```txt
RESTORE_DROPPED_TASK
→ same Task identity returns to ACTIVE
→ Drop and Restore history remain
→ valid future temporal checkpoint is required
→ an old past plannedDate is not silently reused
```

### Routine Resume

Stopped Routine history remains terminal.

Later resumption creates a continuation Routine rather than reactivating the same historical Routine state.

### Archive

Archive is not introduced as an MVP lifecycle substitute for Drop. Its meaning remains deferred until separately accepted.

### Delete

Permanent deletion is not an AI planning action. It belongs to explicit privacy or account-deletion flows with separate safeguards.

---

## 10. History and Audit Minimum

Every confirmed consequential action must later preserve:

```txt
- action type
- entity IDs
- actor: USER | SYSTEM_DETERMINISTIC
- AI proposal reference when applicable
- previous state
- resulting state
- confirmation timestamp when applicable
- rule ID and version when applicable
- consequence preview version
- bulk selection set when applicable
- commit-time validation result or expected version
```

AI is never recorded as the actor that authorized a user-confirmed mutation.

Exact persistence belongs to Discussion 019.

---

## 11. Trust Representation Contract

The product must distinguish:

```txt
FACT
RULE_MATCH
AI_EXPLANATION
SYSTEM_DEFAULT
USER_DECISION
```

A separate warning class is not required for MVP. A warning can be represented through deterministic facts plus bounded explanation without losing authority boundaries.

Preferred pattern:

```txt
FACT:
Two of four active Tasks were carried at least twice.

RULE_MATCH:
Project overload rule R5 matched.

AI_EXPLANATION:
You can move selected Tasks to Backlog, split them, or keep the Project unchanged.

MUTATION STATE:
Nothing changes until you confirm.
```

The UI must not collapse these into generic “AI decided” language.

---

## 12. Final Decisions

- the three-category taxonomy applies only to AI-connected behavior
- non-AI deterministic transitions remain governed by their originating contracts
- all canonical creation remains confirmation-required
- consequential mutations require visible action-specific confirmation
- every mutation is revalidated against current canonical state immediately before commit
- stale or changed proposals require a regenerated preview and new confirmation
- Goal `CONTINUE`, `REVIEW_LATER`, and `ABANDON_GOAL` are explicitly confirmation-required
- bulk Drop remains narrowly allowed for MVP
- Task Restore uses the same identity and preserves history
- Routine Resume creates a continuation Routine
- Archive remains deferred
- permanent Delete remains outside AI planning actions
- trust presentation uses five classes
- AI never becomes the authorizing actor

---

## 13. Claude Findings Resolved

### F1 — deterministic-system boundary

Accepted. No fourth AI category was added. Non-AI deterministic transitions are explicitly outside the taxonomy and use `SYSTEM_DETERMINISTIC` in audit history.

### F2 — revalidate before commit

Accepted. Commit-time revalidation is mandatory and independent from prior invalidation-event history.

### F3 — Goal continuation actions

Accepted. `CONTINUE`, `REVIEW_LATER`, and `ABANDON_GOAL` are explicitly listed as confirmation-required.

No blocking finding remained.

---

## 14. Mind Map Impact — Handoff to Discussion 022

### Product Vision

- AI proposes; the user authorizes consequences.
- current canonical state, not stale AI text, controls mutation.
- trust requires visible evidence, consequences, reversibility, and commit-time validation.
- history is preserved rather than rewritten.

### MVP Core Loop

```txt
AI prepares proposal
→ product validates
→ user previews effects
→ user confirms
→ product reloads and revalidates current state
→ deterministic mutation
→ auditable history
```

### User Flow

Add:

- draft approval boundary
- consequence preview
- stale-confirmation invalidation
- commit-time revalidation
- refreshed preview after material change
- bulk selection preview
- Restore dropped Task flow

### AI Responsibilities

- prepare drafts and bounded recommendations
- explain deterministic effects
- distinguish facts from suggestions
- state when nothing changed
- never represent prior confirmation as currently valid without product validation

### AI Guardrails

- no autonomous canonical mutation
- no permission inferred from silence
- no permanent Delete through Planning or Reconcile AI
- no unsupported psychological or Goal inference
- no generated text as authorization
- no commit from stale or materially changed proposal state

### Data Events for Discussion 019

```txt
AI_PROPOSAL_CREATED
AI_PROPOSAL_REVISED
ACTION_PREVIEWED
ACTION_CONFIRMED
ACTION_COMMIT_REVALIDATED
ACTION_COMMIT_REJECTED_AS_STALE
ACTION_CANCELLED
BULK_SELECTION_PREVIEWED
BULK_ACTION_CONFIRMED
TASK_DROPPED
TASK_RESTORED
CONFIRMATION_INVALIDATED
```

### Traction and Guardrail Metrics

- proposal approval rate
- proposal edit-before-approval rate
- confirmation cancellation rate
- stale confirmation rejection rate
- refreshed-preview reconfirmation rate
- bulk preview cancellation rate
- Restore-after-Drop rate
- unsupported mutation rate, expected zero
- mutation without current confirmation, expected zero
- mutation without commit-time revalidation, expected zero

### Current Decisions

- read-only AI output is not mutation
- canonical changes require explicit confirmation
- deterministic non-AI transitions remain outside AI taxonomy
- Drop preserves history and may be restored
- user confirmation is scoped to a specific current preview
- mutation requires commit-time state validation
- trust categories remain visible

---

## 15. Affected Later Specifications — Handoff to Discussion 022

Discussion 019 must define:

- action proposal identity and version
- entity version or expected-state data
- confirmation and revalidation events
- immutable Drop and Restore history
- actor representation

Discussion 020 must define:

- deterministic permission evaluation
- commit-time revalidation
- concurrency and stale-proposal rejection
- authorization enforcement outside model output
- idempotent mutation execution

Discussion 021 must test:

- missed invalidation event with successful commit-time rejection
- cross-device stale confirmation
- changed deadline or protection status
- changed selection set
- Goal continuation action confirmation
- bulk Drop revalidation
- AI text conflicting with deterministic preview

Discussion 022 must sequence:

- rollout of permission enforcement
- migration to proposal/version-aware confirmations
- feature flags or kill switches for consequential AI-connected actions

---

## 16. Closure

Discussion 018 is accepted and closed.

---

# خلاصهٔ فارسی

بحث ۰۱۸ مرز اختیار AI، اعتماد، confirmation و reversibility را نهایی می‌کند. خروجی read-only، explanation و proposal به‌خودی‌خود mutation نیستند. هر تغییری در canonical state به preview مشخص، مجموعهٔ دقیق entityها، نمایش پیامدها، تأیید صریح کاربر و revalidation بلافاصله پیش از commit نیاز دارد. سکوت، متن تولیدشده یا تأیید یک proposal قدیمی مجوز محسوب نمی‌شود.

transitionهای قطعی و غیرهوشمند مانند materialization occurrence، تعیین Missed و محاسبهٔ eligibility می‌توانند تحت ruleهای پذیرفته‌شده اجرا شوند. AI می‌تواند facts و actionهای مجاز را توضیح دهد، اما actionهای lifecycle، bulk replan، Drop، تغییر recurrence و تغییر hierarchy confirmation-required هستند. حذف دائمی تاریخچه، تغییر پنهانی state، تصمیم‌گیری روان‌شناختی و mutation از proposal منقضی یا stale ممنوع است.

Bulk action فقط روی selected set قابل‌مشاهده و پس از بررسی protection، deadline risk و structural conflict مجاز است. Drop تاریخچه را حفظ می‌کند و Task می‌تواند با همان identity و audit trail Restore شود. Routine متوقف‌شده دوباره فعال نمی‌شود و Resume یک continuation Routine جدید می‌سازد. ۰۱۸A companion نهایی failure/privacy/safety است و بحث ۰۲۲ مسئول انتقال این قواعد به Mind Map و اسناد رسمی است.
