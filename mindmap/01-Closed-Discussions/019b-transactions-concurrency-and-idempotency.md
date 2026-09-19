# Discussion 019B — Transactions, Concurrency, and Idempotency

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative Discussion 019B resolution for mutation transactions, concurrency, idempotency, lock ordering, bulk atomicity, and durable event intent.

Accepted dependencies:

- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]
- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]

---

## 1. Governing Mutation Contract

Every consequential command follows:

```txt
receive command
→ identify authenticated user/workspace
→ claim or resolve idempotency identity
→ load current canonical state
→ validate authorization and invariants
→ compare expected versions
→ revalidate preview assumptions and consequences
→ execute the smallest coherent atomic mutation
→ write durable audit/event intent in the same transaction
→ commit
→ return current authoritative result
```

Generated text is never transaction authority.

A consequential mutation either commits coherently or leaves canonical state unchanged.

---

## 2. Concurrency Strategy

### 2.1 Optimistic Concurrency by Default

Every mutable canonical entity carries a `version` or database-native concurrency token.

Commands supply expected versions for every directly edited entity.

```txt
expectedVersion = currentVersion
→ command may proceed after all other checks

expectedVersion != currentVersion
→ reject as stale
```

No newer state may be silently overwritten.

### 2.2 Scoped Locks for Cross-Row Invariants

Short transaction-scoped locks or equivalent serialization are used only when needed to protect:

- parent terminal transition and current child set
- Project-owned Routine shutdown
- occurrence uniqueness
- Routine continuation uniqueness
- child attachment during parent transition
- bulk selected-set atomicity
- idempotency ownership

Serializable isolation is not the default for MVP.

### 2.3 Conflict Contract

A stale command returns a scoped conflict result sufficient to refresh the same user's flow:

```txt
CONFLICT_STALE_VERSION
- entityId
- expectedVersion
- currentVersion
- currentStatus
- changedMaterialFields where safe
```

The user-facing flow states that nothing changed and requires a refreshed preview where confirmation is consequential.

No automatic retry may reinterpret user intent after a conflict.

---

## 3. Revalidate Before Commit

Immediately before mutation, the product reloads or locks current state and verifies:

- lifecycle status
- ownership and authorization
- entity versions
- protection status
- deadline context
- temporal placement
- selected entity set
- parent-child relationships
- rule eligibility where applicable
- consequence-preview assumptions

If any material assumption changed:

```txt
no mutation
→ previous confirmation expires
→ refreshed preview required
→ explicit confirmation required again
```

A missing prior invalidation event is never proof that a confirmation remains valid.

---

## 4. Idempotency Contract

Every consequential command carries an idempotency key scoped to:

```txt
user/workspace
command type
client request or confirmation identity
```

Minimum idempotency record:

```txt
IdempotencyRecord
- id
- userId
- idempotencyKey
- commandType
- requestHash
- status: IN_PROGRESS | SUCCEEDED | FAILED_RETRYABLE | FAILED_FINAL
- resultReference?
- createdAt
- completedAt?
- expiresAt
```

Uniqueness:

```txt
UNIQUE(userId, idempotencyKey)
```

Rules:

- same key and same request hash returns the existing result
- same key and different request hash is rejected
- uncertain response delivery is retried with the same key
- a committed command is never marked retryable merely because response delivery failed
- idempotency never bypasses authorization, version checks, or current-state validation

### 4.1 Domain-State No-Op Success After Record Expiry

An expired or unavailable idempotency record does not permit duplicate effects.

When current canonical state already equals the exact requested terminal result, the server returns idempotent success without mutation.

```txt
COMPLETE Task already COMPLETED
→ success, no-op

DROP Task already DROPPED
→ success, no-op

STOP Routine already STOPPED
→ success, no-op
```

A no-op success must not:

- emit a duplicate lifecycle event
- create a duplicate outbox record
- rewrite `terminalAt`
- advance entity version solely for the replay
- create a second audit decision

A conflicting terminal result is not a no-op success:

