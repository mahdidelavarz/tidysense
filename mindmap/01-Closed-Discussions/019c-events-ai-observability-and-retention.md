# Discussion 019C — Events, AI Observability, and Retention

## Status

Accepted and closed after GPT × Claude review and incorporation of the accepted AI context-scope observability amendment.

This document is the authoritative Discussion 019C resolution for events, AI observability, privacy boundaries, access, and retention.

Companion authoritative resolutions:

- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]] owns canonical entities and persistence invariants.
- [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]] owns mutation, concurrency, idempotency, and atomicity contracts.

Discussion 019C may refine their observability consequences but does not replace their domain or transaction authority.

---

## 1. Governing Persistence Separation

The product preserves four distinct persistence layers:

```txt
CANONICAL_DOMAIN_STATE
DOMAIN_AND_AUDIT_EVENTS
AI_OPERATIONAL_OBSERVABILITY
RAW_AI_CONTENT
```

These layers must not collapse into one generic event or JSON store.

```txt
canonical state
≠ historical event fact
≠ AI operational diagnostic
≠ raw prompt or response content
```

No observability layer may become a second mutable source of canonical truth.

---

## 2. Event Envelope

Durable domain and audit events use a provider-neutral envelope containing at least:

```txt
- eventId
- eventType
- eventVersion
- occurredAt
- recordedAt
- userId or workspaceId
- actor: USER | SYSTEM_DETERMINISTIC
- aggregateType
- aggregateId
- aggregateVersion
- transactionId
- correlationId
- causationId?
- commandId?
- proposalId?
- confirmationId?
- reconcileSessionId?
- ruleId?
- ruleVersion?
- payload
```

AI is never recorded as the authorizing actor of a canonical mutation.

AI proposal and explanation references may be linked, but mutation authority remains the user or an accepted deterministic system process.

---

## 3. Acceptance Is Not Application Success

A Reconcile recommendation outcome records the user decision only.

```txt
ACCEPTED | ACCEPTED_EDITED
→ proves user intent
→ does not prove canonical mutation success
```

Actual application success must be determined through the linked command result:

```txt
ReconcileRecommendation.resultingCommandId
→ CommandResult
→ SUCCEEDED | CONFLICTED | FAILED_FINAL | FAILED_RETRYABLE
```

Mandatory interpretation rule:

> `ACCEPTED` and `ACCEPTED_EDITED` must never be treated by UI, analytics, reporting, or audit review as proof that the recommendation was applied.

Examples:

```txt
outcome = ACCEPTED
commandResult = CONFLICT_STALE_VERSION
→ accepted by user
→ not applied
```

```txt
outcome = ACCEPTED_EDITED
commandResult = SUCCEEDED
→ accepted with edits
→ successfully applied
```

Metrics must remain separate:

- recommendation acceptance rate
- recommendation application-success rate
- accepted-but-conflicted rate
- accepted-but-failed rate
- edited-before-application rate

---

## 4. Recommendation Outcomes

Allowed decision outcomes:

```txt
ACCEPTED
ACCEPTED_EDITED
REJECTED
CANCELLED
EXPIRED_WITHOUT_DECISION
```

`IGNORED` is not a durable user decision because absence of action does not prove intent.

`EXPIRED_WITHOUT_DECISION` records only that the proposal expired without a captured decision.

---

## 5. PlanningDraft Persistence

PlanningDraft may be persisted temporarily for:

- crash recovery
- retry
- multi-device review
- stale-context detection
- revision history
- explicit approval linkage

PlanningDraft is not canonical product work.

```txt
PlanningDraft approval
→ validated command
→ canonical Goal, Project, Task, and Routine creation
```

A draft record includes at least:

```txt
- id
- userId
- status
- currentRevision
- createdAt
- updatedAt
- expiresAt
- sourceOperationId?
- schemaVersion
- contextFingerprint
```

Each revision preserves the complete bounded proposal snapshot rather than an ambiguous partial patch chain.

Draft content inherits the sensitive-data and minimization boundaries from Discussion 018A.

Partial AI output is not persisted as an approvable draft in MVP.

---

## 6. AI Proposal and Decision Records

