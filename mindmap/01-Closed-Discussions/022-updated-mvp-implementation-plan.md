# Discussion 022 — MVP Baseline Reconciliation, Mind Map Migration, and Implementation Plan

## Status

Closed — final planning resolution published on `2026-07-22`.

Workstreams A–J are complete. M0 is frozen, the Mind Map and repository artifacts are migrated and verified, implementation reuse is classified, M1–M8 are authoritative for implementation planning, and readiness checklist structures are approved. M9 has not passed: the product remains `PILOT_NOT_READY` and `RELEASE_NOT_READY` until implementation evidence satisfies the approved checklists.

## Purpose

Discussion 022 is the final planning discussion before implementation planning becomes authoritative.

Its purpose is not merely to order engineering milestones. It starts from the completed legacy reconciliation and closed Discussion 010–021 set, then establishes one authoritative AI-native MVP baseline, migrates all accepted decisions into the repository Mind Map, verifies that the Mind Map and accepted discussion set agree, and only then makes the implementation sequence authoritative.

```txt
legacy reconciliation — complete
→ accepted-decision inventory
→ conflict and dependency resolution
→ final MVP baseline
→ Mind Map migration
→ consistency verification
→ vertical implementation plan
→ pilot readiness
```

An implementation roadmap built before these steps would be based on a stale product map and ambiguous source documents.

---

## 1. Governing Rules

1. Discussion 022 may not silently change accepted product behavior from Discussions 010–021.
2. Any required behavior change must reopen or amend the source discussion explicitly.
3. Discussions 001–008 have been audited at decision level; only [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] may contribute legacy decisions to the current baseline.
4. The original 001–008 files are non-normative Git history and have been removed from the active workspace.
5. No Discussion 009 exists in the current workspace or repository history; it is not a missing dependency or an audit input.
6. Discussions 010–021 are closed. Their clean files in `01-Closed-Discussions` are the authoritative product, domain, runtime, safety, and validation inputs.
7. The shared Mind Map is not authoritative until every accepted change from Discussions 010–021 is applied and verified.
8. Writing `Mind Map Impact` inside a Markdown discussion does not count as applying the change to the Mind Map.
9. No implementation milestone becomes authoritative before the final MVP baseline and Mind Map migration are approved.
10. Events, observability, safety, privacy, idempotency, and validation are cross-cutting requirements from the first vertical slice, not end-stage cleanup.
11. Pilot readiness and public release readiness are different gates.
12. Schedule estimates are downstream of scope, dependencies, ownership, and team capacity; Discussion 022 defines sequence and gates, not decorative calendar optimism.

---

## 2. Source-of-Truth Hierarchy

When sources disagree, use this precedence order:

1. authoritative closed Discussions 010–021 and the explicit ownership boundaries inside them,
2. [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] for its narrowly retained compatibility decisions only,
3. verified nodes in [[00-Canvas/Planner-Mindmap.canvas]] after the migration ledger is fully applied,
4. formal specifications and ADRs explicitly reconciled and adopted by Discussion 022,
5. old specifications, implementation plans, sketches, deleted discussion sources, and Git history as non-normative evidence only.

The current Mind Map may not override an accepted resolution merely because the map is easier to see.

Each final baseline decision must identify exactly one primary authoritative owner. Required dependency sources may also be named, but they may not obscure ownership or silently replace the primary owner's semantics.

---

## 3. Workstream A — Legacy Reconciliation — Completed

### 3.1 Applied Scope

Discussions 001–008 were compared at decision level against Discussions 010–021. The authoritative result is:

- [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]

The eight source files were removed after verification. Git history preserves provenance without leaving obsolete discussions in the active source set.

No Discussion 009 file exists in either the current workspace or repository history. It is therefore excluded because there is no source to audit, not because its content was assumed obsolete.

### 3.2 Applied Status Vocabulary

The legacy comparison used these statuses:

- `RETAINED`
- `AMENDED`
- `PARTIALLY_SUPERSEDED`
- `FULLY_SUPERSEDED`
- `REQUIRES_REVIEW`
- `NON_NORMATIVE_HISTORY`

Definitions:

#### RETAINED

The decision remains valid without behavioral change.

#### AMENDED

The decision remains partially valid but must be read together with a named amendment or later resolution.

#### PARTIALLY_SUPERSEDED

Some parts remain valid, while named parts are replaced by later decisions.

#### FULLY_SUPERSEDED

The decision no longer governs current product behavior.

#### REQUIRES_REVIEW

