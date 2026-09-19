# Discussion 020A — AI Runtime Boundaries and Orchestration

> **Canonical amendment (2026-09-19):** The 2026-09-19 consolidation removes a dedicated crisis classifier/flow while retaining provider safeguards, hostile-input isolation and bounded context.

## Status

Accepted and closed after GPT × Claude review.

This document is the authoritative Discussion 020A resolution for AI runtime boundaries and orchestration.

Accepted dependencies:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]

Where wording differs, this final resolution is authoritative for AI runtime boundaries and orchestration.

---

## 1. Governing Runtime Boundary

```txt
AI runtime
→ classification, proposal, or explanation

Deterministic application/domain runtime
→ authorization, validation, confirmation, and canonical mutation
```

No model output is transaction authority.

The AI runtime must never directly:

- mutate canonical entities
- call repositories
- invoke command handlers
- bypass confirmation
- choose idempotency identity
- override policy or lifecycle rules

---

## 2. Layering and Framework Boundary

The accepted dependency direction is:

```txt
Domain
← Application use cases and internal ports
← AI orchestration services
← .NET provider SDK adapters
```

Domain and application contracts do not expose provider SDK types, .NET integration-library types, prompt objects, tool-calling APIs, or provider response structures.

Any .NET AI/provider integration library is an infrastructure adapter, not part of the domain language.

The abstraction remains intentionally small. The product does not create a generic AI framework merely to prove it can pronounce “hexagonal architecture.”

---

## 3. Three Explicit AI Ports

### 3.1 PlanningGenerationPort

```txt
PlanningGenerationPort.generate(PlanningGenerationRequest)
→ PlanningGenerationResult
```

Purpose:

- produce a complete structured planning proposal
- never mutate canonical state
- never return an approvable partial subset

### 3.2 ReconcileExplanationPort

```txt
ReconcileExplanationPort.explain(ReconcileExplanationRequest)
→ ReconcileExplanationResult
```

Purpose:

- explain already-computed deterministic facts and rule matches
- receive structured facts only in MVP
- never calculate rule eligibility or permission

### 3.3 DomainSafetyClassificationPort

```txt
DomainSafetyClassificationPort.classify(DomainSafetyClassificationRequest)
→ ClassificationResult
```

Purpose:

- classify the operation into a closed safety/domain vocabulary
- control routing and generation eligibility
- never produce planning or advice content

Accepted closed vocabulary includes:

```txt
NORMAL
HIGH_RISK_ORGANIZATION
MEDICAL
MENTAL_HEALTH_CLINICAL
LEGAL
HIGH_STAKES_FINANCIAL
CRISIS_OR_SELF_HARM
VIOLENCE_OR_ABUSE
REGULATED_OR_ILLEGAL
```

`ClassificationResult` may include only bounded metadata such as:

```txt
classification
confidenceBand?
reasonCodes[]
policyVersion
```

It must not include free-form advice or unrestricted rationale.

Classification controls routing but does not itself grant permission to generate content.

---

## 4. Context Construction Boundary

Each capability has a dedicated deterministic context builder:

```txt
PlanningContextBuilder
ReconcileContextBuilder
SafetyClassificationContextBuilder
```

Application context builders:

- load only already-authorized scoped data
- produce immutable context DTOs
- record logical builder key and version
- produce context-scope observability metadata

Prompt renderers:

- accept immutable DTOs only
- have no repository access
- have no connector access
- cannot fetch account history
- cannot load additional entities while rendering
- cannot broaden context

```txt
Context Builder
→ scoped immutable DTO
→ Prompt Renderer
→ Provider Adapter
```

Prompt renderer packages must not depend on repository or data-access packages.

---

## 5. Context Policy

### 5.1 Planning

Planning may receive only operation-relevant context accepted by Discussion 018A, including:

- current user request
- user-approved constraints
- current local date and timezone
- current unapproved draft when revising
- scoped relevant entity summaries
- explicit availability constraints
- known relevant conflicts