AIProposal represents one validated proposal attempt or explanation artifact, not canonical state.

Minimum fields:

```txt
- id
- userId
- operationId
- proposalType
- proposalVersion
- status
- schemaVersion
- createdAt
- expiresAt?
- contextFingerprint
- resultingDraftId?
- reconcileSessionId?
```

Proposal item decisions record:

```txt
- proposalId
- proposalItemId
- affectedEntityIds
- decisionOutcome
- editedMaterialFields?
- decidedAt?
- resultingCommandId?
```

A proposal may expire without a decision.

A decision may exist without a successful command.

A successful command may only be claimed through durable command-result linkage.

---

## 7. ActionConfirmation

Every consequential confirmed action preserves:

```txt
- confirmationId
- userId
- actionType
- proposalId or previewId
- proposalVersion
- previewVersion
- affectedEntityIds
- expectedEntityVersions
- consequenceSummary or consequence codes
- reversible flag
- confirmedAt
- resultingCommandId?
```

Confirmation alone is not proof of commit.

```txt
confirmation
→ command
→ transaction result
→ domain/audit events
```

Stale or invalidated confirmation remains historical but cannot authorize a later mutation.

---

## 8. ReconcileSession Model

ReconcileSession is persisted explicitly because a session is a bounded product interaction with deterministic facts, grouped recommendations, user decisions, conflicts, and completion state.

Minimum fields:

```txt
- id
- userId
- openedAt
- completedAt?
- status: OPEN | COMPLETED | ABANDONED | EXPIRED
- triggerType
- rulesCatalogVersion
- localDate
- timezone
- factSnapshotVersion
- degradedMode
```

The session contains or links to:

- ReconcileFact
- RuleMatch
- ReconcileGroup
- ReconcileRecommendation
- ProposalItemDecision
- resulting commands

A session does not become canonical execution truth. It preserves what was observed, offered, and decided at that time.

---

## 9. Reconcile Facts and Rule Matches

ReconcileFact preserves deterministic structured evidence:

```txt
- sessionId
- factType
- entityType
- entityId
- observedMetrics
- reasonCodes
- evidenceQuality
- factVersion
```

RuleMatch preserves:

```txt
- sessionId
- ruleId
- ruleVersion
- affectedEntityIds
- matchedAt
- allowedActionTypes
- consequenceCodes
```

Free-text notes and descriptions remain excluded from Reconcile AI and rule matching in MVP.

---

## 10. AI Operational Record

AIOperation records provider-neutral operational metadata:

```txt
- operationId
- userId
- operationType
- providerKey
- modelKey
- modelVersion?
- promptTemplateId
- promptTemplateVersion
- contextBuilderKey
- contextBuilderVersion
- contextScopeManifestId?
- schemaVersion
- rulesCatalogVersion?
- startedAt
- completedAt?
- latencyMs?
- inputTokenCount?
- outputTokenCount?
- status
- failureCategory?
- degradedMode
- correlationId
```

Domain tables must not depend on provider-specific model names.

Provider and model metadata belong to operational observability and proposal provenance, not canonical entity semantics.

### 10.1 AI Context Scope Manifest

Every Planning and Reconcile AI operation records the logical key and version of the deterministic context builder that produced its request. These identifiers remain provider-neutral unless a provider name is already part of provider-neutral runtime configuration metadata.

The optional linked record is:

```txt
AIContextScopeManifest
- id
- aiOperationId
- builderKey
- builderVersion
- operationType
- includedContextCategories[]
- includedEntityTypes[]
- includedEntityCount
- includedFieldGroups[]
- excludedSensitiveCategories[]
- freeTextIncluded
- importedContentIncluded
- createdAt
```

The manifest records scope metadata only: which categories and field groups were included or excluded, not their actual content. It must not duplicate raw prompts, raw responses, entity descriptions, user-authored notes, imported documents, canonical entity snapshots, authentication material, or secrets.

Required invariants:

- Reconcile MVP operations record `freeTextIncluded = false` and `importedContentIncluded = false`.
- Planning operations record only the categories actually supplied.
- The manifest records an already-authorized context-building result; it never grants permission to send data.
- Missing manifest data must not cause the runtime to broaden context silently.
- Scope metadata must match the categories present in the constructed DTO.
- Context scope metadata inherits the access and retention boundaries of AIOperation metadata.
- Raw-content retention rules remain unchanged.

`AIContextScopeManifest` uses retention class R4 and the same least-privilege access boundary as AIOperation metadata. Restricted engineering and safety-review roles may use it for privacy verification, context regression analysis, incident investigation, and version comparison. It is not an ordinary analytics dimension for reconstructing sensitive user behavior.

---

## 11. Generic Update Events

Generic events such as:

```txt
TASK_UPDATED
PROJECT_UPDATED
GOAL_UPDATED
ROUTINE_UPDATED
```

are forbidden unless they include structured, meaningful field-change information.

Allowed pattern:

```txt
TASK_UPDATED
changedFields:
  - field: reviewDate
    before: 2026-08-01
    after: 2026-08-20
    sourceBefore: SYSTEM_DEFAULT
    sourceAfter: USER
```

Rules:

- include only fields that actually changed
- use before/after values only where non-sensitive and proportionate
- redact sensitive content
- use reason codes when raw values are inappropriate
- never duplicate the entire entity snapshot
- never include raw note or description content by default

For lifecycle, ownership, temporal, protection, and other materially consequential changes, semantic events are preferred:

```txt
TASK_PLANNED_DATE_CHANGED
TASK_REVIEW_DATE_CHANGED
TASK_MOVED_TO_BACKLOG
TASK_REPARENTED
ROUTINE_RECURRENCE_CHANGED
GOAL_TARGET_DATE_CHANGED
PROTECTION_CHANGED
```

`*_UPDATED` without `changedFields` is invalid.

---

## 12. Lifecycle Event Taxonomy

Minimum semantic lifecycle events include:

### Goal

```txt
GOAL_CREATED
GOAL_ACHIEVED
GOAL_ABANDONED
GOAL_CONTINUATION_CONFIRMED
GOAL_REVIEW_DEFERRED
```

### Project

```txt
PROJECT_CREATED
PROJECT_COMPLETED
PROJECT_STOPPED
PROJECT_TERMINAL_STAGING_STARTED
PROJECT_TERMINAL_STAGING_CONFLICTED
```

### Task

```txt
TASK_CREATED
TASK_COMPLETED
TASK_DROPPED
TASK_RESTORED
TASK_CARRIED
TASK_REPLANNED
TASK_MOVED_TO_BACKLOG
TASK_SPLIT
TASK_REPARENTED
```

### Routine

```txt
ROUTINE_CREATED
ROUTINE_STOPPED
ROUTINE_CONTINUATION_CREATED
ROUTINE_RECURRENCE_CHANGED
```

### RoutineOccurrence

```txt
ROUTINE_OCCURRENCE_CREATED
ROUTINE_OCCURRENCE_EXPOSED
ROUTINE_OCCURRENCE_DONE
ROUTINE_OCCURRENCE_MISSED
ROUTINE_OCCURRENCE_CORRECTED
ROUTINE_OCCURRENCE_INVALIDATED
ROUTINE_OCCURRENCE_REMOVED_BEFORE_EXPOSURE
```

### Planning and confirmation

```txt
PLANNING_DRAFT_CREATED
PLANNING_DRAFT_REVISED
PLANNING_DRAFT_EXPIRED
ACTION_PREVIEWED
ACTION_CONFIRMED
CONFIRMATION_INVALIDATED
ACTION_CANCELLED
```

### Reconcile

```txt
RECONCILE_SESSION_OPENED
RECONCILE_RULE_MATCHED
RECONCILE_RECOMMENDATION_PRESENTED
RECONCILE_RECOMMENDATION_DECIDED
RECONCILE_SESSION_COMPLETED
RECONCILE_SESSION_EXPIRED
```

---

## 13. Cascade Event Model

Parent terminal cascades produce:

```txt
1 parent transition event
+ 1 child lifecycle event per changed child
+ shared cascadeId or transactionId
```

Example:

```txt
PROJECT_COMPLETED
ROUTINE_STOPPED
ROUTINE_STOPPED
```

All share the same transaction and cascade correlation.

A single parent event must not hide which child Routines actually changed.

Child events must not imply separate user authorization when they were deterministic consequences of a confirmed parent action.

---

## 14. Transactional Outbox

Canonical mutation and durable event intent share one database transaction.

```txt
domain mutation
+ audit/domain event record
+ outbox intent
→ one commit
```

Outbox delivery may retry idempotently.

Operational delivery events such as `OUTBOX_DELIVERY_RETRIED` do not become canonical domain history.

---

## 15. Failure and Degraded-Mode Observability

Operational failure events include:

```txt
AI_REQUEST_FAILED
AI_OUTPUT_REJECTED
AI_PARTIAL_OUTPUT_REJECTED
AI_SCHEMA_VALIDATION_FAILED
AI_DEGRADED_MODE_ENTERED
AI_KILL_SWITCH_CHANGED
MANUAL_FALLBACK_USED
PROMPT_INJECTION_BLOCKED
HOSTILE_CONTENT_DETECTED
```

Operational records may preserve category and diagnostic metadata but must not preserve raw sensitive content by default.

A user-facing failure message and internal failure category remain separate concerns.

`COMMAND_RECEIVED`, transaction retries, deadlock retries, and `TRANSACTION_ROLLED_BACK` remain operational observability unless they correspond to a durable user decision or canonical fact.

---

## 16. Hostile Content Observability

Hostile-input events may record:

- source type
- detection category
- bounded reason code
- blocked action type
- operation ID
- whether any external or canonical action occurred

They must not preserve the full hostile prompt, email, note, document, or URL content by default.

```txt
PROMPT_INJECTION_BLOCKED
→ record bounded metadata
→ raw hostile text excluded unless restricted debugging policy explicitly permits it
```

Hostile-content events must not be used to label a user as malicious.

---

## 17. Crisis Safety Observability

Crisis-related observability is limited to the minimum required for safety validation, incident review, and legally justified operation.

Potential events:

```txt
CRISIS_SAFETY_FLOW_TRIGGERED
CRISIS_RESOURCE_SELECTION_FAILED
CRISIS_LOCATION_UNAVAILABLE
CRISIS_PROVIDER_REFUSAL_RECEIVED
CRISIS_RELEASE_GATE_EVALUATED
```

Forbidden persisted conclusions:

```txt
userIsHighRisk
userHasMentalIllness
crisisSeverityScore inferred from productivity data
```

### 17.1 Restricted Access and Aggregation Rule

All `CRISIS_*` events belong to:

```txt
retention class: R5
access class: SECURITY_RESTRICTED
```

They must never be available to ordinary product analytics, growth analytics, recommendation systems, user segmentation, experimentation pipelines, or general support tooling.

Outside the restricted safety/legal access class, crisis events must not be:

- joined by user ID
- counted per user
- aggregated across users
- used for cohort creation
- used for personalization
- used for model features
- used to derive behavioral or psychological labels

Forbidden example:

```sql
SELECT user_id, COUNT(*)
FROM crisis_events
GROUP BY user_id;
```

Any trend analysis or cross-user aggregation requires:

- explicit legal review
- explicit safety review
- documented approved purpose
- minimum necessary fields
- aggregation thresholds or de-identification where appropriate
- access logging
- retention justification
- time-bounded approval

The same governance required for retaining crisis events applies to analyzing them.

This section is governed together with the access boundaries in Section 25.

---

## 18. RoutineOccurrence Exposure

An occurrence is exposed only when returned in a user-visible execution response.

Exposure is represented through:

```txt
ROUTINE_OCCURRENCE_EXPOSED
```

A projection such as `firstExposedAt` may be maintained for efficient policy enforcement.

The projection is derived from durable exposure history and is not a replacement for the event.

Never-exposed invalid future occurrences may be physically removed under Discussion 019B.

Previously exposed occurrences preserve identity and receive an explicit invalidation event.

---

## 19. Retention Classes

Retention classes define purpose and access boundaries. Exact durations remain subject to legal/security review.

