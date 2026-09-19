# Pilot Readiness Checklist

## Status

`CHECKLIST_STRUCTURE_APPROVED — PILOT_NOT_READY`

## Decision rule

Pilot approval requires every `HARD_GATE` row to be `PASS`, every other required row to be `PASS` or an explicitly approved non-safety exception, and a signed final approval record. Positive H1/H2 metrics cannot override a failed hard gate.

Allowed states:

- `NOT_STARTED`
- `IN_PROGRESS`
- `PASS`
- `FAIL`
- `BLOCKED`
- `NOT_APPLICABLE_WITH_REASON`

No row becomes `PASS` without a durable evidence link, artifact/version identity, reviewer, and review date.

## 1. Baseline and scope

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-001` | `HARD_GATE` | Deployed behavior traces to accepted baseline and locked contracts | Product owner | Backend, Design | release manifest + trace matrix | `NOT_STARTED` |
| `PILOT-002` | `HARD_GATE` | Complete Plan → Execute → Adapt loop available | Product owner | Design, Backend, Research | end-to-end evidence | `NOT_STARTED` |
| `PILOT-003` | `HARD_GATE` | Manual Planning and manual escape remain available | Product owner | Design, Safety | timed E2E/manual escape evidence | `NOT_STARTED` |
| `PILOT-004` | required | Pilot-only limitations are visible and documented | Product owner | Support, Design | participant/support documentation | `NOT_STARTED` |

## 2. Authentication, authorization, and correctness

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-010` | `HARD_GATE` | OTP/JWT/SMS production configuration approved and secrets protected | Backend owner | Security/Privacy | config review + production-profile tests | `NOT_STARTED` |
| `PILOT-011` | `HARD_GATE` | Ownership-safe authorization covers canonical and AI workflow resources | Backend owner | Security/Privacy | access-control test suite | `NOT_STARTED` |
| `PILOT-012` | `HARD_GATE` | Expected versions, idempotency, replay, lost-response recovery and atomic bulk pass | Backend owner | Product, Frontend | concurrency/idempotency evidence | `NOT_STARTED` |
| `PILOT-013` | `HARD_GATE` | Canonical mutation and outbox intent are atomic | Backend owner | Security/Privacy, Research | transaction/failure-injection tests | `NOT_STARTED` |
| `PILOT-014` | required | Migrations, backups, restore and rollback rehearsed | Backend owner | Security/Privacy | drill record | `NOT_STARTED` |

## 3. AI authority, safety, and crisis

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-020` | `HARD_GATE` | No model tools, repositories, commands, or direct canonical mutation | Backend owner | Safety, Security/Privacy | architecture + adversarial tests | `NOT_STARTED` |
| `PILOT-021` | `HARD_GATE` | Invalid/partial output creates no reviewable resource | Backend owner | Safety | output-gate corpus | `NOT_STARTED` |
| `PILOT-022` | `HARD_GATE` | Preview, warnings, confirmation and commit-time revalidation cannot be bypassed | Backend owner | Product, Safety, Security/Privacy | authorization/stale-confirmation tests | `NOT_STARTED` |
| `PILOT-023` | `HARD_GATE` | Prompt injection/imported content has no authority | Security/Privacy owner | Safety, Backend | hostile-input corpus | `NOT_STARTED` |
| `PILOT-024` | `HARD_GATE` | Crisis detection/failure path uses reviewed localized resources | Safety/Policy owner | Product, Security/Privacy, Research | signed crisis package | `NOT_STARTED` |
| `PILOT-025` | `HARD_GATE` | Crisis path has zero proposal, explanation, confirmation and mutation leakage | Safety/Policy owner | Backend, Security/Privacy | adversarial zero-leakage corpus | `NOT_STARTED` |
| `PILOT-026` | `HARD_GATE` | Classifier uncertainty/failure closes AI path safely | Safety/Policy owner | Backend | classifier failure tests | `NOT_STARTED` |
| `PILOT-027` | `HARD_GATE` | Restricted crisis observability is minimized and access-audited | Security/Privacy owner | Safety, Research | access/retention audit | `NOT_STARTED` |

## 4. Privacy, retention, and data governance

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-030` | `HARD_GATE` | Data inventory and purpose mapping approved | Security/Privacy owner | Product, Research | signed inventory | `NOT_STARTED` |
| `PILOT-031` | `HARD_GATE` | Retention, deletion/anonymization and legal basis approved | Security/Privacy owner | Backend, Research | signed schedule | `NOT_STARTED` |
| `PILOT-032` | `HARD_GATE` | Raw content is minimized in context, events, logs and traces | Security/Privacy owner | Backend, Safety | field-level audit | `NOT_STARTED` |
| `PILOT-033` | `HARD_GATE` | Consent and participant information match actual collection/use | Research owner | Security/Privacy, Product | approved consent package | `NOT_STARTED` |