No later decision clearly resolves whether the legacy rule remains valid.

#### NON_NORMATIVE_HISTORY

The content may explain product evolution but must not guide implementation.

### 3.3 Applied Audit Record

The consolidated file records:

- a source-by-source disposition for Discussions 001–008,
- the categories that do not survive,
- the exact research, technical, authentication, API, development, and pilot-operation decisions that do survive,
- the current owner or destination of every retained category,
- confirmation that no `REQUIRES_REVIEW` item remains.

Detailed obsolete prose is intentionally left in Git history rather than duplicated into a historical matrix.

### 3.4 Supersession Safety Rules

- No deleted 001–008 source may be cited directly as current authority.
- A legacy decision survives only when it appears in the consolidated surviving-decisions file.
- Absence from later discussions is not proof that an old decision survives.
- Legacy data-model, flow, event, API, and implementation language must not be reintroduced through an old formal artifact.
- Reusable technical implementation does not reactivate the behavior it originally supported.
- The retained authentication spec remains applicable only through the explicit boundary established by the consolidated file.

### 3.5 Output A — Completed

[[01-Closed-Discussions/001-008-legacy-surviving-decisions]] is the completed **Legacy Reconciliation and Supersession Record**.

It is intentionally a surviving-decisions record rather than a second archive of obsolete material. Together with the legacy warnings added to affected formal artifacts, it makes the active authority boundary explicit while Git preserves historical provenance.

---

## 4. Workstream B — Accepted Decision Inventory — Completed

### 4.1 Inventory Scope

Inventory the authoritative closed files for Discussions 010–021. Their current family-level index begins in [[01-Closed-Discussions/011-ai-native-mvp-scope-and-mindmap-update]], but the inventory must read every authoritative file directly.

Superseded proposals, split hubs, review briefs, and separately folded amendments have been removed. The inventory must use the clean paths in `01-Closed-Discussions` and must not reconstruct authority from deleted filenames.

For each accepted discussion, extract:

```txt
authoritativeFile
acceptedDecisionIds
newTerms
changedTerms
newInvariants
changedUserFlows
changedDataConcepts
newEvents
newGuardrails
newMetrics
newOpenQuestions
MindMapImpactItems
specificationsOrADRsRequired
```

### 4.2 Duplicate and Conflict Detection

The inventory must detect:

- two documents claiming authority over the same behavior,
- later documents depending on earlier unresolved terms,
- inconsistent status names,
- renamed entities without migration mapping,
- contradictory user flows,
- missing event support for accepted metrics,
- missing implementation artifacts promised by final resolutions,
- references to discussions or release gates that do not exist or were not carried forward.

### 4.3 Required Output B

Completed output:

- [[02-Decisions/accepted-decision-inventory-001-021]]

The inventory includes stable decision IDs, the authoritative discussion index, ownership boundaries, consolidated terms and flows, event/guardrail/metric requirements, formal-document handoffs, and conflict resolution. It found no blocking semantic conflict or unresolved product decision.

---

## 5. Workstream C — Final MVP Baseline — Completed

The final MVP baseline is the smallest complete product scope that honestly implements:

```txt
Plan → Execute → Adapt
```

with the accepted AI-native safety, authority, and validation boundaries.

### 5.1 Baseline Categories

The baseline must explicitly define:

- target pilot user,
- core product promise,
- canonical entities,
- ownership and lifecycle rules,
- manual planning capabilities,
- AI-assisted Planning responsibilities,
- Today execution behavior,
- Routine behavior,
- deterministic Reconcile behavior,
- AI-assisted Reconcile behavior,
- confirmation and mutation boundaries,
- safety and crisis behavior,
- data events and observability,
- validation metrics and decision gates,
- pilot constraints,
- excluded functionality.

### 5.2 Baseline Status Vocabulary

Every candidate feature or behavior receives one status:

- `MVP_REQUIRED`
- `PILOT_REQUIRED_NON_PRODUCT`
- `POST_PILOT`
- `REMOVED`
- `UNRESOLVED`

`PILOT_REQUIRED_NON_PRODUCT` includes instrumentation, safety evidence, operational tooling, runbooks, and reviewer workflows that may not be visible as product features but are mandatory for pilot launch.

### 5.3 Thesis-Preserving Scope Rule

A scope cut is valid only when the remaining product still demonstrates all three parts of the loop:

- users can form a meaningful plan,
- users can execute and record reality,
- users can adapt when reality diverges.

The following cuts are presumed thesis-breaking unless a source discussion is reopened:

