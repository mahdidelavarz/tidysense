# Discussion 018A — Final AI Failure, Privacy, Domain, and Hostile Input Resolution

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative final resolution for AI failure, privacy, domain boundaries, crisis safety, and hostile input. The earlier Part B proposal and Claude review brief were removed after consolidation.

Accepted dependencies:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]

---

## 1. Governing Failure Rule

```txt
AI failure
→ no unconfirmed canonical mutation
→ preserve current canonical state
→ preserve user-authored input where possible
→ expose manual or deterministic fallback
→ show a user-facing status when the active flow is affected
→ log the internal failure category separately
```

The product fails closed for mutation and fails open for manual product access.

Deterministic system maintenance governed by accepted non-AI discussions may continue when safe and independent from the failed AI path.

---

## 2. Partial Output Decision

For MVP:

```txt
PARTIAL_OUTPUT
→ reject the generated response as a usable PlanningDraft
→ do not display an approvable subset
→ do not auto-apply any subset
→ preserve the original user request
→ offer retry or manual creation
```

Subset recovery is deferred until post-MVP validation demonstrates a clear need and safe UX.

---

## 3. Deterministic Repair Boundary

Allowed deterministic repair remains narrow:

- apply accepted system-default review dates
- normalize accepted enum casing
- reject unknown fields
- reject invalid ownership combinations
- reject out-of-range detailed execution dates

Deterministic repair must never:

- invent user intent
- invent Goal outcome
- invent deadline, target, hierarchy, or user-specific dates
- infer motivation, emotion, capacity, diagnosis, or lifestyle fit
- silently remove entities
- silently merge or split entities
- silently reparent entities
- silently reclassify or downgrade an entity type to force validation to pass
- change a Goal into a Project, Project into Task, or any equivalent semantic downgrade

If deterministic repair cannot produce a fully valid draft without semantic invention, the response is rejected.

---

## 4. Manual Fallback Requirement

Core product operation must remain usable without AI.

Required manual capabilities include:

### Planning

- create and edit Goal, Project, Task, and Routine
- assign ownership
- set dates, review checkpoints, Backlog placement, and recurrence

### Execution

- complete, Carry, replan, move to Backlog, and Drop Task
- Restore a dropped Task under Discussion 018 semantics
- mark and correct RoutineOccurrence
- initiate accepted parent lifecycle transitions

### Reconcile

- view deterministic facts and rule matches
- use deterministic quick actions
- review temporal checkpoints
- answer the fixed Goal Continuation Check
- resolve structural lifecycle conflicts

AI is an enhancement layer, not a prerequisite for canonical product operation.

---

## 5. Reconcile Input Boundary

For MVP:

```txt
Reconcile AI input
→ structured facts only
→ no free-text notes
→ no descriptions
→ no imported messages
→ no emotional explanations
→ no user-authored narrative context
```

Allowed structured input includes:

- minimal safe label where needed for display
- canonical ownership
- matched rule ID and version
- observed metrics
- reason codes
- allowed actions
- protection flags
- deterministic consequences
- evidence quality

Free-text remains excluded from rule matching, permission decisions, recommendation eligibility, and AI wording context in MVP.

---

## 6. Planning Input Minimization

Planning AI may receive only operation-relevant context:

- current user request
- user-approved constraints
- timezone and current local date
- current unapproved draft
- scoped relevant entity summaries
- explicit availability or scheduling constraints
- known conflicting deadlines

The default must not send entire account history, unrelated notes, completed or dropped entities, private communications, hidden behavioral scoring, or sensitive profile fields unrelated to the request.

Secrets, tokens, passwords, API keys, payment credentials, and authentication material must never be intentionally sent to the model.

---

## 7. Non-Clinical Wellbeing Boundary

`NON_CLINICAL_WELLBEING_ORGANIZATION` allows organization without diagnosis or treatment claims.

Allowed examples:

- create a general wind-down Routine
- schedule walking, breaks, journaling, sleep-preparation, or user-chosen coping activities
- organize appointments with a doctor or therapist
- schedule a routine the user explicitly requests for managing stress or anxiety

Not allowed:

- diagnose anxiety, depression, ADHD, burnout, or another condition
- infer a clinical condition from missed Tasks or Routines
- recommend treatment, medication, or clinical intervention
- claim that a Routine will treat or cure a disorder
- use execution history as clinical evidence

When a user asks for a Routine “for anxiety,” the planner may organize user-selected activities but must not choose or present clinical treatment as product truth.

---

## 8. Financial Boundary Example

Debt-repayment organization is allowed only when it organizes a user-chosen plan.

Allowed:

- schedule recurring payments
- record user-declared due dates
- organize a repayment sequence already chosen by the user
- remind the user to contact a creditor or qualified adviser

Not allowed:

- decide which debt should be prioritized
- recommend refinancing, consolidation, or insolvency strategy
- determine investment or credit suitability
- claim a repayment strategy is financially optimal

---

## 9. Crisis Safety Release Gate

The locked invariant from Discussion 013 remains authoritative:

```txt
explicit crisis or self-harm content
→ no PlanningDraft generated from that content
→ ordinary productivity coaching does not continue as though this were scheduling
→ route to an accepted immediate-safety response
```

The exact crisis specification is a mandatory release gate in Discussion 021.

```txt
MVP MUST NOT SHIP
until the crisis safety specification is written, reviewed, tested, and accepted.
```

The Discussion 021 gate must cover at least:

- detection boundary
- false-positive and false-negative handling
- localized resource selection
- behavior when location is unknown
- user-facing crisis response copy
- when planning flow must stop
- what safe practical organization may continue afterward
- provider refusal interaction
- offline or provider-unavailable fallback
- adversarial and regression tests
- review by a qualified non-AI safety expert

Discussion 013 must reference this explicit Discussion 021 release gate rather than an unnamed future policy.

---

## 10. Hostile and Imported Content

All user-authored and imported content is untrusted data.

It may be summarized within allowed scope, but it cannot become:

- system instruction
- tool command
- permission grant
- rule definition
- authorization override
- secret-access request

Runtime guardrails:

- separate instructions from content structurally
- allowlist product action types
- block unknown tool or action names
- revalidate every mutation outside the model
- preserve confirmation requirements
- minimize and sanitize imported connector content
- never treat links, attachments, emails, calendar descriptions, or pasted documents as authority

---

## 11. Degraded Reconcile Mode

When AI explanation is disabled or unavailable:

```txt
FACT remains visible
RULE_MATCH remains visible
AI_EXPLANATION is absent
allowed deterministic actions remain available
Today and manual Reconcile remain accessible
```

The UI must preserve the trust classes from Discussion 018 and must not relabel deterministic facts or rules as AI output.

---

## 12. User-Facing Failure Visibility

Every AI failure that affects the active user flow must produce a user-facing status.

The user-facing message should state:

- what failed in plain language
- whether any data changed
- what remains available
- what the user can do next

Internal categories such as `TIMEOUT`, `RATE_LIMITED`, `SCHEMA_INVALID`, or `PROVIDER_UNAVAILABLE` may remain in operational logs rather than being exposed verbatim.

Examples:

```txt
AI assistance is temporarily unavailable.
Nothing was changed.
You can retry or continue manually.
```

```txt
AI could not prepare a valid plan.
Nothing was created.
Your original request is still available.
```

No flow-affecting failure may appear as success or remain completely silent.

---

## 13. Logging and Retention Boundary

The system must keep separate:

```txt
PRODUCT_EVENT_LOG
AI_OPERATIONAL_LOG
RAW_PROMPT_RESPONSE_CONTENT
```

Product and audit events may preserve accepted facts and decisions.

Operational logs may preserve minimal diagnostics such as request ID, model identifier, latency, token counts, error category, schema-validation result, and prompt version.

Raw prompt/response content:

- is not retained indefinitely by default
- is excluded from ordinary analytics
- has restricted access
- is redacted where feasible
- uses separately controlled debug retention
- does not duplicate user-authored content without purpose

Exact duration and deletion mechanics belong to Discussion 019 and legal/security review.

---

## 14. Retry, Idempotency, and Staleness

AI retries create proposal attempts, not canonical mutations.

Confirmed mutation requests must use deterministic idempotency protection.

Before commit:

- reload current canonical state
- revalidate permissions and consequences
- reject stale confirmation
- prevent duplicate entity creation or repeated lifecycle action

A retry must not substitute a different high-impact action merely because the original action failed.

---

## 15. Runtime Safety Controls

Required controls:

```txt
AI_GLOBAL_KILL_SWITCH
PLANNING_AI_KILL_SWITCH
RECONCILE_AI_TEXT_KILL_SWITCH
PROVIDER_SPECIFIC_KILL_SWITCH
READ_ONLY_DEGRADED_MODE
```

Kill switches must preserve access to user-owned data and manual product flows.

---

## 16. Accepted Findings

Claude findings resolved:

- `F1`: crisis policy now has an explicit Discussion 021 release gate
- `F2`: silent entity reclassification or downgrade is forbidden repair
- `F3`: manual fallback includes Restore Dropped Task
- `F4`: non-clinical wellbeing has explicit allowed and forbidden examples

Additional MVP decisions accepted:

- reject all partial AI responses
- prohibit free-text input to Reconcile AI
- add debt-repayment boundary examples
- preserve FACT and RULE_MATCH in degraded mode
- show a user-facing status for every flow-affecting AI failure

---