## 5. Reliability, cost, and degraded operation

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-040` | `HARD_GATE` | Provider/model/prompt/schema/policy artifacts are pinned | Backend owner | Safety, Research | runtime artifact bundle | `NOT_STARTED` |
| `PILOT-041` | `HARD_GATE` | Retry, timeout, rate, circuit, token and spend limits approved/tested | Backend owner | Product, Safety | reliability/cost package | `NOT_STARTED` |
| `PILOT-042` | `HARD_GATE` | Provider hard spend cap and kill switches verified | Backend owner | Product | provider evidence + drill | `NOT_STARTED` |
| `PILOT-043` | `HARD_GATE` | Provider outage preserves manual/deterministic paths without silent fallback | Product owner | Backend, Design, Safety | degraded-mode E2E tests | `NOT_STARTED` |
| `PILOT-044` | required | Performance and capacity are acceptable for bounded cohort | Backend owner | Product | load/latency report | `NOT_STARTED` |

## 6. Evidence and pilot protocol

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-050` | `HARD_GATE` | Event catalog reproduces every H1/H2 denominator without ambiguity | Research owner | Backend, Security/Privacy | fixture queries + mapping | `NOT_STARTED` |
| `PILOT-051` | `HARD_GATE` | Exposure/output/resource/disposition/command/application remain distinct | Research owner | Backend | denominator tests | `NOT_STARTED` |
| `PILOT-052` | `HARD_GATE` | Thresholds, classifiers, exclusions and decision matrix locked before analysis | Research owner | Product, Safety | signed threshold-lock package | `NOT_STARTED` |
| `PILOT-053` | required | Cohort, locale, consent, observation window and minimum exposures approved | Research owner | Product, Security/Privacy | signed pilot protocol | `NOT_STARTED` |
| `PILOT-054` | `HARD_GATE` | Missing/inconclusive evidence cannot be reported as success | Research owner | Product | analysis template and review rule | `NOT_STARTED` |

## 7. UX, accessibility, support, and operations

| ID | Type | Requirement | Accountable | Mandatory reviewers | Evidence | State |
|---|---|---|---|---|---|---|
| `PILOT-060` | `HARD_GATE` | Critical flows pass keyboard, screen-reader, contrast and responsive checks | Product Design owner | Frontend, Product | accessibility report | `NOT_STARTED` |
| `PILOT-061` | required | Failure, cancellation, stale, conflict, degraded and empty states are understandable | Product Design owner | Product, Safety | moderated review + tests | `NOT_STARTED` |
| `PILOT-062` | `HARD_GATE` | External health monitoring and actionable alerts reach an observed channel | Backend owner | Product | alert test | `NOT_STARTED` |
| `PILOT-063` | `HARD_GATE` | Incident, support, escalation, rollback and re-enable owners/runbooks tested | Product owner | Backend, Safety, Security/Privacy | drill records | `NOT_STARTED` |
| `PILOT-064` | required | Participant support and withdrawal path are available | Product owner | Research, Security/Privacy | support/withdrawal procedure | `NOT_STARTED` |

## Final pilot approval

| Lane | Required approver | Decision | Identity | Date | Exceptions |
|---|---|---|---|---|---|
| Product | Product owner | `PENDING` | `PENDING` | `PENDING` | none recorded |
| Design/Accessibility | Product Design owner | `PENDING` | `PENDING` | `PENDING` | none recorded |
| Frontend | Frontend owner | `PENDING` | `PENDING` | `PENDING` | none recorded |
| Backend/Operations | Backend owner | `PENDING` | `PENDING` | `PENDING` | none recorded |
| Safety/Policy | Safety/Policy owner | `PENDING` | `PENDING` | `PENDING` | no hard-gate exception allowed |
| Security/Privacy | Security/Privacy owner | `PENDING` | `PENDING` | `PENDING` | no hard-gate exception allowed |
| Pilot Research | Research owner | `PENDING` | `PENDING` | `PENDING` | no evidence-gate exception allowed |

Current decision: `PILOT_NOT_READY`.

Authority: [[01-Closed-Discussions/021-validation-plan-and-decision-gates]], [[04-Specs/ai-native-mvp-baseline]], and [[05-Implementation/milestone-exit-gate-plan]].