```txt
R1 — CANONICAL_AUDIT
R2 — PRODUCT_SESSION_HISTORY
R3 — TEMPORARY_DRAFT
R4 — OPERATIONAL_DIAGNOSTICS
R5 — SECURITY_RESTRICTED
R6 — RAW_AI_CONTENT
```

### R1 — CANONICAL_AUDIT

For durable user decisions, canonical lifecycle history, confirmation, and material mutation evidence.

### R2 — PRODUCT_SESSION_HISTORY

For bounded product interaction history such as Reconcile sessions, facts, and recommendation decisions.

### R3 — TEMPORARY_DRAFT

For unapproved PlanningDraft revisions and recoverable proposal state.

### R4 — OPERATIONAL_DIAGNOSTICS

For provider-neutral AI operations, failures, outbox delivery, latency, and schema-validation diagnostics.

### R5 — SECURITY_RESTRICTED

For crisis and narrowly justified security-sensitive events with restricted access and special governance.

### R6 — RAW_AI_CONTENT

For raw prompt/response content. Disabled or very short-lived by default, separately controlled, access-restricted, and excluded from ordinary analytics.

---

## 20. Record-to-Retention Mapping

Every persisted record type must have an explicit retention class.

| Record or Event Type | Retention Class | Notes |
|---|---|---|
| Canonical lifecycle event | R1 | Durable user/account history |
| Material semantic field-change event | R1 | Redacted where necessary |
| ActionConfirmation | R1 | Decision and preview linkage |
| Confirmation invalidation | R1 | Preserves stale-consent history |
| ProposalItemDecision linked to committed mutation | R1 | User decision evidence |
| ProposalItemDecision without commit | R2 | Product interaction history |
| PlanningDraft | R3 | Temporary and expiring |
| PlanningDraftRevision | R3 | Same expiry family as draft |
| AIProposal | R2 or R3 | R3 for planning draft proposal; R2 for Reconcile history |
| ReconcileSession | R2 | Bounded session history |
| ReconcileFact | R2 | Structured deterministic evidence |
| RuleMatch | R2 | Rule/version provenance |
| ReconcileGroup | R2 | Session grouping |
| ReconcileRecommendation | R2 | Decision and command linkage |
| AIOperation metadata | R4 | No raw content by default |
| AIContextScopeManifest | R4 | Categories and counts only; no raw context |
| AI failure operational record | R4 | Internal category and diagnostics |
| Outbox delivery record | R4 | Delivery mechanics, not domain truth |
| Idempotency record | R4 | Operational replay boundary |
| Hostile-content detection event | R4 | No raw hostile text by default |
| Prompt-injection blocked event | R4 | Bounded metadata |
| Crisis safety event | R5 | SECURITY_RESTRICTED |
| Crisis access audit record | R5 | Access accountability |
| Raw prompt/response | R6 | Disabled or short-lived by default |
| RoutineOccurrence exposure event | R1 | Affects deletion/invalidation policy |
| Exposure projection | R1 or R2 | Must remain derivable from exposure event |
| Analytics aggregate | Separate governed dataset | Versioned definition and no canonical authority |

No persisted record may remain without an assigned retention class.

---

## 21. Raw AI Content Boundary

Raw prompt and response content:

- is not required for canonical audit
- is excluded from ordinary analytics
- is not retained indefinitely
- is disabled or short-lived by default
- has restricted access
- requires redaction where feasible
- must not duplicate unrelated user content
- must not contain secrets intentionally

If raw content is deleted, durable structured facts and operational metadata may remain according to their own retention classes.

---

## 22. Privacy Deletion and Immutable History

Privacy deletion must distinguish:

- removable raw content
- removable drafts
- operational metadata eligible for deletion or anonymization
- legally required audit history
- security-restricted records

Where audit history must remain, direct identifiers may be tombstoned or anonymized according to accepted policy without rewriting the historical fact.

```txt
historical event preserved
→ user identifier replaced by approved tombstone identity
→ raw sensitive content removed
```

Exact legal basis, duration, and deletion mechanics remain subject to legal/security review.

---

## 23. Derived Analytics Boundary