## 17. Mind Map Impact — Handoff to Discussion 022

### Product Vision

- the planner remains usable without AI
- AI receives minimum scoped context
- high-risk topics remain organizational, not diagnostic or advisory
- crisis safety is a release gate, not an aspirational note
- imported content never becomes authority

### MVP Core Loop

```txt
collect minimum scoped context
→ classify domain and permissions
→ request AI proposal
→ validate complete output
→ reject partial or semantically repaired output
→ show proposal or deterministic fallback
→ explicit confirmation
→ revalidate before commit
→ deterministic mutation
```

### User Flow

Add:

- retry or manual fallback
- rejected partial-output state
- deterministic Reconcile without AI explanation
- degraded-mode trust labels
- high-risk organization boundary
- crisis safety handoff gate
- Restore in manual execution fallback

### AI Responsibilities

- use minimum relevant context
- return complete schema-valid proposals
- avoid specialized high-risk advice
- treat imported content as untrusted data
- explain failure without claiming mutation

### AI Guardrails

- no partial PlanningDraft approval in MVP
- no free-text Reconcile context
- no semantic entity reclassification during repair
- no diagnosis from productivity history
- no crisis PlanningDraft
- no imported-content authority
- no silent flow-affecting failure

### Data Events for Discussion 019

```txt
AI_REQUEST_FAILED
AI_OUTPUT_REJECTED
AI_PARTIAL_OUTPUT_REJECTED
AI_SCHEMA_VALIDATION_FAILED
AI_DEGRADED_MODE_ENTERED
AI_KILL_SWITCH_CHANGED
MANUAL_FALLBACK_USED
CRISIS_SAFETY_FLOW_TRIGGERED
CRISIS_RELEASE_GATE_EVALUATED
HOSTILE_CONTENT_DETECTED
PROMPT_INJECTION_BLOCKED
```

### Traction and Guardrail Metrics

- AI fallback usage rate
- invalid-output rate
- partial-output rejection rate
- manual completion after AI failure
- Reconcile sessions completed without AI explanation
- secret-redaction incident rate
- unauthorized action rate, expected zero
- crisis draft generation rate, expected zero
- free-text Reconcile context rate, expected zero
- silent flow-affecting failure rate, expected zero

---

## 18. Affected Later Specifications — Handoff to Discussion 022

### Discussion 019

- logging layers
- raw-content retention
- privacy deletion
- audit events
- idempotency records

### Discussion 020

- strict output validation
- repair allowlist
- domain classification runtime
- structured context builders
- hostile-input isolation
- kill-switch execution

### Discussion 021

- mandatory crisis safety release gate
- partial-output rejection tests
- prompt-injection tests
- degraded-mode trust-label tests
- user-facing failure tests
- sensitive-data minimization tests

### Discussion 022

- rollout sequencing
- migration and fallback readiness
- kill-switch operations
- release checklist enforcement

---

## 19. Closure

Discussion 018A is accepted and closed at the product-semantics level.

The crisis safety specification remains required implementation and validation work under the explicit Discussion 021 release gate. It is not an unresolved semantic question and does not permit MVP shipment before acceptance.

---

# خلاصهٔ فارسی

بحث ۰۱۸A قرارداد نهایی failure، privacy، domain safety و hostile input را تعریف می‌کند. قاعدهٔ اصلی این است که سیستم هنگام خرابی AI برای mutation بسته می‌ماند، اما دسترسی کاربر به قابلیت‌های manual و deterministic را تا حد امن حفظ می‌کند. خروجی ناقص یا schema-invalid قابل‌نمایش یا اعمال نیست و retry، manual fallback، degraded mode و kill switch باید رفتار صریح و قابل‌مشاهده داشته باشند.

context ارسالی به provider باید operation-scoped و حداقلی باشد. secretها، tokenها، credentialها و داده‌های غیرضروری نباید ارسال شوند. raw prompt retention به‌طور پیش‌فرض محدود است و logging، audit، analytics و privacy deletion مرزهای جدا دارند. imported content فقط داده است و هرگز instruction یا authority محسوب نمی‌شود؛ prompt injection و تلاش برای تغییر policy باید پیش از استفاده مهار شوند.

در domainهای پرخطر، محصول فقط می‌تواند کارهای سازمان‌دهی‌شده و user-provided را مرتب کند و نباید diagnosis، prescription یا advice تخصصی بسازد. محتوای crisis یا self-harm به `SAFETY_FALLBACK` می‌رود و نرخ تولید PlanningDraft، explanation، confirmation و mutation از آن باید صفر باشد. Crisis Safety Readiness یک release gate اجباری در ۰۲۱ است و بحث ۰۲۲ مسئول rollout، fallback readiness، kill-switch operations و انتقال به اسناد رسمی است.