```txt
COMPLETE Task currently DROPPED
→ conflict
```

---

## 5. Task Transactions

### Complete

```txt
load/lock Task
→ verify ACTIVE and expected version
→ revalidate parent, protection, and confirmation context
→ set COMPLETED and terminalAt
→ advance version
→ write audit/outbox intent
→ commit
```

### Drop

- verify ACTIVE
- revalidate protection and deadline rules
- preserve historical placement and dates
- set `DROPPED` and `terminalAt`
- record parent-empty consequence when applicable
- do not terminate the parent automatically

### Restore

- verify `DROPPED`
- compare expected version
- revalidate that the parent is still valid and active
- require a current valid `plannedDate` or `reviewDate`
- never silently reuse an expired past planned date
- return the same Task identity to `ACTIVE`
- clear `terminalAt`
- write Restore audit/outbox intent

Incompatible terminal races use first-commit-wins through version checking.

---

## 6. RoutineOccurrence Transactions

Occurrence creation preserves:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

A uniqueness conflict returns the existing occurrence rather than creating a duplicate.

Occurrence resolution permits:

```txt
PENDING → DONE | MISSED
```

and requires `resolvedAt`.

An occurrence that was valid and already existed may still be resolved after Routine Stop when its scheduled local date remains inside the accepted effective range.

A new occurrence may never be created outside the final effective range.

---

## 7. Definition of Exposed Occurrence

For future-occurrence preservation decisions, an occurrence is considered exposed only when it has been returned to a client in a user-visible execution response, such as:

- Today
- an execution-day view
- Routine occurrence detail/history intended for user display

The following do not by themselves count as exposure:

- internal materialization
- eligibility calculation
- background processing
- internal database query
- validation or analytics read

An implementation may record exposure through an event or equivalent durable marker defined in Discussion 019C.

---

## 8. Routine Stop and Future Occurrences

Manual Stop atomically:

```txt
load/lock Routine
→ verify ACTIVE and expected version
→ determine final effective local date
→ set STOPPED, stoppedAt, and effectiveUntilLocalDate
→ advance version
→ handle invalid future materializations
→ write durable event intent
→ commit
```

Rules for future PENDING occurrences after `effectiveUntilLocalDate`:

- they never become `MISSED`
- never-exposed, unresolved rows with no required external reference may be physically removed
- exposed or externally referenced rows preserve identity and receive an explicit invalidation representation defined in 019C
- resolved occurrences remain preserved

---

## 9. Routine Continuation

Continuation creation is atomic and requires:

- source Routine is `STOPPED`
- source belongs to the same user/workspace
- source has no existing direct continuation
- no self-reference
- a new immutable Routine identity
- an explicit `effectiveFromLocalDate`
- preserved source history

`UNIQUE(continuationOfRoutineId)` prevents branching in MVP.

Cycle checks remain as defensive validation even though the stopped-source and immutable-ID rules already make ordinary cycle construction structurally unavailable.

---

## 10. Staged Parent Terminal Pattern

Both Goal and Project terminal flows use the same Option B staging principle.

```txt
resolve active children through separate confirmed transactions
→ reload parent and current child set
→ revalidate terminal eligibility and preview assumptions
→ execute final parent transaction
```

Staging keeps transaction scope smaller, conflict handling clearer, and recovery more honest.

Previously committed child resolutions are not rolled back merely because the final parent transition later becomes stale.

---

## 11. Project Completion and Stop

### 11.1 Child Resolution Stage

Active child Task resolutions commit separately before the final Project transition.

The final Project command does not resolve an arbitrary number of Tasks inside one large transaction.

### 11.2 Final Project Transaction

The final transaction:

```txt
1. lock Project
2. verify Project is ACTIVE and expected version matches
3. load/lock current Project-owned active Routines in deterministic order
4. revalidate current child Task and structural state
5. verify confirmation preview remains current
6. transition Project to COMPLETED or STOPPED
7. set Project terminalAt
8. transition every active Project-owned Routine to STOPPED
9. set Routine stoppedAt and effectiveUntilLocalDate
10. handle invalid future occurrences under the accepted policy
11. advance affected versions
12. write audit/domain/outbox intent
13. commit
```