It must not receive unrelated account history, arbitrary completed/dropped entities, hidden behavioral profiles, secrets, or unrelated private content.

### 5.2 Reconcile

For MVP:

```txt
Reconcile AI context
→ structured facts and rule matches only
→ no free-text notes
→ no descriptions
→ no imported messages
→ no raw user narrative
```

The explanation port is ineligible when deterministic facts or rule matches are unavailable.

### 5.3 Safety Classification

The classifier receives the minimum content required to select a closed policy category.

Classifier input must not automatically inherit the wider Planning context.

---

## 6. Context Scope Observability

Discussion 020A uses the context-scope observability contract incorporated into:

- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]

Every AI operation records:

```txt
contextBuilderKey
contextBuilderVersion
contextScopeManifestId?
```

The linked Context Scope Manifest records categories and counts, not actual raw context.

It must never become a second prompt archive disguised as observability.

---

## 7. No Model Tool or Function Calling in MVP

AI provider adapters receive no registered mutation, repository, command, connector, or unrestricted read tools.

Framework-level tool/function calling is disabled for all three AI capabilities in MVP.

This is enforced mechanically.

### 7.1 Architecture Rules

AI adapter and prompt-renderer packages must not depend on:

- repository packages
- command-handler packages
- mutation services
- transaction managers
- connector clients
- tool callback registries
- function registration APIs

### 7.2 Build-Time Tests

Architecture tests, such as ArchUnit rules or equivalent build checks, must fail when:

- an AI adapter depends on a repository or mutation package
- a prompt renderer depends on persistence infrastructure
- an AI configuration registers tool/function callbacks
- a provider adapter exposes tool-calling output to application code

A formatting helper is ordinary deterministic code, not justification for giving the model executable tools.

---

## 8. Planning Orchestration

Accepted flow:

```txt
receive planning request
→ authorize flow
→ build minimum scoped classification input
→ classify domain/safety
→ route by deterministic policy
→ build Planning context DTO
→ create AI operation/attempt identity
→ invoke PlanningGenerationPort
→ parse and validate complete output
→ apply deterministic repair allowlist only
→ reject partial or invalid output
→ persist temporary PlanningDraft revision
→ show preview
→ user edits or confirms later through deterministic API flow
```

No canonical Goal, Project, Task, or Routine is created during generation.

A PlanningDraft is persisted only after complete schema and policy validation.

---

## 9. Reconcile Orchestration

Accepted flow:

```txt
load canonical scoped data
→ deterministic Reconcile engine computes facts and rule matches
→ persist/return deterministic ReconcileSession state
→ optionally invoke ReconcileExplanationPort
→ attach bounded AI explanation if valid and current
```

FACT and RULE_MATCH remain authoritative trust classes.

AI_EXPLANATION is optional and removable.

The model does not determine:

- eligibility
- permissions
- severity
- allowed actions
- protection rules
- lifecycle consequences

---

## 10. Deterministic Reconcile Failure

If the deterministic Reconcile calculation fails:

```txt
deterministic Reconcile unavailable
→ no raw-data AI fallback
→ no improvised AI summary
→ Reconcile unavailable state
→ Today and manual execution remain accessible
→ user-facing failure status
→ operational failure logged
```

AI explanation is ineligible because no accepted deterministic evidence exists.

The product must not respond to failure of the rule engine by asking a probabilistic model to impersonate the rule engine. That would be less fallback and more ceremonial surrender.

---

## 11. Synchronous and Streaming Policy

### Planning

For MVP, Planning returns one complete validated result.

- no token streaming to the user
- no partial approvable proposal
- progress UI may report coarse orchestration stages
- final draft appears only after complete validation

### Reconcile

Deterministic Reconcile results may be returned immediately.

AI explanation may attach later if:

- the session remains current
- the attempt was not cancelled
- the result passes validation
- the user has not entered a newer conflicting session state

The UI must not block deterministic Reconcile on AI text.

---

## 12. Cancellation and Late Results

Cancellation applies to a specific AI attempt identity.