- removing manual planning fallback,
- removing Today execution,
- removing deterministic Reconcile,
- letting AI mutate canonical state directly,
- removing confirmation boundaries,
- removing crisis fail-closed behavior,
- removing events needed for Discussion 021 gates,
- shipping AI Planning without an Adapt loop,
- shipping Reconcile without manual escape.

### 5.4 Required Output C

Completed output:

- [[04-Specs/ai-native-mvp-baseline]]

The matrix maps every retained capability to its status, source discussion, Mind Map section, implementation milestone, and pilot gate. It also records explicit `POST_PILOT`, `REMOVED`, and `UNRESOLVED` configuration registers.

---

## 6. Workstream D — Mind Map Migration

### 6.1 Migration Principle

The shared Mind Map must become a verified projection of accepted product decisions, not a parallel product specification.

### 6.2 Current Known Gap

Discussions 010–021 contain written `Mind Map Impact` sections, but those changes have not yet been applied to the actual map.

The migration target is [[00-Canvas/Planner-Mindmap.canvas]]. It still contains legacy 001/002 file nodes and other pre-consolidation concepts; those nodes are migration work, not current authority.

The map was stale when this workstream began. The approved ledger has now been applied, and the resulting Canvas passed structural and cross-role verification.

### 6.3 Migration Record

Every map change must use this record:

```txt
migrationItemId
sourceDiscussion
sourceDecision
mapFile
mapSection
targetNodeId
changeType
oldContent
newContent
linkedDependencies
owner
reviewer
status
mapVersionBefore
mapVersionAfter
evidenceLink
```

`targetNodeId` is mandatory for updates, moves, deletions, relations, and references. A created node records its assigned ID immediately after application. `mapVersionBefore` and `mapVersionAfter` must be repository commit IDs or reproducible content hashes so visual changes cannot be claimed without file-level evidence.

Allowed `changeType` values:

- `CREATE_NODE`
- `UPDATE_NODE`
- `MOVE_NODE`
- `DELETE_NODE`
- `MARK_SUPERSEDED`
- `CREATE_RELATION`
- `DELETE_RELATION`
- `ADD_REFERENCE`

### 6.4 Minimum Map Sections

Migration must review and update at least:

1. Product Vision
2. MVP Core Loop
3. User Flow
4. AI Responsibilities
5. AI Guardrails
6. Data Model / Domain Concepts
7. Data Events
8. Traction Metrics
9. Current Decisions
10. Open Questions
11. Implementation / Delivery Plan
12. References and Study Needs

### 6.5 Expected Discussion-to-Map Coverage

At minimum, verify these categories:

- product and domain semantics from Discussions 010–018,
- transaction, concurrency, idempotency, events, and observability from Discussion 019,
- AI runtime, API contracts, structured output, reliability, cost, and kill switches from Discussion 020,
- hypotheses, metrics, thresholds, crisis release gate, and decision gates from Discussion 021,
- final baseline and implementation sequencing from Discussion 022.

### 6.6 Historical Node Policy

Old nodes should be removed from the active map when Git history is sufficient. A historical node may remain only when it is necessary to explain a current boundary and is clearly marked:

```txt
SUPERSEDED — DO NOT IMPLEMENT
```

A visually present but silently obsolete node is forbidden.

### 6.7 Migration Completeness Gate

Mind Map migration passes only when:

- every accepted `Mind Map Impact` item has a migration record,
- every migration record has been applied or explicitly rejected with reason,
- every changed node links back to an authoritative discussion,
- no unresolved contradiction remains hidden inside an active node,
- legacy nodes are removed, amended, or exceptionally retained with an explicit superseded marker,
- designer, frontend, backend, and product reviewers can identify the same MVP baseline from the map,
- a decision-to-node traceability check passes.

### 6.8 Required Output D

Produce and execute a **Mind Map Migration Ledger**. The ledger alone is not completion; [[00-Canvas/Planner-Mindmap.canvas]] must be changed, versioned, and reviewed.

Ledger preparation and Canvas application are complete:

- [[00-Canvas/Planner-Mindmap-Migration-Ledger]]

The ledger was approved and applied against its recorded pre-migration hash. The resulting Canvas hash, structural evidence, and cross-role walkthrough verification are recorded in the ledger. Workstreams D and E are complete.

---

## 7. Workstream E — Mind Map Verification

After migration, perform a structured consistency review.

### 7.1 Verification Questions

For every active node:

- Which accepted decision authorizes it?
- Is the terminology current?
- Is the behavior complete or misleadingly simplified?
- Does it contradict another active node?
- Does it omit a safety, authority, or failure condition?
- Is it implementation guidance, product behavior, historical context, or an open question?

### 7.2 Cross-Role Walkthrough

The designer, frontend owner, and backend owner independently explain from the map:

```txt
user planning flow
AI proposal flow
confirmation and command flow
Today execution flow
Reconcile flow
crisis fallback flow
pilot measurement flow
```

Material disagreement means verification fails.

### 7.3 Baseline Snapshot

After approval, capture:

- repository commit ID or reproducible content hash for the Canvas file,
- dated visual snapshot when useful for human review,
- migration ledger version,
- authoritative discussion index,
- unresolved-question list,
- reviewer sign-offs.

This snapshot becomes the planning input for implementation milestones.

---

## 8. Workstream F — Implementation Strategy

### 8.1 Vertical Slice Rule

Each milestone must deliver an end-to-end behavior across the necessary layers:

```txt
UX/design
→ frontend
→ API contract
→ domain behavior
→ persistence
→ events/outbox
→ observability
→ tests
```

Layer-only phases are permitted only for narrowly bounded enabling work with explicit consumers in the next milestone.

### 8.2 Smallest End-to-End Slice

Candidate first product slice:

```txt
manually create one Task
→ task appears in Today
→ complete Task
→ deterministic canonical state changes
→ event and outbox records persist
→ frontend reflects CommandResult
```

This slice must include auth/ownership, versioning, failure handling, and basic observability.

### 8.3 Proposed Milestone Sequence

Before Workstream I approval, M1–M9 were entirely `PROVISIONAL`. Workstream I approval makes M1–M8 and their implementation gates authoritative for planning. M9's structure is approved, but M9 cannot pass, authorize pilot exposure, or make the full roadmap final until Workstream J approves the pilot-readiness package and the final Discussion 022 resolution is published.

#### M0 — Reconciliation and Map Baseline

Deliverables:

- verified legacy reconciliation input — completed,
- [[02-Decisions/accepted-decision-inventory-001-021|accepted decision inventory]] — completed,
- [[04-Specs/ai-native-mvp-baseline|final MVP baseline]] — completed,
- migrated and verified Mind Map,
- authoritative discussion index.

Exit gate:

- Workstreams A–E pass,
- no implementation-blocking contradiction remains.

#### M1 — Delivery and Domain Foundation

Deliverables:

- repository and environment conventions,
- authentication and ownership baseline,
- canonical identifiers and version fields,
- transaction boundary conventions,
- transactional outbox foundation,
- event envelope and observability baseline,
- API error envelope,
- test infrastructure,
- migration strategy.

Exit gate:

- foundation supports M2 without introducing mock domain behavior that must later be discarded.

#### M2 — Manual Plan → Today → Complete

Deliverables:

- manual Task creation and editing,
- Today projection,
- completion flow,
- CommandResult boundary,
- idempotency and stale-version handling,
- events and pilot-compatible instrumentation for this slice.

Exit gate:

- complete end-to-end slice passes product, contract, concurrency, accessibility, and observability tests.

#### M3 — Routine Generation and Execution

Deliverables:

- Routine definition,
- occurrence generation,
- Today integration,
- completion/skip semantics,
- timezone and recurrence handling,
- relevant events and tests.

Exit gate:

- occurrence generation and execution invariants pass deterministic tests across timezone and boundary cases.

#### M4 — PlanningDraft Flow with Deterministic Mock Provider

Deliverables:

- PlanningAttempt lifecycle,
- reviewable PlanningDraft lifecycle,
- immutable revisions,
- server-authoritative preview,
- edit and confirmation flow,
- CommandResult linkage,
- cancellation and stale-result handling,
- deterministic mock AI adapter producing fixed valid/invalid fixtures.

Exit gate:

- complete API/frontend/domain flow works before real provider integration,
- invalid or partial fixture output never creates a reviewable resource.

#### M5 — Real AI Planning Runtime

Deliverables:

- runtime ports from 020A,
- bounded context builder,
- pinned artifact bundle,
- structured-output pipeline from 020C,
- retry, timeout, rate limit, circuit breaker, spend cap, and kill switches,
- safety classification and crisis fallback integration,
- operational dashboards and alerts.

Exit gate:

- all 020A–020C architecture and adversarial tests pass,
- manual planning remains fully available,
- crisis safety readiness preconditions relevant to Planning pass.

#### M6 — Deterministic Reconcile