All Project and Project-owned Routine effects commit together or none do.

Goal-owned and standalone Routines are unaffected.

The parent Goal status remains unchanged.

A new Task or Routine may not attach beneath a Project while its terminal transition commits; attachment must revalidate Project status immediately before commit.

---

## 12. Goal Terminal Transition

Goal `ACHIEVED` or `ABANDONED` uses staged child resolution.

The final Goal transaction is permitted only after reloading and verifying that no illegal active child state remains.

Goal achievement remains an explicit user-confirmed outcome and is never inferred from execution totals.

---

## 13. Bulk Atomicity

Bulk actions are all-or-nothing in MVP.

A bulk command requires:

- explicit selected IDs
- one shared action type
- expected versions for all selected entities
- current shared eligibility
- a current consequence preview

```txt
all selected items succeed
OR
none mutate
```

If one item becomes stale or invalid, the entire command fails and the selected-set preview is regenerated.

Partial success is forbidden because it changes the meaning of the user's confirmation.

---

## 14. Deterministic Lock Ordering

Every multi-row operation, including cascades and bulk actions, uses deterministic ordering:

```txt
1. idempotency record ownership
2. parent before child
3. entity type: Goal → Project → Task → Routine → RoutineOccurrence
4. within each entity type: ascending stable ID
```

The ascending-ID rule applies equally to:

- Project and Goal cascades
- bulk Task operations
- multiple Routine shutdowns
- multi-occurrence invalidation

User selection order, AI presentation order, and UI display order must not determine lock order.

A deadlock retry is allowed only with the same command and idempotency key and must rerun all authorization, version, and consequence checks.

---

## 15. Durable Event Intent

Canonical mutation and durable event intent share one database transaction through audit/event rows or a transactional outbox.

```txt
domain writes
+ durable audit/outbox intent
→ same transaction
```

Post-commit delivery may retry idempotently.

The product must never:

- commit canonical state and lose durable event intent
- publish an event before commit
- treat broker delivery as canonical truth

The exact event envelope, exposure marker, retention, and delivery policy belong to Discussion 019C.

---

## 16. Accepted Claude Findings

Resolved findings:

- `F1`: Project terminal flows now explicitly use the same staged child-resolution pattern as Goal
- `F2`: occurrence exposure now means returned in a user-visible client response, not merely materialized or internally queried

Accepted clarifications:

- matching already-applied terminal state returns no-op idempotent success even after idempotency-record expiry
- deterministic ascending-ID lock order applies to bulk actions as well as cascades
- optimistic concurrency plus short scoped locks remains the MVP default
- bulk mutations remain all-or-nothing
- occurrence resolution after Stop remains allowed only for previously valid occurrences
- transactional outbox or equivalent durable event intent is required
- composite user-scoped ownership enforcement remains required where supported

No Blocking finding remains.

---

## 17. Mind Map Impact

### Product Vision

- concurrent edits and retries do not duplicate consequences
- staged parent completion favors recoverability over giant transactions
- canonical state and durable history remain transactionally aligned

### MVP Core Loop

```txt
confirmed command
→ idempotency resolution
→ current-state reload
→ version and permission checks
→ consequence revalidation
→ staged child resolution where required
→ smallest coherent atomic mutation
→ durable event intent
→ authoritative idempotent result
```

### User Flow

Add:

- stale-preview refresh state
- retry-safe confirmation submission
- no-op success for already-applied matching outcomes
- all-or-nothing bulk conflict state
- staged Project and Goal terminal flow
- future occurrence invalidation without false MISSED history

### AI Responsibilities

- proposals reference explicit entity identities and current versions through product context
- AI does not invent a new idempotency identity when retrying
- AI explanation never overrides a transaction conflict or canonical result

### AI Guardrails

