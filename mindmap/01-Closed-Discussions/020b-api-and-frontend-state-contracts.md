# Discussion 020B — API and Frontend State Contracts

## Status

Accepted and closed.

This resolution is authoritative for API resource boundaries, frontend state semantics, confirmation flow, polling, conflict refresh, cancellation, and client-side recovery behavior.

Accepted dependencies:

- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
- [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]

Companion authoritative resolution:

- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]

---

## 1. Governing API Principle

The client may request, review, edit, acknowledge, confirm, cancel, refresh, and display results.

The client is never the authority for:

- canonical state
- consequence calculation
- authorization
- expected entity versions
- warning meaning
- mutation eligibility
- command success

The authoritative flow is:

```txt
PlanningAttempt or ReconcileSession
→ server-validated reviewable result
→ user review/edit
→ server-generated ActionConfirmation
→ explicit confirmation submission
→ deterministic command handler
→ authoritative CommandResult
```

User acceptance, draft linkage, confirmation submission, and command success are separate facts.

---

## 2. Accepted Resource Model

The transport contract exposes these distinct resources:

- `PlanningAttempt`
- `PlanningDraft`
- `ReconcileSession`
- `ActionConfirmation`
- `CommandResult`

No generic `WorkflowRun` abstraction is introduced for MVP.

Each resource has its own lifecycle and must not duplicate another resource's authority.

---

## 3. PlanningAttempt Contract

### 3.1 Required client identity

Creating a PlanningAttempt requires:

```txt
clientAttemptId
```

`clientAttemptId` is mandatory because starting a PlanningAttempt may invoke a paid external model.

Uniqueness:

```txt
UNIQUE(userId, clientAttemptId)
```

The server also records a normalized request hash.

Behavior:

```txt
same clientAttemptId + same normalized request hash
→ return existing PlanningAttempt

same clientAttemptId + different normalized request hash
→ reject with idempotency mismatch
```

A reconnect, browser retry, or duplicate click must never create a second provider invocation for the same client attempt identity.

### 3.2 PlanningAttempt lifecycle

Accepted states:

```txt
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

A successful attempt may reference a validated PlanningDraft.

Partial provider output is never exposed as a reviewable state.

---

## 4. PlanningDraft Contract

### 4.1 Draft lifecycle only

Accepted `PlanningDraft.status` values:

```txt
REVIEWABLE
SUPERSEDED
EXPIRED
CANCELLED
```

`CONFIRMED` is forbidden as a PlanningDraft lifecycle state.

The draft status describes only the lifecycle of the draft itself.

### 4.2 Confirmation linkage

A PlanningDraft may expose:

```txt
linkedConfirmationId?
```

This means only that an ActionConfirmation resource exists for that draft revision.

It does not prove:

- confirmation submission
- command execution
- command success
- canonical mutation

The client must read the linked ActionConfirmation and CommandResult to determine execution outcome.

### 4.3 Immutable revisions

Draft revisions are immutable.

Editing a draft creates a new revision and supersedes the prior revision.

A confirmation is bound to one exact draft revision.

A confirmation created for one revision cannot be submitted against another revision.

---

## 5. ReconcileSession Contract

ReconcileSession exposes deterministic facts and rule matches independently from optional AI explanation.

Accepted high-level states include:

```txt
RUNNING
FACTS_READY
COMPLETE
FAILED
CANCELLED
```

If deterministic Reconcile fails:

```txt
ReconcileSession.status = FAILED
→ no AI fallback over raw data
→ no improvised summary
→ Today and manual execution remain available
```

If deterministic facts succeed but AI explanation is unavailable:

```txt
FACTS_READY
→ deterministic facts and rule matches remain usable
→ explanation may be absent
```

Recommendation acceptance and resulting command status remain separate fields.

---

## 6. ActionConfirmation Contract

ActionConfirmation is a server-generated, version-bound preview of a deterministic command.

It includes or references:

- exact selected entity IDs
- expected entity versions
- command type
- draft or recommendation identity
- consequence preview
- warning set
- preview hash
- expiry
- submission status
- linked CommandResult when resolved

Accepted lifecycle:

```txt
CREATED
SUBMITTED
RESOLVED
EXPIRED
CANCELLED
```

`SUBMITTED` does not mean success.

### 6.1 Client authority boundary

The client may send only:

- ActionConfirmation identity
- explicit user confirmation intent
- exact warning acknowledgements
- idempotency key for command submission

The client may not redefine:

- consequences
- entity versions
- affected entity set
- warnings
- command payload semantics

The server reloads and revalidates before commit under Discussion 019B.

---

## 7. Versioned Warning Acknowledgement

Raw warning codes are insufficient acknowledgement identity.

Each warning contains:

```txt
ConfirmationWarning
- warningId
- code
- severity
- messageKey
- normalizedParameters
- affectedEntityIds
- relevantEntityVersions
- policyOrRuleVersion
- warningHash
```

Acknowledgement contains:

```txt
AcknowledgedWarning
- warningId
- warningHash
```

The warning hash is deterministic over warning meaning, not localized display text.

A changed translation, punctuation mark, or UI wording does not invalidate acknowledgement.

A change in severity, normalized parameters, affected entities, relevant versions, or policy/rule version does invalidate acknowledgement.

Rule:

```txt
acknowledged warningHash != current warningHash
→ ActionConfirmation is stale
→ no command submission
→ regenerate preview
→ require fresh acknowledgement
```

The same warning code may represent materially different warnings over time and must not reuse old acknowledgement.

---

## 8. Command Submission and Idempotency

Consequential command submission requires an idempotency key.

Behavior follows Discussion 019B:

```txt
same key + same request hash
→ return prior result