For MVP:

```txt
attempt cancelled
→ provider cancellation requested where supported
→ attempt marked CANCELLED
→ late result never shown
→ no PlanningDraft revision created
→ no Reconcile explanation attached
→ operational completion may be logged
```

There is no exception that allows orchestration policy to resurrect a cancelled result automatically.

A user may explicitly start a new attempt, which receives a new identity and current context.

Cancellation never mutates canonical product state.

---

## 13. Provider and Model Selection

Application code selects logical configuration keys, not provider SDK classes.

Example:

```txt
planning.standard
reconcile.explanation
safety.classification
```

A runtime registry resolves each key to:

- provider adapter
- model identifier
- prompt/template version
- output schema version
- policy/catalog version
- bounded runtime configuration

Automatic cross-provider fallback is disabled for the pilot.

No automatic same-provider secondary-model fallback is required for the pilot.

Failure routes to retry/manual/degraded behavior under Discussions 018A and 020C.

---

## 14. Kill Switches and Degraded Modes

Required controls remain:

```txt
AI_GLOBAL_KILL_SWITCH
PLANNING_AI_KILL_SWITCH
RECONCILE_AI_TEXT_KILL_SWITCH
PROVIDER_SPECIFIC_KILL_SWITCH
READ_ONLY_DEGRADED_MODE
```

Behavior:

- Planning AI disabled: manual planning remains available.
- Reconcile AI text disabled: deterministic FACT/RULE_MATCH remain available.
- Provider disabled: no silent provider substitution.
- Global AI disabled: canonical product and manual flows remain available.
- Deterministic Reconcile failed: Reconcile unavailable, not replaced by AI.

---

## 15. Attempt Identity and Persistence

An AI operation/attempt identity is created before provider invocation so failures, cancellation, latency, and provider outcomes are observable.

A PlanningDraft revision is persisted only after complete output validation.

A failed, cancelled, partial, malformed, or rejected generation attempt may exist operationally without creating a usable PlanningDraft.

---

## 16. Accepted Findings

Claude findings resolved:

- `F1`: added `DomainSafetyClassificationPort` with closed output vocabulary
- `F2`: added context builder version and Context Scope Manifest requirements to the authoritative Discussion 019C resolution
- `F3`: no-tool policy is enforced with architecture and configuration tests
- `F4`: all late results after cancellation are discarded in MVP
- `F5`: prompt renderers receive immutable DTOs and cannot access repositories
- `F6`: deterministic Reconcile failure disables Reconcile rather than invoking raw-data AI fallback

Additional accepted simplification:

- prompt, schema, policy/catalog, and provider configuration resolution may share one internal runtime artifact registry
- this is an implementation simplification, not a domain invariant

---

## 17. Scenario Checks

### Scenario A — Classifier identifies crisis content

Expected:

- classification uses closed vocabulary
- Planning generation is not invoked
- crisis policy route is selected
- no PlanningDraft is created

### Scenario B — Prompt renderer attempts repository access

Expected:

- architecture test fails the build
- no runtime broadening of context is possible

### Scenario C — AI tool callback is registered

Expected:

- configuration or architecture test fails
- deployment is blocked

### Scenario D — User cancels Planning

Expected:

- attempt is CANCELLED
- late provider output is discarded
- no draft revision appears later

### Scenario E — Deterministic Reconcile fails

Expected:

- Reconcile unavailable state
- no AI summary from raw entities
- Today/manual execution remain available

### Scenario F — Reconcile explanation fails

Expected:

- deterministic FACT/RULE_MATCH remain visible
- AI_EXPLANATION is absent
- no canonical mutation or session corruption

### Scenario G — Context builder version changes

Expected:

- operation records new builder version
- scope manifest records included categories
- raw context is not duplicated

---

## 18. Mind Map Impact

### Product Vision

- AI remains an optional enhancement layer.
- canonical behavior remains deterministic and usable without AI.
- framework and provider choices do not become product semantics.
- context access is minimized and structurally enforced.