- no stale confirmation commit
- no duplicate mutation after response loss
- no partial bulk success
- no giant parent transaction that resolves arbitrary child sets
- no active child beneath a terminal Project
- no duplicate daily occurrence
- no duplicate Routine continuation
- no duplicate lifecycle event for no-op replay

### Data Events for Discussion 019C

```txt
COMMAND_RECEIVED
COMMAND_CONFLICTED
COMMAND_IDEMPOTENT_REPLAYED
COMMAND_NOOP_SUCCEEDED
TRANSACTION_COMMITTED
TRANSACTION_ROLLED_BACK
PARENT_RESOLUTION_STAGE_COMPLETED
PROJECT_CASCADE_COMPLETED
BULK_ACTION_REJECTED
OCCURRENCE_EXPOSED
OCCURRENCE_INVALIDATED
OCCURRENCE_DUPLICATE_PREVENTED
OUTBOX_DELIVERY_RETRIED
```

### Traction and Guardrail Metrics

- stale command rate
- idempotent replay rate
- domain-state no-op success rate
- mutation conflict rate
- cascade rollback rate
- staged parent finalization conflict rate
- duplicate occurrence prevention rate
- partial bulk mutation rate, expected zero
- child-under-terminal-parent rate, expected zero
- duplicate continuation rate, expected zero
- duplicate lifecycle-event rate, expected zero

### Current Decisions

- optimistic concurrency by default
- short scoped locks for cross-row invariants
- staged Goal and Project child resolution
- atomic final Project-to-Routine cascade
- all-or-nothing bulk mutation
- deterministic lock ordering for every multi-row command
- domain-state no-op success for matching replayed terminal commands
- transactional durable event intent

### Open Questions Removed

Remove or close:

- whether Project child resolution belongs inside one giant transaction
- whether bulk actions may partially succeed in MVP
- whether occurrence exposure means internal calculation
- whether an expired idempotency record allows duplicate terminal effects
- whether transactional durable event intent is optional

---

## 18. Affected Later Specifications

### [[01-Closed-Discussions/019c-events-ai-observability-and-retention|Discussion 019C]]

- event envelope and taxonomy
- occurrence exposure event or durable marker
- invalidated future-occurrence representation
- outbox delivery observability
- idempotent replay and no-op event policy

### Discussion 020

- transaction service boundaries
- expected-version command contracts
- idempotency middleware/storage
- lock ordering implementation
- outbox publisher runtime

### Discussion 021

- race-condition test matrix
- stale-confirmation tests
- Project and Goal staging tests
- deadlock-order tests for bulk and cascades
- idempotency-expiry replay tests
- outbox atomicity tests

### [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]]

- rollout sequencing
- migration of version fields
- idempotency-record retention operations
- outbox deployment and recovery procedures

---

## 19. Closure

Discussion 019B is closed.

Transaction boundaries, concurrency, staged parent resolution, bulk atomicity, retry behavior, idempotency, deterministic lock ordering, and durable event-intent requirements are accepted for MVP.

---

## خلاصهٔ فارسی

این بحث قرارداد نهایی تمام تغییرات داده در MVP را مشخص می‌کند. هر فرمان ابتدا مجوز، وضعیت فعلی و نسخهٔ مورد انتظار را بررسی می‌کند و سپس در یک مرز تراکنشی روشن اجرا می‌شود. کنترل هم‌زمانی به‌صورت optimistic است و برای invariantهای چندردیفی از قفل‌های کوتاه و ترتیب قفل‌گذاری قطعی استفاده می‌شود.

فرمان‌های تکراری با idempotency کنترل می‌شوند و اجرای دوبارهٔ یک نتیجهٔ نهاییِ یکسان می‌تواند بدون ایجاد اثر یا رویداد تکراری موفق تلقی شود. عملیات گروهی همه یا هیچ هستند، تغییر وضعیت Goal و Project به‌صورت مرحله‌ای انجام می‌شود و ثبت intent رویداد با transactional outbox بخشی از همان تراکنش دامنه است.