same key + different request hash
→ reject
```

The command response is synchronous for MVP when the deterministic transaction completes within the accepted request boundary.

The authoritative result is `CommandResult`.

Accepted result categories include:

```txt
SUCCEEDED
CONFLICTED
FAILED
```

A recommendation outcome such as `ACCEPTED` or a draft linkage never substitutes for CommandResult.

---

## 9. Lost Idempotency Identity Recovery

If the client loses the command idempotency key or cannot determine whether submission occurred, it must not immediately resubmit.

Required recovery flow:

```txt
GET ActionConfirmation
→ inspect submission status
→ inspect linked CommandResult if present
```

Behavior:

```txt
CommandResult = SUCCEEDED
→ render authoritative success

CommandResult = CONFLICTED or FAILED
→ render authoritative failure and refresh path

ActionConfirmation = SUBMITTED with no final result yet
→ continue polling

ActionConfirmation has not been submitted
→ create a new command idempotency key and submit once
```

This contract prevents duplicate mutation when local client storage is lost or corrupted.

---

## 10. Conflict and Refresh Contract

A stale confirmation never auto-rebases.

Conflict response includes privacy-safe deterministic context sufficient to refresh.

Flow:

```txt
CONFLICT_STALE_VERSION
→ preserve user-authored input locally
→ fetch current authoritative resources
→ regenerate draft or confirmation preview
→ show changed consequences
→ require explicit confirmation again
```

The client must not semantically merge stale AI output into current canonical state automatically.

---

## 11. Bulk Command Contract

Bulk actions are all-or-nothing for MVP.

The confirmation binds:

- exact selected IDs
- expected versions for every selected item
- one shared consequence preview
- exact warning identities and hashes

If any item becomes stale, invalid, protected, unauthorized, or otherwise ineligible:

```txt
entire bulk command fails
→ no selected item mutates
→ refreshed preview required
```

Partial bulk success is not exposed as an accepted client state.

---

## 12. Polling Contract

Polling is the primary MVP transport for PlanningAttempt and ReconcileSession progress.

The client polls by stable resource ID.

Polling responses are complete resource snapshots and may include revision/version or ETag-style metadata.

Reconnect behavior:

```txt
reconnect
→ fetch existing resource by ID
→ do not create a new attempt
```

Token streaming and partial reviewable output are not supported in MVP.

---

## 13. Cancellation Contract

Cancellation is distinct from timeout, provider failure, and user abandonment.

For PlanningAttempt or ReconcileSession:

```txt
user cancellation
→ resource becomes CANCELLED
→ late provider result is discarded
→ no new draft revision
→ no explanation attachment
→ operational completion may be logged
```

Cancellation does not require a separate mutation-style idempotency key, but repeated cancellation requests must be harmless.

A timed-out or failed provider attempt is not reported as user cancellation.

---

## 14. Error Envelope

The API distinguishes at least:

- malformed request
- validation failure
- authorization failure
- not found within user scope
- stale-version conflict
- idempotency mismatch
- provider unavailable
- provider timeout
- deterministic processing failure
- user cancellation
- expired resource

HTTP mapping follows the accepted contract:

```txt
400 → malformed transport request
401/403 → authentication or authorization failure
404 → resource unavailable within user scope
409 → concurrency or idempotency conflict
422 → semantically invalid request
429 → rate limit
5xx/503 → server or provider availability failure
```

The error envelope carries a stable machine code, user-safe message key, correlation ID, retryability, and privacy-safe details.

---

## 15. Frontend State Contract

### 15.1 Planning states

The frontend distinguishes:

```txt
input
submitting attempt
queued
running
reviewable draft
editing revision
creating confirmation
awaiting warning acknowledgement
submitting command
command succeeded
command conflicted
command failed
attempt failed
cancelled
expired
```

There is no generic green `confirmed` state derived from PlanningDraft.

### 15.2 Reconcile states

The frontend distinguishes:

```txt
loading deterministic facts
facts ready without explanation
facts plus explanation ready
recommendation review
creating confirmation
submitting command
accepted but conflicted
command succeeded
reconcile unavailable
cancelled
```

### 15.3 User-input preservation

User-authored planning input and accepted edits are preserved across retryable failures according to Discussion 019C retention and privacy boundaries.

Preservation does not make stale input authoritative.

---

## 16. Security and Ownership

Every resource read and mutation is scoped by authenticated user/workspace.

Clients cannot enumerate another user's PlanningAttempt, PlanningDraft, ReconcileSession, ActionConfirmation, or CommandResult.

Conflict details expose only data already authorized for the authenticated user.

---

## 17. Required Tests

At minimum, implementation must test:

- duplicate PlanningAttempt creation with same clientAttemptId
- same clientAttemptId with different request hash
- no duplicate provider invocation after reconnect
- PlanningDraft never exposes `CONFIRMED` lifecycle state
- linkedConfirmationId does not render command success
- warning code reused with changed warning hash
- stale warning acknowledgement rejection
- lost command idempotency key recovery through ActionConfirmation
- stale confirmation conflict and explicit refresh
- bulk all-or-nothing rejection
- cancellation followed by late provider completion
- deterministic Reconcile failure without AI fallback
- facts-only degraded Reconcile response
- accepted recommendation with conflicted command
- authorization isolation across all API resources

---

## 18. Mind Map Impact

### MVP Core Loop

```txt
start idempotent attempt
→ poll complete resource
→ review immutable draft/session result
→ create server-authoritative confirmation
→ acknowledge exact warnings
→ submit idempotent deterministic command
→ read authoritative CommandResult
```

### User Flow

Add explicit states for:

- reviewable versus superseded draft
- confirmation created versus command applied
- warning acknowledgement refresh
- accepted-but-conflicted recommendation
- lost-response and lost-idempotency recovery
- facts-only Reconcile mode

### AI Guardrails

- partial output is never reviewable
- client consequences are never trusted
- stale confirmation never auto-rebases
- cancellation discards late AI results
- AI acceptance never implies canonical mutation

### Current Decisions

- polling for PlanningAttempt and ReconcileSession
- synchronous deterministic command result for MVP
- mandatory clientAttemptId for paid AI generation
- immutable PlanningDraft revisions
- server-generated ActionConfirmation
- versioned warning acknowledgements
- all-or-nothing bulk commands
- explicit conflict refresh

### Data and Observability

Record or link:

- clientAttemptId and normalized request hash
- ActionConfirmation lifecycle
- warning identity and warning hash
- command idempotency and CommandResult
- accepted-but-conflicted outcomes
- cancellation and late-result discard

---

## 19. Affected Later Discussions

[[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls|Discussion 020C]] defines reliability thresholds and validation behavior without changing these API semantics.

[[01-Closed-Discussions/021-validation-plan-and-decision-gates|Discussion 021]] must include contract, concurrency, reconnect, cancellation, warning-staleness, and duplicate-invocation tests.

[[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]] must sequence deployment of new resource contracts and client migration safely.

---

## 20. Closure

Discussion 020B is accepted and closed.

No review-stage proposal is required as a separate governing or historical document.

---

## خلاصهٔ فارسی

این بحث قرارداد نهایی API و stateهای frontend را تعریف می‌کند. PlanningAttempt، PlanningDraft، ReconcileSession و ActionConfirmation منابع جدا با هویت و چرخهٔ عمر روشن هستند. کاربر می‌تواند درخواست، بازبینی، ویرایش، تأیید، لغو و refresh انجام دهد، اما client هیچ‌گاه مرجع مجوز، consequence، نسخهٔ معتبر یا mutation دامنه نیست.

خروجی ناقص AI قابل بازبینی نیست، تأیید قدیمی به‌طور خودکار rebase نمی‌شود و نتیجهٔ دیررس پس از لغو کنار گذاشته می‌شود. polling قرارداد MVP است؛ commandها از expected version و idempotency استفاده می‌کنند؛ عملیات گروهی همه یا هیچ هستند؛ و وضعیت‌های accepted، conflicted، failed و applied به‌صورت صریح از یکدیگر جدا می‌شوند.