### MVP Core Loop

```txt
request
→ safety classification
→ deterministic policy route
→ scoped context DTO
→ AI proposal/explanation
→ complete validation
→ preview or deterministic result
→ later explicit confirmation
→ deterministic mutation
```

### User Flow

Add:

- classification/routing failure state
- cancellable AI attempt
- cancelled-attempt terminal state
- deterministic Reconcile unavailable state
- deterministic Reconcile without AI explanation
- manual fallback when Planning AI is unavailable

### AI Responsibilities

- classify within a closed vocabulary
- generate complete structured Planning proposals
- explain deterministic Reconcile evidence
- stay inside supplied immutable context DTOs
- return no executable commands

### AI Guardrails

- no repository access from AI adapters or prompt renderers
- no model tool/function calling in MVP
- no canonical mutation through AI runtime
- no late-result resurrection after cancellation
- no raw-data AI fallback when deterministic Reconcile fails
- no implicit schema override of observability contracts

### Data and Observability

Add:

```txt
contextBuilderKey
contextBuilderVersion
ContextScopeManifest
AI_ATTEMPT_CANCELLED
AI_LATE_RESULT_DISCARDED
DETERMINISTIC_RECONCILE_FAILED
AI_TOOL_REGISTRATION_BLOCKED
```

### Guardrail Metrics

- tool registration violations, expected zero
- prompt-renderer repository dependency violations, expected zero
- late cancelled results displayed, expected zero
- Reconcile raw-data fallback rate, expected zero
- operations missing context builder version, expected zero
- context manifest mismatch rate, expected zero

---

## 19. Affected Later Discussions

### [[01-Closed-Discussions/020b-api-and-frontend-state-contracts|Discussion 020B]]

Must define API and frontend states for:

- attempt identity
- cancellation
- late-result discard
- deterministic Reconcile unavailable
- deterministic result plus optional explanation attachment

### [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls|Discussion 020C]]

Must define:

- classifier output validation
- attempt timeouts and retry rules
- cancellation provider behavior
- runtime artifact registry validation
- build/deployment checks for forbidden tool registration
- context scope manifest consistency tests

### [[01-Closed-Discussions/021-validation-plan-and-decision-gates|Discussion 021]]

Must test:

- port separation
- no-tool architecture rules
- prompt-renderer isolation
- crisis routing
- cancellation races
- deterministic Reconcile failure
- context scope observability correctness

### [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]]

Must sequence:

- internal ports before provider adapters
- architecture checks before production AI enablement
- kill switches and manual fallback before pilot rollout

---

## 20. Closure

Discussion 020A is closed at the runtime-boundary and orchestration level.

Its API/frontend and reliability/cost companion contracts are accepted in:

- [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]

No unresolved product-semantic or runtime-boundary question remains in 020A.

---

## خلاصهٔ فارسی

این بحث مرز نهایی اجرای AI را مشخص می‌کند. AI فقط می‌تواند طبقه‌بندی، پیشنهاد یا توضیح تولید کند؛ مجوز، اعتبارسنجی، تأیید کاربر و تغییر وضعیت مرجع همیشه در لایه‌های قطعی application و domain انجام می‌شوند. قابلیت‌های Planning، توضیح Reconcile و طبقه‌بندی ایمنی از طریق portهای جدا و provider-neutral اجرا می‌شوند و هیچ .NET AI integration library یا framework مشابهی اجازهٔ نفوذ به دامنه را ندارد.

در MVP هیچ ابزار، function calling، دسترسی repository یا مسیر مخفی برای mutation در اختیار مدل قرار نمی‌گیرد. context builderها محدود، نسخه‌دار و قابل مشاهده‌اند؛ Reconcile فقط دادهٔ ساخت‌یافته دریافت می‌کند. لغو درخواست، نتیجهٔ دیررس، kill switch، degraded mode و شکست provider نیز قراردادهای صریح دارند و در تمام حالت‌ها مسیر دستی محصول قابل استفاده باقی می‌ماند.