Analytics may derive execution and product-use summaries, including:

- Task completion counts
- Carry counts
- Routine occurrence completion rates
- proposal acceptance rates
- application-success rates
- conflict rates
- fallback rates
- draft edit-before-approval rates

Derived summaries must preserve:

```txt
metricDefinitionVersion
sourceEventVersion
calculationWindow
calculatedAt
```

Forbidden analytical claims include:

- universal Goal-progress percentage
- inferred Goal achievement
- diagnosis or psychological state
- hidden motivation or capacity score
- crisis-risk profiling
- treating acceptance as successful application

Analytics datasets are rebuildable projections, not canonical truth.

---

## 24. Minimum Index and Uniqueness Requirements

Correctness-critical uniqueness includes:

```txt
UNIQUE(eventId)
UNIQUE(userId, confirmationId)
UNIQUE(userId, proposalId, proposalItemId)
UNIQUE(operationId)
UNIQUE(outboxMessageId)
```

Recommended performance indexes include:

```txt
(userId, occurredAt DESC)
(aggregateType, aggregateId, occurredAt)
(transactionId)
(correlationId)
(commandId)
(proposalId)
(reconcileSessionId)
(operationType, startedAt)
(status, expiresAt)
(retentionClass, expiresAt)
```

Crisis/security tables require separate restricted access paths and must not be exposed through ordinary analytics indexes or replicas.

---

## 25. Access Boundaries

### Product and support access

May access canonical state and approved user-visible history required to operate the product.

### Engineering operational access

May access R4 metadata under least privilege, without unrestricted raw user content.

Context Scope Manifests are limited to approved privacy verification, context regression, incident investigation, and builder-version comparison purposes.

### Analytics access

May access approved de-identified or minimized R1/R2 projections.

Must not access R5 crisis records or R6 raw AI content by default.

Context Scope Manifests are not ordinary analytics dimensions and must not be used to reconstruct sensitive user behavior.

### Security and safety restricted access

May access R5 only for approved incident, safety-validation, legal, or security purposes.

Every access must be logged and purpose-scoped.

### Raw-content debugging access

May access R6 only through explicit, temporary, audited authorization.

---

## 26. Accepted Claude Findings

Resolved findings:

- `F1`: recommendation acceptance is explicitly separated from command application success
- `F2`: crisis events cannot be joined, counted, aggregated, segmented, or used outside restricted safety/legal governance
- `F3`: generic `*_UPDATED` events require structured `changedFields`, while material changes prefer semantic events
- `F4`: every introduced persisted record type is mapped to a retention class

No blocking finding remains.

---

## 27. Mind Map Impact

### Product Vision

- product decisions remain explainable through structured history
- AI observability does not become a second source of product truth
- user acceptance is distinguished from successful application
- sensitive safety events are not repurposed for behavioral profiling
- raw AI content is minimized and separately governed

### MVP Core Loop

```txt
AI operation or deterministic flow
→ validated proposal/facts
→ user decision
→ command
→ atomic mutation + durable event intent
→ command result
→ honest analytics projection
```

### User Flow

Add:

- accepted-but-not-applied state
- accepted-and-conflicted state
- proposal expiration without fabricated decision
- explainable semantic field-change history
- draft recovery and expiry
- Reconcile session history

### AI Responsibilities

- produce provider-neutral proposal provenance
- preserve rule and schema versions
- avoid raw-content persistence unless explicitly allowed
- never represent acceptance as committed success
- never use crisis observability for personalization or profiling

### AI Guardrails

- no AI actor as mutation authority
- no generic update event without changed fields
- no ordinary analytics access to crisis events
- no raw hostile or crisis content in ordinary operational records
- no `IGNORED` decision inferred from silence
- no Goal progress or psychological inference from observability data

### Data Events

Add or stabilize:

```txt
RECONCILE_RECOMMENDATION_DECIDED
COMMAND_CONFLICTED
COMMAND_SUCCEEDED
TASK_REVIEW_DATE_CHANGED
TASK_PLANNED_DATE_CHANGED
ROUTINE_OCCURRENCE_EXPOSED
CRISIS_SAFETY_FLOW_TRIGGERED
PROMPT_INJECTION_BLOCKED
```