Deliverables:

- deterministic facts and rule matches,
- severity classifier,
- Light/Medium/Recovery behavior,
- manual resolution paths,
- degraded and unavailable states,
- event and metric support.

Exit gate:

- Reconcile produces no AI dependency for facts,
- manual escape succeeds for all designed failure states,
- deterministic failure never falls back to raw-data AI summary.

#### M7 — AI Reconcile Explanation

Deliverables:

- explanation-only AI context,
- no free-text raw data where prohibited,
- recommendation review and disposition,
- confirmation and CommandResult boundaries,
- degraded facts-only mode,
- cancellation and validation behavior.

Exit gate:

- AI cannot create canonical facts or mutation authority,
- facts-only Reconcile remains usable when AI is unavailable.

#### M8 — Validation Instrumentation and Pilot Operations Completion

Deliverables:

- complete Discussion 021 metric mapping,
- denominator verification,
- severity segmentation,
- qualitative research workflow,
- regret attribution workflow,
- trust quiz and behavioral cross-check,
- pilot dashboards,
- incident and rollback runbooks,
- privacy and retention verification.

Exit gate:

- every pilot metric can be reproduced from accepted events,
- missing-data behavior is known,
- no restricted crisis data enters ordinary analytics.

#### M9 — Pilot Readiness and Controlled Rollout

Deliverables:

- crisis safety readiness sign-off,
- security and privacy review,
- provider spend cap verification,
- kill-switch drill,
- backup/manual paths,
- support procedures,
- pilot cohort and consent readiness,
- frozen threshold package,
- rollout and rollback checklist.

Exit gate:

- every hard gate in Discussion 021 passes,
- unresolved pilot risks have explicit owners and accepted disposition.

### 8.4 Cross-Cutting Requirements

These begin no later than M1 and evolve with each slice:

- authorization,
- accessibility,
- event instrumentation,
- logs and traces,
- privacy and retention,
- deterministic test fixtures,
- schema and migration discipline,
- idempotency,
- cancellation,
- failure-state UX,
- security review,
- documentation and traceability.

They may not be postponed to M8 or M9.

---

## 9. Team Ownership Model

Assumed core team:

- Product/Frontend owner
- Backend owner
- Product designer

Additional review roles may be part-time or external:

- Safety/Policy reviewer
- Security/Privacy reviewer
- Pilot research owner

### 9.1 Responsibility Rules

Every milestone must identify:

```txt
accountableOwner
frontendOwner
backendOwner
designOwner
reviewers
dependencies
handoffArtifacts
exitGateApprovers
```

### 9.2 Parallel Work

Parallel work is allowed when contracts are explicit.

Examples:

- design may define review, confirmation, failure, degraded, and cancellation states while backend implements domain handlers,
- frontend may build against versioned mock contracts while backend implements the same accepted schema,
- backend may build runtime adapters while frontend completes PlanningDraft state machines using deterministic mock attempts,
- pilot instrumentation design may proceed alongside feature implementation, but event schemas must be accepted before feature code is considered complete.

Parallelism must not create competing contract versions.

---

## 10. Contract and Migration Freeze Policy

### 10.1 Freeze Levels

Use these levels:

- `DRAFT`
- `SLICE_LOCKED`
- `PILOT_LOCKED`
- `POST_PILOT_CHANGE`

### 10.2 Slice Lock

Before frontend/backend integration for a milestone:

- resource schemas,
- command contracts,
- error codes,
- event names and required fields,
- version semantics,
- migration assumptions

must be `SLICE_LOCKED`.

Changes require explicit amendment and coordinated consumer updates.

### 10.3 Pilot Lock

Before M9:

- externally observed API behavior,
- pilot event semantics,
- metric denominators,
- severity classifier version,
- threshold package,
- safety policy and crisis copy,
- runtime artifact versions

must be `PILOT_LOCKED`.

Emergency safety changes remain allowed but must be audited and included in pilot analysis.

---

## 11. Reusable, Amended, and Superseded Work

Existing implementation work must be classified separately from product decisions.

Statuses:

- `REUSE_AS_IS`
- `REUSE_WITH_TESTS`
- `AMEND`
- `MIGRATE`
- `REPLACE`
- `REMOVE`
- `UNKNOWN_UNTIL_AUDIT`

Evaluation criteria:

- compatibility with accepted domain model,
- ownership and authorization correctness,
- version and concurrency behavior,
- API and error-envelope compatibility,
- event and observability support,
- AI authority boundaries,
- privacy and retention compliance,
- testability,
- cost of adapting versus replacing.

A reusable UI component does not imply its old flow remains valid. A reusable persistence table does not imply its old lifecycle semantics remain valid.

Required output: **Implementation Reuse and Supersession Matrix**.

---

## 12. Test Strategy by Layer and Slice

Every milestone defines required tests in these categories:

- domain invariants,
- command and transaction behavior,
- concurrency and idempotency,
- API contract,
- frontend state machine,
- accessibility,
- persistence and migrations,
- event/outbox delivery,
- observability,
- privacy and retention,
- safety and adversarial behavior,
- end-to-end user flow,
- rollback and kill-switch behavior where applicable.

### 12.1 AI-Specific Test Families

- structured-output conformance,
- invalid and partial output rejection,
- temporary-reference graph validation,
- prompt-injection resistance,
- context-scope enforcement,
- cancellation race,
- timeout and retry limits,
- no hidden retry,
- spend-cap enforcement,
- provider-unavailable degraded mode,
- no direct mutation authority,
- crisis routing and zero proposal leakage.

### 12.2 Pilot Metric Test Families

- exact numerator and denominator reproduction,
- exclusion handling,
- duplicate attempt handling,
- user-level weighting,
- severity segmentation,
- missing-data classification,
- regret attribution categories,
- trust quiz/behavior mismatch reporting,
- restricted-event exclusion from ordinary analytics.

---

## 13. Scope-Cut Ladder

Scope cuts must be ordered from safest to most thesis-threatening.

### Level 1 — Presentation and Convenience Cuts

Examples:

- non-essential visual polish,
- secondary filters,
- optional personalization,
- advanced export,
- non-critical dashboards.

### Level 2 — Breadth Cuts

Examples:

- reduce supported entity combinations,
- limit Routine recurrence patterns,
- limit AI Planning operation families,
- pilot only one locale while preserving safe fallback behavior,
- limit Recovery complexity while retaining deterministic manual resolution.

### Level 3 — Capability Deferral

Examples requiring explicit validation impact review:

- defer AI Reconcile explanation while keeping deterministic Reconcile,
- pilot AI Planning for a narrower planning scenario,
- defer lower-priority analytics not required by Discussion 021.

### Level 4 — Thesis-Breaking Cuts

Forbidden without reopening source discussions:

- remove Today execution,
- remove Adapt/Reconcile,
- remove manual fallback,
- remove confirmation and deterministic command boundaries,
- weaken crisis or safety gates,
- remove events required to judge the pilot,
- permit direct AI mutation,
- collapse accepted and applied states.

Every proposed cut records:

```txt
cutId
removedScope
reason
savedCostOrTime
hypothesisImpact
metricImpact
safetyImpact
mapChanges
sourceDiscussionsToReopen
approvers
```

---

## 14. Pilot Readiness versus Release Readiness

### 14.1 Pilot Readiness

Pilot readiness permits a bounded, consented, monitored cohort under accepted operational constraints.

It requires:

- final MVP baseline implemented,
- Mind Map and implementation traceability current,
- all Discussion 021 hard gates passing,
- crisis safety readiness passing,
- manual and degraded paths working,
- instrumentation and analysis package locked,
- support, incident, kill-switch, rollback, and spend-cap procedures tested,
- known limitations disclosed to participants,
- pilot-specific privacy and retention controls verified.

### 14.2 Release Readiness

Public or broader release requires additional evidence not decided merely by completing implementation:

- pilot decision gates support continuation,
- operational reliability is sustained,
- security/privacy findings are resolved,
- crisis and safety performance remains acceptable,
- support and cost models are viable,
- known pilot-only constraints are removed or explicitly retained,
- rollout strategy is approved.

Passing implementation milestones does not automatically pass release readiness.

---

## 15. Required Artifacts

Discussion 022 must produce or require:

1. Legacy Reconciliation and Supersession Record — completed in [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]
2. [[02-Decisions/accepted-decision-inventory-001-021|Accepted Decision Inventory]] — completed
3. Authoritative Discussion Index — completed inside the Accepted Decision Inventory
4. [[04-Specs/ai-native-mvp-baseline|Final MVP Baseline Matrix]] — completed
5. [[00-Canvas/Planner-Mindmap-Migration-Ledger|Mind Map Migration Ledger]] — approved, applied, and verified
6. [[02-Decisions/repository-artifact-migration-ledger|Repository Artifact Migration Ledger]] — applied and verified; M0 source-of-truth freeze complete
7. Updated and verified [[00-Canvas/Planner-Mindmap.canvas|repository Mind Map]]
8. [[05-Implementation/implementation-reuse-and-supersession-matrix|Implementation Reuse and Supersession Matrix]] — complete for the current repository; no implementation code is present
9. [[05-Implementation/dependency-graph|Dependency Graph]] — Workstream I approved
10. [[05-Implementation/milestone-exit-gate-plan|Milestone and Exit Gate Plan]] — Workstream I approved; M1–M8 authoritative for planning, M9 passage pending Workstream J
11. [[05-Implementation/ownership-matrix|Ownership Matrix]] — Workstream I approved; named implementation assignees required before applicable milestone entry
12. [[05-Implementation/contract-freeze-register|Contract Freeze Register]] — Workstream I approved; contracts remain `DRAFT` until their gates
13. [[05-Implementation/test-coverage-matrix|Test Coverage Matrix]] — Workstream I approved
14. [[05-Implementation/scope-cut-register|Scope-Cut Register]] — Workstream I approved; no individual scope cut approved by default
15. [[05-Implementation/pilot-readiness-checklist|Pilot Readiness Checklist]] — structure approved; all implementation evidence remains `NOT_STARTED`, decision `PILOT_NOT_READY`
16. [[05-Implementation/release-readiness-checklist|Release Readiness Checklist]] — structure approved; decision `RELEASE_NOT_READY`
17. [[05-Implementation/risk-contingency-register|Risk and Contingency Register]] — Workstream I approved; reassessment required at each gate

---

## 16. Resolution Sequence

Discussion 022 closes only after this order is completed:

```txt
A. reconcile Discussions 001–008; confirm Discussion 009 absence — COMPLETE
B. inventory Discussions 010–021 — COMPLETE
C. resolve conflicts and produce final MVP baseline — COMPLETE
D. create and approve migration ledger — COMPLETE
E. classify repository artifacts and approve the Repository Artifact Migration Ledger — COMPLETE
F. update and verify actual Mind Map — COMPLETE; structural and cross-role verification passed
G. migrate formal artifacts and verify map/repository consistency across roles — COMPLETE
H. classify reusable and superseded implementation work — COMPLETE; no in-scope implementation code exists, retained foundations and new-work areas classified
I. approve milestone sequence, ownership, exit gates, freezes, tests, scope cuts, and risks — COMPLETE; M1–M8 authoritative for planning, M9 structure approved but passage pending Workstream J
J. approve pilot- and release-readiness checklist structures — COMPLETE; readiness remains `NOT_READY`
K. publish final Discussion 022 resolution — COMPLETE
```

No remaining step may be marked complete solely because a future action was documented. Step A is complete because its consolidated record exists, its source dispositions are explicit, and the obsolete source files have been removed.

---

## 17. Remaining Execution Review Questions

The legacy-scope, Discussion 009, source-hierarchy, and historical-retention questions are resolved by the completed Workstream A record. The remaining review must answer:

1. Does the Accepted Decision Inventory capture every conflict, dependency, and missing artifact across Discussions 010–021?
2. Is the final MVP baseline sufficient to prevent implementation from omitting part of `Plan → Execute → Adapt`?
3. Which listed scope cuts are incorrectly classified as safe, conditional, or thesis-breaking?
4. Do mandatory Canvas node IDs and before/after file versions make the migration ledger sufficiently traceable?
5. Does the migration completeness gate prove that decisions were applied to the actual Canvas rather than merely listed?
6. Is the cross-role walkthrough adequate, and which concrete mismatch must fail it?
7. Is M0 correctly treated as a blocking milestone rather than documentation overhead?
8. Is the M1–M9 sequence genuinely vertical, or does it still hide layer-first implementation?
9. Should Routine precede PlanningDraft, or would another order reduce rework without weakening the complete loop?
10. Is deterministic mock AI introduced at the correct milestone and with sufficient fidelity?
11. Are events, observability, privacy, safety, and idempotency introduced early enough in every slice?
12. Are contract freeze levels and change procedures sufficient for parallel frontend, backend, and design work?
13. Does the reuse matrix safely separate reusable implementation from superseded behavior?
14. Are pilot readiness and release readiness separated strongly enough?
15. Which mandatory tests or operational drills are still missing before real-user exposure?
16. Could Discussion 022 close while any accepted `Mind Map Impact` item remains unapplied? The required answer is no; identify any loophole.
17. Which dependencies on Discussions 019–021 are not represented clearly enough in the milestones?
18. Does the crisis safety gate appear at the correct points in implementation and pilot readiness?
19. Is any new product behavior introduced by this plan without an authoritative source in Discussions 010–021?