### Traction and Guardrail Metrics

- recommendation acceptance rate
- recommendation application-success rate
- accepted-but-conflicted rate
- accepted-but-failed rate
- proposal expiration rate
- raw-content access count
- unauthorized R5 access rate, expected zero
- crisis-profile derivation rate, expected zero
- generic update event without changedFields, expected zero
- record types without retention class, expected zero

### Current Decisions

- ReconcileSession is explicit and persisted
- PlanningDraft is temporary and persisted with expiry
- acceptance and application success are separate facts
- transactional outbox preserves durable event intent
- provider-neutral AI operation metadata is required
- Planning and Reconcile operations record context-builder identity and content-free Context Scope Manifests
- crisis observability uses restricted access and analysis governance
- semantic event history is preferred over opaque update noise

---

## 28. Affected Later Specifications

### Discussion 020

- event-envelope implementation
- structured proposal and session records
- changedFields and semantic event emitters
- restricted crisis storage and access paths
- raw-content redaction and versioned context builders
- APIs must not expose the full Context Scope Manifest to ordinary clients

### Discussion 021

- event completeness tests
- acceptance-versus-application tests
- crisis access and aggregation prohibition tests
- retention-class coverage tests
- raw-content leakage tests
- changedFields regression tests
- proposal/session linkage tests
- context-builder version and Context Scope Manifest correctness tests
- Reconcile free-text and imported-content exclusion tests

### [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]]

- retention jobs and expiry sequencing
- outbox rollout
- migration of event versions
- access-control rollout
- analytics projection backfill
- crisis restricted-data operational checklist

Potential ADRs:

- four-layer persistence separation
- explicit ReconcileSession persistence
- temporary PlanningDraft persistence
- acceptance-versus-application distinction
- transactional outbox for durable event intent
- restricted crisis observability governance
- semantic events and structured changedFields
- retention-class assignment for all observability records

---

## 29. Closure

Discussion 019C is closed at the product-semantics and persistence-contract level.

Discussion 019 is now closed across:

```txt
019A — canonical data model and invariants
019B — transactions, concurrency, and idempotency
019C — events, AI observability, and retention
```

Exact SQL, ORM mapping, duration values, legal bases, infrastructure choices, and implementation sequencing remain work for Discussions 020–022 and legal/security review. They may not weaken the accepted boundaries in this resolution.

The former AI context-scope observability amendment is fully incorporated into Sections 10, 20, 25, 27, and 28 of this resolution and no longer requires a separate governing file.

---

## خلاصهٔ فارسی

این بحث قرارداد نهایی رویدادها، داده‌های عملیاتی AI، حریم خصوصی، سطح دسترسی و نگه‌داری داده را مشخص می‌کند. وضعیت مرجع دامنه، تاریخچهٔ رویدادها، observability عملیاتی AI و محتوای خام AI چهار لایهٔ جدا هستند و هیچ‌کدام نباید به منبع حقیقت دیگری تبدیل شوند. پذیرش پیشنهاد با موفقیت اجرای فرمان یکسان نیست و تاریخچه باید تعارض، شکست و انقضای پیشنهاد را صادقانه ثبت کند.

برای هر نوع رکورد یک کلاس نگه‌داری مشخص شده است. محتوای خام AI به‌طور پیش‌فرض ذخیره نمی‌شود یا عمر بسیار کوتاه و دسترسی محدود دارد؛ داده‌های بحران و امنیت نیز مسیر دسترسی و حاکمیت جدا دارند و برای تحلیل رفتاری یا شخصی‌سازی قابل استفاده نیستند.

هر عملیات Planning و Reconcile کلید و نسخهٔ context builder را ثبت می‌کند. Context Scope Manifest فقط دسته‌ها، تعدادها و گروه فیلدهای استفاده‌شده را ثبت می‌کند و شامل متن واقعی prompt، پاسخ، توضیحات، یادداشت‌ها یا محتوای واردشده نیست. در Reconcile MVP استفاده از متن آزاد و محتوای واردشده صریحاً ممنوع و قابل آزمون است.