---

## 18. Review Finding Format

```txt
Finding ID
Severity: Blocking | Important | Minor
Affected section
Concrete failure scenario
Why the current rule is incomplete or contradictory
Smallest coherent correction
Affected source discussions or Mind Map sections
```

Reviewers should prioritize:

- hidden conflicts among accepted decisions or stale formal artifacts,
- accidental reactivation of legacy behavior through reusable code or specifications,
- migration steps that can be marked complete without changing the repository Canvas,
- milestone sequencing that creates avoidable rework,
- missing cross-cutting safety or observability work,
- scope cuts that make the product thesis dishonest,
- pilot-readiness gaps.

---

## 19. Expected Final Resolution Outputs

The final resolution must contain:

- completed legacy reconciliation and supersession record,
- confirmation that no legacy `REQUIRES_REVIEW` item remains,
- accepted authoritative source index,
- accepted final MVP baseline,
- completed Mind Map migration evidence,
- verified map snapshot,
- accepted implementation milestone sequence,
- ownership and dependency model,
- exit gates,
- reusable/superseded implementation classification,
- test strategy,
- scope-cut ladder,
- pilot-readiness and release-readiness gates,
- remaining open questions,
- affected specifications and ADRs.

Discussion 022 is not resolved merely by approving this plan. It is resolved when the reconciliation and Mind Map migration work has actually been completed and the resulting implementation plan is accepted.

---

## 20. Final Resolution

### Resolution state

Discussion 022 is closed. The planning baseline and M1–M8 implementation-planning sequence are accepted.

```txt
Legacy reconciliation:                         COMPLETE
Accepted-decision inventory:                   COMPLETE
AI-native MVP baseline:                        COMPLETE
Mind Map migration and verification:           COMPLETE
Repository artifact migration/verification:    COMPLETE
M0 source-of-truth freeze:                     COMPLETE
Implementation reuse classification:           COMPLETE
Workstream I planning package:                 APPROVED
M1–M8 implementation-planning authority:       ACTIVE
Workstream J checklist structures:             APPROVED
M9 pilot-readiness passage:                    NOT PASSED
Pilot readiness:                               NOT_READY
Public release readiness:                      NOT_READY
```

### Accepted authority and artifacts

- Detailed product/runtime/safety/validation behavior remains owned by authoritative closed Discussions 010–021 and their explicit ownership boundaries.
- Narrow retained compatibility behavior remains owned by [[01-Closed-Discussions/001-008-legacy-surviving-decisions]].
- [[02-Decisions/accepted-decision-inventory-001-021]] is the accepted decision index.
- [[04-Specs/ai-native-mvp-baseline]] is the accepted scope projection.
- [[00-Canvas/Planner-Mindmap.canvas]] is the migrated and verified visual projection.
- [[02-Decisions/repository-artifact-migration-ledger]] records the verified repository migration and M0 freeze.
- [[05-Implementation/implementation-reuse-and-supersession-matrix]] records the current no-code audit and reuse boundaries.
- [[05-Implementation/workstream-i-approval-package]] governs M1–M8 planning, dependencies, ownership, freezes, tests, scope cuts, and risks.
- [[05-Implementation/workstream-j-approval-package]] governs readiness criteria without asserting readiness.

### Implementation authority

M1–M8 may be used for implementation planning in the accepted dependency order. This authority does not waive:

- named assignees before milestone entry;
- milestone-specific configuration packages;
- `SLICE_LOCKED` and `PILOT_LOCKED` contracts;
- required tests and exit evidence;
- safety, privacy, security, accessibility, reliability, evidence, and manual-escape gates;
- explicit amendments when accepted product behavior would change.

M9 cannot pass and real-user AI exposure is not authorized until every applicable hard gate in [[05-Implementation/pilot-readiness-checklist]] is `PASS` with durable evidence and final approver signatures.

Public release remains separately governed by [[05-Implementation/release-readiness-checklist]]. Passing implementation milestones or pilot readiness does not automatically authorize public release.

### Remaining open items

No product-semantic question remains open. Remaining work consists of implementation, named assignments, configuration packages, locked contracts, test evidence, operational readiness, pilot evidence, and release evidence at their recorded gates.

Any future behavior change must amend or reopen its owning accepted decision rather than silently editing a projection, milestone, Canvas node, or implementation detail.
