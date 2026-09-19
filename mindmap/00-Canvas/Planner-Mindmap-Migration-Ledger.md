# Planner Mind Map Migration Ledger

## Status

Prepared for Discussion 022 Workstream D review. **Not yet applied.**

This ledger defines the complete migration from the stale legacy Canvas to the accepted AI-native MVP baseline. Creating this file does not modify the Canvas and does not complete Workstream D.

---

## 1. Migration Snapshot

| Field | Value |
|---|---|
| `mapFile` | [[00-Canvas/Planner-Mindmap.canvas]] |
| `mapVersionBefore` | `sha256:dd5e3a397f635dc1e3ecd161641697709c3dce06d88bb2e25f39fda4c32e4ebe` |
| `mapVersionAfter` | `sha256:761ad362a004b7ee314be0ffe12c28ae665d95866fbc0b9891f13a3dd0ba27a8` |
| Current node count | 16 |
| Current edge count | 17 |
| Decision source | [[02-Decisions/accepted-decision-inventory-001-021]] |
| Baseline source | [[04-Specs/ai-native-mvp-baseline]] |
| Implementation owner | Product/Frontend owner |
| Required reviewers | Product owner; Product designer; Frontend owner; Backend owner |
| Mandatory conditional reviewers | Safety/Policy for AI, guardrail, failure, crisis, and high-risk flow items; Security/Privacy for authentication, ownership, restricted events, access, privacy, and retention items; Pilot Research for evidence, metric, threshold, and pilot-gate items |
| Default item status | `READY_FOR_REVIEW` |

The recorded `mapVersionAfter` is the migrated Canvas produced on `2026-07-22`. Workstream D application is complete; Workstream E cross-role visual verification remains pending.

---

## 2. Current Canvas Audit

| Current node ID | Current meaning | Finding | Planned action |
|---|---|---|---|
| `vision` | Adaptive Life OS; Reconcile first; AI in Phase 2 | Directly contradicts D010 and B-01 | `UPDATE_NODE` |
| `mvp-loop` | Links to old Done/Carry/Drop loop | Superseded product loop | `UPDATE_NODE` |
| `target-jtbd` | Links to demographic legacy target spec | Not an accepted current target definition | `UPDATE_NODE` |
| `scope` | Links to superseded `mvp-scope.md` | Wrong scope authority | `UPDATE_NODE` |
| `guardrails` | Links to old broad guardrail spec | Partial and missing final authority/runtime/crisis rules | `UPDATE_NODE` |
| `events` | Links to old event taxonomy | Superseded by Discussion 019C | `UPDATE_NODE` |
| `metrics` | Links to Reconcile-first metrics | Superseded by H1/H2 validation contract | `UPDATE_NODE` |
| `validation-plan` | Links to sequential manual-first validation | Superseded by Discussion 021 | `UPDATE_NODE` |
| `week1-model` | Old Week-1 scoring model | Not part of accepted baseline | `DELETE_NODE` |
| `research` | Research log | Retained as non-authoritative evidence | `MOVE_NODE` |
| `social-evidence` | Anecdotal evidence | Retained as non-authoritative evidence | `MOVE_NODE` |
| `discussion` | Deleted Discussion 001 | Broken and non-authoritative | `DELETE_NODE` |
| `discussion-002` | Deleted Discussion 002 | Broken and non-authoritative | `DELETE_NODE` |
| `decision` | Superseded ADR-001 | Wrong authority | `UPDATE_NODE` |
| `team` | Legacy team tasks and product assumptions | Outdated ownership model | `UPDATE_NODE` |
| `open-questions` | Resolved product questions | Entire list is obsolete | `UPDATE_NODE` |

### Audit result

- The existing map does not represent the accepted AI-native loop.
- It lacks Project, RoutineOccurrence, temporal checkpoints, deterministic Reconcile facts, authority/revalidation, persistence boundaries, runtime/API contracts, reliability/cost controls, and crisis hard gates.
- It links to deleted discussions and superseded formal artifacts.
- It treats resolved product questions as open and omits the real configuration/readiness register.
- It must not be incrementally patched around the old topology; the authority spine and relations require replacement.

---

## 3. Target Section and Layout Plan

The migrated Canvas uses twelve explicit group nodes so every required Discussion 022 map section is visible and reviewable.

| Group node ID | Label | Target grid zone | Child nodes |
|---|---|---|---|
| `grp-product-vision` | Product Vision | row 1, column 1 | `vision`, `target-jtbd` |
| `grp-mvp-core-loop` | MVP Core Loop | row 1, column 2 | `mvp-loop`, `scope` |
| `grp-user-flow` | User Flow | row 1, column 3 | `planning-flow`, `execution-flow`, `reconcile-flow` |
| `grp-ai-responsibilities` | AI Responsibilities | row 1, column 4 | `ai-responsibilities`, `authority-confirmation` |
| `grp-ai-guardrails` | AI Guardrails | row 2, column 1 | `guardrails`, `safety-failure` |
| `grp-data-model` | Data Model / Domain Concepts | row 2, column 2 | `product-model`, `temporal-model`, `transactions` |
| `grp-data-events` | Data Events and Observability | row 2, column 3 | `events` |
| `grp-traction-metrics` | Traction Metrics and Gates | row 2, column 4 | `metrics`, `validation-plan`, `pilot-readiness` |
| `grp-current-decisions` | Current Decisions | row 3, column 1 | `decision`, `removed-postpilot` |
| `grp-open-questions` | Open Configuration / Readiness | row 3, column 2 | `open-questions` |
| `grp-implementation` | Implementation / Delivery Plan | row 3, column 3 | `implementation-plan`, `runtime-api`, `team` |
| `grp-references` | References and Study Needs | row 3, column 4 | `research`, `social-evidence` |

### Exact group geometry

All geometry is expressed in Obsidian Canvas coordinates. Groups use `type: group`. Coordinates are binding for initial application; post-application movement requires an amended ledger item and must preserve containment and reading order.

| Group node ID | x | y | width | height |
|---|---:|---:|---:|---:|
| `grp-product-vision` | 0 | 0 | 1280 | 840 |
| `grp-mvp-core-loop` | 1440 | 0 | 1280 | 840 |
| `grp-user-flow` | 2880 | 0 | 1280 | 840 |
| `grp-ai-responsibilities` | 4320 | 0 | 1280 | 840 |
| `grp-ai-guardrails` | 0 | 1000 | 1280 | 840 |
| `grp-data-model` | 1440 | 1000 | 1280 | 840 |
| `grp-data-events` | 2880 | 1000 | 1280 | 840 |
| `grp-traction-metrics` | 4320 | 1000 | 1280 | 840 |
| `grp-current-decisions` | 0 | 2000 | 1280 | 840 |
| `grp-open-questions` | 1440 | 2000 | 1280 | 840 |
| `grp-implementation` | 2880 | 2000 | 1280 | 840 |
| `grp-references` | 4320 | 2000 | 1280 | 840 |

### Exact child-node geometry

Text nodes use the payloads in Section 8. File nodes retain the paths specified in Sections 6 and 7. Every child has at least 40 px interior clearance from its group boundary and at least 40 px separation from adjacent children.

| Node ID | x | y | width | height |
|---|---:|---:|---:|---:|
| `vision` | 60 | 100 | 540 | 640 |
| `target-jtbd` | 660 | 100 | 540 | 640 |
| `mvp-loop` | 1500 | 100 | 540 | 640 |
| `scope` | 2100 | 100 | 540 | 640 |
| `planning-flow` | 2920 | 100 | 360 | 640 |
| `execution-flow` | 3320 | 100 | 360 | 640 |
| `reconcile-flow` | 3720 | 100 | 360 | 640 |
| `ai-responsibilities` | 4380 | 100 | 540 | 640 |
| `authority-confirmation` | 4980 | 100 | 540 | 640 |
| `guardrails` | 60 | 1100 | 540 | 640 |
| `safety-failure` | 660 | 1100 | 540 | 640 |
| `product-model` | 1480 | 1100 | 360 | 640 |
| `temporal-model` | 1880 | 1100 | 360 | 640 |
| `transactions` | 2280 | 1100 | 360 | 640 |
| `events` | 2940 | 1100 | 1160 | 640 |
| `metrics` | 4360 | 1100 | 360 | 640 |
| `validation-plan` | 4760 | 1100 | 360 | 640 |
| `pilot-readiness` | 5160 | 1100 | 360 | 640 |
| `decision` | 60 | 2100 | 540 | 640 |
| `removed-postpilot` | 660 | 2100 | 540 | 640 |
| `open-questions` | 1500 | 2100 | 1160 | 640 |
| `implementation-plan` | 2920 | 2100 | 360 | 640 |
| `runtime-api` | 3320 | 2100 | 360 | 640 |
| `team` | 3720 | 2100 | 360 | 640 |
| `research` | 4380 | 2100 | 540 | 640 |
| `social-evidence` | 4980 | 2100 | 540 | 640 |

Layout rules:

- left-to-right reading order is Product Vision → Core Loop → User Flow → AI Responsibilities;
- the second row contains constraints and evidence beneath the behavior they govern;
- the third row contains decisions, remaining configuration, delivery, and non-authoritative research;
- group nodes never overlap;
- all child nodes remain fully inside their target group bounds;
- relation lines must avoid crossing group titles and should use explicit edge labels where the relation is not obvious.

---

## 4. Decision-to-Node Coverage Matrix

| Accepted decisions / baseline rows | Required target nodes |
|---|---|
| `LEG-01` | `research`, `social-evidence` |
| `LEG-02` through `LEG-08`; `B-03`, `B-27` | `implementation-plan`, `runtime-api`, `team`, `events` |
| `D010-*`, `D011-*`; `B-01`, `B-02` | `vision`, `target-jtbd`, `mvp-loop`, `scope`, `decision` |
| `D012-*`, `D012A-*`; `B-05`, `B-06` | `product-model`, `temporal-model` |
| `D013-*`; `B-04`, `B-07` | `planning-flow`, `safety-failure` |
| `D014-*`, `D014A-*`; `B-08` | `planning-flow`, `temporal-model`, `authority-confirmation` |
| `D015-*`, `D015A-*`, `D015B-*`; `B-10` through `B-12` | `execution-flow`, `product-model`, `temporal-model`, `events` |
| `D016-*`, `D016A-*`; `B-13`, `B-14` | `reconcile-flow`, `temporal-model`, `metrics` |
| `D017-*`, `D017A-*`; `B-15`, `B-16` | `reconcile-flow`, `ai-responsibilities`, `authority-confirmation` |
| `D018-*`, `D018A-*`; `B-17`, `B-18` | `authority-confirmation`, `guardrails`, `safety-failure` |
| `D019A-*`; `B-05`, `B-06` | `product-model`, `temporal-model` |
| `D019B-*`; `B-09`, `B-19` | `transactions`, `authority-confirmation`, `events` |
| `D019C-*`; `B-20`, `B-21`, `B-22` | `events`, `guardrails`, `metrics`, `runtime-api` |
| `D020A-*`, `D020B-*`, `D020C-*`; `B-22` through `B-24` | `runtime-api`, `ai-responsibilities`, `guardrails`, `planning-flow`, `reconcile-flow` |
| `D021-*`; `B-02`, `B-18`, `B-25` through `B-27` | `metrics`, `validation-plan`, `pilot-readiness`, `open-questions` |
| `B-28` | `decision`, `implementation-plan`, all group nodes |
| POST_PILOT, REMOVED, and UNRESOLVED registers | `removed-postpilot`, `open-questions`, `scope` |

Coverage rule: every decision ID has at least one node, but the map remains a projection. Field-level schema, test cases, retention tables, and endpoint details remain in linked source documents.

---

## 5. Group Creation Records

Common fields for every group, node, and relation record below:

```txt
mapFile: 00-Canvas/Planner-Mindmap.canvas
mapVersionBefore: sha256:dd5e3a397f635dc1e3ecd161641697709c3dce06d88bb2e25f39fda4c32e4ebe
mapVersionAfter: sha256:761ad362a004b7ee314be0ffe12c28ae665d95866fbc0b9891f13a3dd0ba27a8
owner: Product/Frontend owner
reviewer: Product owner + Product designer + Frontend owner + Backend owner, plus every mandatory conditional reviewer selected by the review matrix below
status: APPLIED_PENDING_VERIFICATION
evidenceLink: [[00-Canvas/Planner-Mindmap.canvas]] plus the record's target node or edge ID
```

`sourceDiscussion` is resolved from each row's `sourceDecision`: `LEG-*` resolves to [[01-Closed-Discussions/001-008-legacy-surviving-decisions]], `Dxxx-*` resolves through [[02-Decisions/accepted-decision-inventory-001-021]] to the matching authoritative closed discussion, `B-*` resolves through [[04-Specs/ai-native-mvp-baseline]] to its recorded authoritative source, and explicit Discussion 022 items resolve to [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]. The item-specific review lane in a row supplements the common owner and reviewer. During application, `evidenceLink` must be replaced with the resulting Canvas node or relation and the completed before/after hash record.

### Mandatory conditional review matrix

| Item scope | Mandatory reviewer | Items cannot become `APPLIED_VERIFIED` until |
|---|---|---|
| AI responsibilities, Planning/Reconcile AI paths, guardrails, failure, hostile input, crisis, and zero leakage | Safety/Policy | safety reviewer signs the exact visible payload and related edges |
| authentication, ownership, authorization, restricted events, access, privacy, retention, and incident boundaries | Security/Privacy | security/privacy reviewer signs the exact visible payload and linked authority |
| H1/H2 evidence, denominators, metrics, thresholds, regret, trust, manual escape, and pilot gates | Pilot Research | research reviewer signs the exact visible payload and evidence relations |

The Product, Design, Frontend, and Backend reviewers remain mandatory for the whole migrated map. Conditional approval is additive and may not be waived by a general reviewer.

| migrationItemId | sourceDecision | mapSection | targetNodeId | changeType | oldContent | newContent | linkedDependencies |
|---|---|---|---|---|---|---|---|
| `MM-GRP-001` | `D010-*`, `B-01` | Product Vision | `grp-product-vision` | `CREATE_NODE` | absent | group labelled `Product Vision` | none |
| `MM-GRP-002` | `D010-*`, `B-01` | MVP Core Loop | `grp-mvp-core-loop` | `CREATE_NODE` | absent | group labelled `MVP Core Loop` | `MM-GRP-001` |
| `MM-GRP-003` | `D013-*`–`D017-*` | User Flow | `grp-user-flow` | `CREATE_NODE` | absent | group labelled `User Flow` | `MM-GRP-002` |
| `MM-GRP-004` | `D017-*`, `D020A-*` | AI Responsibilities | `grp-ai-responsibilities` | `CREATE_NODE` | absent | group labelled `AI Responsibilities` | `MM-GRP-003` |
| `MM-GRP-005` | `D018-*`, `D018A-*`, `D020C-*` | AI Guardrails | `grp-ai-guardrails` | `CREATE_NODE` | absent | group labelled `AI Guardrails` | `MM-GRP-004` |
| `MM-GRP-006` | `D012-*`, `D019A-*`, `D019B-*` | Data Model | `grp-data-model` | `CREATE_NODE` | absent | group labelled `Data Model / Domain Concepts` | `MM-GRP-002` |
| `MM-GRP-007` | `D019C-*` | Data Events | `grp-data-events` | `CREATE_NODE` | absent | group labelled `Data Events and Observability` | `MM-GRP-006` |
| `MM-GRP-008` | `D021-*` | Traction Metrics | `grp-traction-metrics` | `CREATE_NODE` | absent | group labelled `Traction Metrics and Gates` | `MM-GRP-007` |
| `MM-GRP-009` | `D011-*`, `B-28` | Current Decisions | `grp-current-decisions` | `CREATE_NODE` | absent | group labelled `Current Decisions` | `MM-GRP-001` |
| `MM-GRP-010` | Baseline UNRESOLVED register | Open Questions | `grp-open-questions` | `CREATE_NODE` | absent | group labelled `Open Configuration / Readiness` | `MM-GRP-009` |
| `MM-GRP-011` | Discussion 022 | Implementation | `grp-implementation` | `CREATE_NODE` | absent | group labelled `Implementation / Delivery Plan` | `MM-GRP-009` |
| `MM-GRP-012` | `LEG-01` | References | `grp-references` | `CREATE_NODE` | absent | group labelled `References and Study Needs` | `MM-GRP-001` |

---

## 6. Existing Node Migration Records

| migrationItemId | sourceDecision | mapSection | targetNodeId | changeType | oldContent | newContent | targetGroup | review lane |
|---|---|---|---|---|---|---|---|---|
| `MM-NODE-001` | `D010-01`–`D010-04` | Product Vision | `vision` | `UPDATE_NODE` | Reconcile-first; AI Phase 2 | AI-native first value; complete Plan → Execute → Adapt; user authority | `grp-product-vision` | Product |
| `MM-NODE-002` | `D010-01`, `D011-01`, `B-01` | MVP Core Loop | `mvp-loop` | `UPDATE_NODE` | file link to old core loop | text node containing accepted end-to-end loop | `grp-mvp-core-loop` | Product + Design |
| `MM-NODE-003` | `B-02`, `D021-*` | Product Vision | `target-jtbd` | `UPDATE_NODE` | legacy demographic target file | functional pilot-user need state and non-diagnostic boundary | `grp-product-vision` | Product + Research |
| `MM-NODE-004` | `D011-*`, `B-01`–`B-28` | MVP Core Loop | `scope` | `UPDATE_NODE` | superseded `mvp-scope.md` | file link to `04-Specs/ai-native-mvp-baseline.md` | `grp-mvp-core-loop` | Product |
| `MM-NODE-005` | `D018-*`, `D018A-*`, `D020C-*`, `D021-07` | AI Guardrails | `guardrails` | `UPDATE_NODE` | old `ai-guardrails.md` link | visible summary of authority, privacy, hostile-input, crisis, no-tool, and hard-gate rules | `grp-ai-guardrails` | Safety + Engineering |
| `MM-NODE-006` | `D019C-*`, `B-20`, `B-21` | Data Events | `events` | `UPDATE_NODE` | old `event-taxonomy.md` link | file link to `01-Closed-Discussions/019c-events-ai-observability-and-retention.md` | `grp-data-events` | Backend + Research |
| `MM-NODE-007` | `D021-*`, `B-25` | Traction Metrics | `metrics` | `UPDATE_NODE` | Reconcile-first metrics file | text summary of H1/H2 funnels, denominators, regret, trust, manual escape, hard gates | `grp-traction-metrics` | Research + Product |
| `MM-NODE-008` | `D021-*` | Traction Metrics | `validation-plan` | `UPDATE_NODE` | old sequential validation plan | file link to `01-Closed-Discussions/021-validation-plan-and-decision-gates.md` | `grp-traction-metrics` | Research + Safety |
| `MM-NODE-009` | superseded legacy model | Traction Metrics | `week1-model` | `DELETE_NODE` | Week-1 evaluation model | removed; accepted metric model is Discussion 021 | none | Product + Research |
| `MM-NODE-010` | `LEG-01` | References | `research` | `MOVE_NODE` | valid research-log link in old layout | same file link, explicitly non-authoritative | `grp-references` | Research |
| `MM-NODE-011` | `LEG-01` | References | `social-evidence` | `MOVE_NODE` | valid anecdotal-evidence link in old layout | same file link, explicitly non-authoritative | `grp-references` | Research |
| `MM-NODE-012` | legacy source removed | Current Decisions | `discussion` | `DELETE_NODE` | broken Discussion 001 file node | removed; provenance remains in Git and consolidated legacy record | none | Product |
| `MM-NODE-013` | legacy source removed | Open Questions | `discussion-002` | `DELETE_NODE` | broken Discussion 002 file node | removed; no current decision authority | none | Product |
| `MM-NODE-014` | `D011-*`, `B-28` | Current Decisions | `decision` | `UPDATE_NODE` | superseded ADR-001 link | file link to `02-Decisions/accepted-decision-inventory-001-021.md` | `grp-current-decisions` | Product + Backend |
| `MM-NODE-015` | Discussion 022 §9 | Implementation | `team` | `UPDATE_NODE` | legacy task ownership | current Product/Frontend, Backend, Design, Safety, Security, and Research ownership model | `grp-implementation` | All roles |
| `MM-NODE-016` | Baseline UNRESOLVED register | Open Questions | `open-questions` | `UPDATE_NODE` | resolved legacy questions | only configuration, evidence, legal, ownership, and rollout packages still open | `grp-open-questions` | Product + Named owners |

---

## 7. New Semantic Node Records

| migrationItemId | sourceDecision | mapSection | targetNodeId | changeType | oldContent | newContent | targetGroup | review lane |
|---|---|---|---|---|---|---|---|---|
| `MM-NEW-001` | `D013-*`, `D014-*`, `D014A-*`, `B-07`, `B-08` | User Flow | `planning-flow` | `CREATE_NODE` | absent | bounded conversation → validated draft → review/edit → confirmation | `grp-user-flow` | Product + Design + Safety |
| `MM-NEW-002` | `D015-*`, `D015A-*`, `D015B-*`, `B-10`–`B-12` | User Flow | `execution-flow` | `CREATE_NODE` | absent | Today, Task actions, RoutineOccurrence, correction, and history | `grp-user-flow` | Product + Backend + Design |
| `MM-NEW-003` | `D016-*`, `D016A-*`, `D017-*`, `B-13`–`B-16` | User Flow | `reconcile-flow` | `CREATE_NODE` | absent | deterministic facts/severity → separate lanes → optional AI → confirmation | `grp-user-flow` | Product + Safety + Backend |
| `MM-NEW-004` | `D010-03`, `D017-*`, `D020A-*` | AI Responsibilities | `ai-responsibilities` | `CREATE_NODE` | absent | propose, classify, organize, explain; never authorize or mutate | `grp-ai-responsibilities` | Product + Safety |
| `MM-NEW-005` | `D018-*`, `D019B-*`, `D020B-*`, `B-09` | AI Responsibilities | `authority-confirmation` | `CREATE_NODE` | absent | preview → confirmation → revalidation → transaction → CommandResult | `grp-ai-responsibilities` | Product + Backend + Security |
| `MM-NEW-006` | `D018A-*`, `D021-07`, `B-17`, `B-18` | AI Guardrails | `safety-failure` | `CREATE_NODE` | absent | failure/manual escape, domain boundary, hostile input, crisis hard gate | `grp-ai-guardrails` | Safety + Engineering |
| `MM-NEW-007` | `D012-*`, `D015-*`, `D019A-*`, `B-05` | Data Model | `product-model` | `CREATE_NODE` | absent | Goal, Project, Task, Routine, RoutineOccurrence; ownership and lifecycle | `grp-data-model` | Product + Backend |
| `MM-NEW-008` | `D012A-*`, `D014A-*`, `D015A-*`, `D015B-*`, `B-06` | Data Model | `temporal-model` | `CREATE_NODE` | absent | planned/review/deadline/target meanings, Backlog, local dates, checkpoints | `grp-data-model` | Product + Backend |
| `MM-NEW-009` | `D019B-*`, `B-19` | Data Model | `transactions` | `CREATE_NODE` | absent | concurrency, idempotency, locks, atomic bulk, staged parent transitions, outbox | `grp-data-model` | Backend |
| `MM-NEW-010` | `D021-*`, `B-25`–`B-27` | Traction Metrics | `pilot-readiness` | `CREATE_NODE` | absent | thresholds, crisis sign-off, privacy/reliability gates, runbooks and drills | `grp-traction-metrics` | Research + Safety + Engineering |
| `MM-NEW-011` | Baseline POST_PILOT and REMOVED registers | Current Decisions | `removed-postpilot` | `CREATE_NODE` | absent | explicit deferred, removed, and forbidden scope | `grp-current-decisions` | Product |
| `MM-NEW-012` | Discussion 022 Workstreams D–J; `B-28` | Implementation | `implementation-plan` | `CREATE_NODE` | absent | file link to `01-Closed-Discussions/022-updated-mvp-implementation-plan.md` | `grp-implementation` | All roles |
| `MM-NEW-013` | `D020A-*`, `D020B-*`, `D020C-*`, `B-22`–`B-24` | Implementation | `runtime-api` | `CREATE_NODE` | absent | provider-neutral ports, no tools, API states, validation gates, cost controls | `grp-implementation` | Backend + Frontend + Safety |

---

## 8. Target Text Payloads

The following text is the approved content target for text nodes. Formatting may wrap visually, but wording and linked authority must not change during application.

### `vision`

```md
# Adaptive Planner — AI-Native MVP

Turn an intention into a credible plan, help the user execute it, and adapt when reality diverges.

Planning is the first-value engine. Today creates evidence. Reconcile is the adaptation engine.

AI reduces decision space; the user authorizes consequences.
```

### `target-jtbd`

```md
# Target Pilot Need State

Participants bring a real goal, responsibility, or planning intention; review AI proposals; execute through Today; and may need adaptation after plan drift.

The product does not infer diagnosis, motivation, capacity, personality, or Goal achievement.

Source: [[04-Specs/ai-native-mvp-baseline#1. Target Pilot User]]
```

### `mvp-loop`

```md
# MVP Core Loop

Intention
→ bounded Planning conversation
→ validated PlanningDraft
→ review + confirmation
→ deterministic commit
→ Today execution
→ deterministic Reconcile
→ optional bounded AI explanation
→ confirmed adaptation
→ CommandResult + events
```

### `guardrails`

```md
# AI Guardrails

- no direct mutation, repositories, commands, or model tools
- no stale confirmation or silent intent-changing repair
- no raw/free-text Reconcile context
- no diagnosis, hidden capacity/motivation, Goal-achievement, or causal inference
- imported content is data, never instruction
- crisis path produces zero proposal/explanation/confirmation/mutation leakage
- manual and deterministic paths remain available

Sources: [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]], [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]], [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]], [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]
```

### `metrics`

```md
# H1 / H2 Evidence

H1: useful, credible, non-trivial first plan.
H2: understandable, user-approved Reconcile decisions without replacing facts or authority.

Keep exposure, valid output, reviewable resource, disposition, command, and CommandResult separate.

Track edited vs unchanged acceptance, application success, regret attribution, trust/behavior mismatch, severity bands, and Manual Escape Success.

Hard gates override positive conversion metrics.
```

### `team`

```md
# Ownership

- Product/Frontend: scope, contracts, UI integration, traceability
- Backend: domain, persistence, transactions, events, runtime, operations
- Product Design: flows, review/confirmation/failure states, accessibility
- Safety/Policy: crisis and high-risk boundaries
- Security/Privacy: auth, access, retention, incident review
- Pilot Research: metrics, thresholds, evidence, analysis

Every milestone names accountable owner, dependencies, reviewers, handoffs, and exit-gate approvers.
```

### `open-questions`

```md
# Open Configuration / Readiness

No product-semantic question remains.

Still required before applicable gates:
- pilot cohort, consent, locale, observation window, thresholds
- localized crisis resources and reviewer sign-offs
- OTP/JWT/SMS values
- provider/model/artifact and budget configuration
- retry/timeout/rate/circuit/spend limits
- retention/legal schedule
- UX chunk size, Undo duration, final copy
- package versions, migrations, owners, runbooks, rollback drills
```

### New text nodes

| Node ID | Required visible content |
|---|---|
| `planning-flow` | Entry may be global, contextual, manual, or free intention. Clarify only when material, normally ≤3 rounds. Draft is structured, bounded, editable, temporary, and never canonical before confirmation. |
| `execution-flow` | Today derives scheduled Tasks and today's pending RoutineOccurrences. Carry is explicit. Occurrences resolve Done/Missed and never carry. Stop/correction/Restore preserve history. |
| `reconcile-flow` | Derive facts → clean/deduplicate → calculate Light/Medium/Recovery → separate execution and commitment-review lanes → optional rule-gated AI → preview/confirmation → deterministic mutation. Today never blocks. |
| `ai-responsibilities` | AI may classify with closed vocabulary, propose bounded plans, organize allowed recommendations, and explain deterministic evidence. It may not create facts, authority, hidden causes, or mutation. |
| `authority-confirmation` | Auth + ownership → current state/version → server preview → visible consequences/warnings/selection → explicit confirmation → commit-time revalidation → atomic mutation/outbox → CommandResult. |
| `safety-failure` | Invalid/partial output is unusable. Failure closes mutation but preserves manual paths. Context is minimized. Hostile/imported input has no authority. Crisis requires fixed fallback, real localized resources, zero leakage, and human sign-off. |
| `product-model` | Goal, Project, Task, Routine, RoutineOccurrence. No canonical Plan. Exclusive ownership. Activity never proves Goal achievement. Terminal parent actions resolve children explicitly. |
| `temporal-model` | Active entities retain a future checkpoint. plannedDate ≠ reviewDate ≠ deadline ≠ targetDate. Backlog is explicit. REVIEW_DUE ≠ EXECUTION_OVERDUE. Routine identity uses local date. |
| `transactions` | Optimistic concurrency by default; scoped locks for cross-row invariants; deterministic lock order; idempotent replay; all-or-nothing bulk; staged parent terminal flow; atomic outbox intent. |
| `pilot-readiness` | Locked H1/H2 package, crisis corpus/resources/sign-offs, privacy/retention review, provider spend cap, kill-switch and rollback drills, support/incident procedures. Any hard-gate failure blocks pilot. |
| `removed-postpilot` | POST_PILOT: multi-slot Routine, broader recurrence, provider fallback, model tools, refresh/per-device sessions, PWA/offline, calendar/time blocks. REMOVED: canonical Plan, direct AI mutation, partial output, fuzzy repair, raw Reconcile text, old Reconcile-only MVP. |
| `runtime-api` | Separate AI ports; bounded/versioned context builders; no model tools; explicit Attempt/Draft/Session/Confirmation resources; polling/cancellation/refresh states; strict output gates; pinned artifacts; bounded cost/retry/rate/circuit controls. |

File nodes `scope`, `events`, `validation-plan`, `decision`, and `implementation-plan` use the exact file paths defined in Sections 6 and 7.

---

## 9. Legacy Relation Deletion Records

All current edges encode the old topology and must be deleted before target relations are created.

For every deletion row, the common fields in Section 5 apply. Additionally:

```txt
sourceDecision: legacy topology superseded by D010–D021 and B-01–B-28
sourceDiscussion: accepted-decision inventory plus the primary authorities it indexes
mapSection: the section(s) containing the old endpoints
targetNodeId: target edge ID in the row
oldContent: old relation in the row
newContent: relation absent
linkedDependencies: endpoint node deletion/update records
```

| migrationItemId | target edge ID | changeType | old relation |
|---|---|---|---|
| `MM-EDGE-DEL-001` | `e1` | `DELETE_RELATION` | `vision → mvp-loop` |
| `MM-EDGE-DEL-002` | `e2` | `DELETE_RELATION` | `vision → scope` |
| `MM-EDGE-DEL-003` | `e3` | `DELETE_RELATION` | `mvp-loop → guardrails` |
| `MM-EDGE-DEL-004` | `e4` | `DELETE_RELATION` | `mvp-loop → events` |
| `MM-EDGE-DEL-005` | `e5` | `DELETE_RELATION` | `events → metrics` |
| `MM-EDGE-DEL-006` | `e6` | `DELETE_RELATION` | `research → metrics` |
| `MM-EDGE-DEL-007` | `e7` | `DELETE_RELATION` | `discussion → decision` |
| `MM-EDGE-DEL-008` | `e8` | `DELETE_RELATION` | `decision → mvp-loop` |
| `MM-EDGE-DEL-009` | `e9` | `DELETE_RELATION` | `team → scope` |
| `MM-EDGE-DEL-010` | `e10` | `DELETE_RELATION` | `open-questions → discussion-002` |
| `MM-EDGE-DEL-011` | `e11` | `DELETE_RELATION` | `target-jtbd → scope` |
| `MM-EDGE-DEL-012` | `e12` | `DELETE_RELATION` | `metrics → week1-model` |
| `MM-EDGE-DEL-013` | `e13` | `DELETE_RELATION` | `social-evidence → research` |
| `MM-EDGE-DEL-014` | `e14` | `DELETE_RELATION` | `discussion-002 → scope` |
| `MM-EDGE-DEL-015` | `e15` | `DELETE_RELATION` | `discussion-002 → events` |
| `MM-EDGE-DEL-016` | `e16` | `DELETE_RELATION` | `validation-plan → metrics` |
| `MM-EDGE-DEL-017` | `e17` | `DELETE_RELATION` | `validation-plan → scope` |

Deleting a node must also verify that no edge still references its ID.

---

## 10. Target Relation Creation Records

For every creation row, the common fields in Section 5 apply. Additionally:

```txt
sourceDecision: source rationale in the row
sourceDiscussion: resolved through the accepted-decision inventory, baseline, or Discussion 022
mapSection: the section(s) containing the new endpoints
targetNodeId: proposed edge ID in the row
oldContent: absent
newContent: from, to, and label in the row
linkedDependencies: both endpoint node records must be applied first
```

| migrationItemId | proposed edge ID | changeType | from → to | label | source rationale |
|---|---|---|---|---|---|
| `MM-EDGE-NEW-001` | `mrel-001` | `CREATE_RELATION` | `vision → target-jtbd` | `serves` | D010; B-02 |
| `MM-EDGE-NEW-002` | `mrel-002` | `CREATE_RELATION` | `vision → mvp-loop` | `realized by` | D010; B-01 |
| `MM-EDGE-NEW-003` | `mrel-003` | `CREATE_RELATION` | `scope → mvp-loop` | `bounds` | D011; baseline |
| `MM-EDGE-NEW-004` | `mrel-004` | `CREATE_RELATION` | `mvp-loop → planning-flow` | `Plan` | D013–D014A |
| `MM-EDGE-NEW-005` | `mrel-005` | `CREATE_RELATION` | `planning-flow → execution-flow` | `approved plan` | D014–D015B |
| `MM-EDGE-NEW-006` | `mrel-006` | `CREATE_RELATION` | `execution-flow → reconcile-flow` | `execution evidence` | D015–D017 |
| `MM-EDGE-NEW-007` | `mrel-007` | `CREATE_RELATION` | `reconcile-flow → authority-confirmation` | `proposed adaptation` | D017–D018 |
| `MM-EDGE-NEW-008` | `mrel-008` | `CREATE_RELATION` | `authority-confirmation → execution-flow` | `committed adaptation` | D018–D019B |
| `MM-EDGE-NEW-009` | `mrel-009` | `CREATE_RELATION` | `ai-responsibilities → planning-flow` | `propose` | D013–D014 |
| `MM-EDGE-NEW-010` | `mrel-010` | `CREATE_RELATION` | `ai-responsibilities → reconcile-flow` | `explain` | D017 |
| `MM-EDGE-NEW-011` | `mrel-011` | `CREATE_RELATION` | `guardrails → ai-responsibilities` | `constrains` | D018A–D020C |
| `MM-EDGE-NEW-012` | `mrel-012` | `CREATE_RELATION` | `safety-failure → planning-flow` | `can stop` | D013; D018A |
| `MM-EDGE-NEW-013` | `mrel-013` | `CREATE_RELATION` | `safety-failure → reconcile-flow` | `degrade safely` | D018A; D020A |
| `MM-EDGE-NEW-014` | `mrel-014` | `CREATE_RELATION` | `product-model → planning-flow` | `proposal schema` | D012; D014 |
| `MM-EDGE-NEW-015` | `mrel-015` | `CREATE_RELATION` | `product-model → execution-flow` | `canonical state` | D015; D019A |
| `MM-EDGE-NEW-016` | `mrel-016` | `CREATE_RELATION` | `temporal-model → planning-flow` | `defaults + provenance` | D012A; D014A |
| `MM-EDGE-NEW-017` | `mrel-017` | `CREATE_RELATION` | `temporal-model → reconcile-flow` | `review vs overdue` | D015A; D016A |
| `MM-EDGE-NEW-018` | `mrel-018` | `CREATE_RELATION` | `transactions → authority-confirmation` | `commit correctness` | D019B |
| `MM-EDGE-NEW-019` | `mrel-019` | `CREATE_RELATION` | `transactions → events` | `atomic intent` | D019B–D019C |
| `MM-EDGE-NEW-020` | `mrel-020` | `CREATE_RELATION` | `events → metrics` | `evidence` | D019C–D021 |
| `MM-EDGE-NEW-021` | `mrel-021` | `CREATE_RELATION` | `validation-plan → metrics` | `defines` | D021 |
| `MM-EDGE-NEW-022` | `mrel-022` | `CREATE_RELATION` | `metrics → pilot-readiness` | `gates` | D021 |
| `MM-EDGE-NEW-023` | `mrel-023` | `CREATE_RELATION` | `runtime-api → planning-flow` | `implements` | D020A–D020C |
| `MM-EDGE-NEW-024` | `mrel-024` | `CREATE_RELATION` | `runtime-api → reconcile-flow` | `implements` | D020A–D020C |
| `MM-EDGE-NEW-025` | `mrel-025` | `CREATE_RELATION` | `decision → scope` | `authorizes` | inventory + baseline |
| `MM-EDGE-NEW-026` | `mrel-026` | `CREATE_RELATION` | `removed-postpilot → scope` | `excludes` | baseline registers |
| `MM-EDGE-NEW-027` | `mrel-027` | `CREATE_RELATION` | `implementation-plan → runtime-api` | `sequences` | Discussion 022 |
| `MM-EDGE-NEW-028` | `mrel-028` | `CREATE_RELATION` | `team → implementation-plan` | `owns` | Discussion 022 §9 |
| `MM-EDGE-NEW-029` | `mrel-029` | `CREATE_RELATION` | `open-questions → pilot-readiness` | `must resolve before gate` | baseline UNRESOLVED register |
| `MM-EDGE-NEW-030` | `mrel-030` | `CREATE_RELATION` | `research → metrics` | `supports, does not prove` | LEG-01 |
| `MM-EDGE-NEW-031` | `mrel-031` | `CREATE_RELATION` | `social-evidence → research` | `anecdotal input` | LEG-01 |

---

## 10A. Ledger Approval Record

Ledger approval authorizes application only against the exact `mapVersionBefore`. It does not certify the resulting Canvas; post-application verification remains separate.

| Review lane | Required reviewer | Decision | Reviewer identity | Review date | Exceptions or required amendments |
|---|---|---|---|---|---|
| Product | Product owner | `APPROVED` | Mahdi (repository owner; user-confirmed) | `2026-07-22` | none |
| Design | Product designer | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |
| Frontend | Frontend owner | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |
| Backend | Backend owner | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |
| Safety | Safety/Policy reviewer | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |
| Security/Privacy | Security/Privacy reviewer | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |
| Pilot Research | Pilot research owner | `APPROVED` | Mahdi (repository owner; user-confirmed for this review lane) | `2026-07-22` | none |

Allowed decisions are `APPROVED`, `APPROVED_WITH_RECORDED_AMENDMENTS`, and `REJECTED`. The ledger status becomes `APPROVED` only when every required lane has an approving decision, every amendment is incorporated, the Canvas hash is rechecked, and the approvers confirm the amended ledger version.

Current approval state: `APPROVED`. Every required review lane is approved with no recorded exception. Canvas application is authorized only while the live Canvas hash equals `mapVersionBefore`.

---

## 10B. Application Evidence

| Field | Result |
|---|---|
| Applied date | `2026-07-22` |
| Applied against | `sha256:dd5e3a397f635dc1e3ecd161641697709c3dce06d88bb2e25f39fda4c32e4ebe` |
| Resulting Canvas | `sha256:bfebc1583dbfb33cdbb94e54ebab353ddb5dc234595a8ce2643f764bdfbbaf6c` |
| Post-resolution Canvas | `sha256:761ad362a004b7ee314be0ffe12c28ae665d95866fbc0b9891f13a3dd0ba27a8` — implementation-plan file node updated from the open to closed Discussion 022 path; structure and semantics unchanged |
| Node result | 38 total: 12 groups, 19 text nodes, 7 file nodes |
| Relation result | 31 target relations; all 17 legacy relations absent |
| Deleted legacy nodes | `week1-model`, `discussion`, `discussion-002` absent |
| JSON parse | `PASS` |
| Unique node and edge IDs | `PASS` |
| Edge endpoint integrity | `PASS` |
| Group containment | `PASS` for all 26 child nodes |
| File-node path validation | `PASS` for all 7 file nodes |
| Structural migration status | `APPLIED_VERIFIED` |
| Cross-role visual walkthrough | `PASS` — verified by Mahdi as repository owner across all approved review lanes on `2026-07-22` |

Every group/node/relation record inherits this before/after hash evidence together with its stable target ID in [[00-Canvas/Planner-Mindmap.canvas]]. No ledger item was rejected or modified during application. With the completed cross-role walkthrough, every applied record is now `APPLIED_VERIFIED`.

---

## 11. Application Order

Apply only after ledger approval and in this order:

1. verify the current Canvas hash still equals `mapVersionBefore`;
2. create the twelve group nodes;
3. delete all legacy relations;
4. delete `week1-model`, `discussion`, and `discussion-002`;
5. update and relocate the eleven current nodes marked `UPDATE_NODE`;
6. move `research` and `social-evidence` into References;
7. create the thirteen new semantic nodes;
8. create the thirty-one target relations;
9. validate all file-node paths and wiki links inside text nodes;
10. validate that no edge references a missing node;
11. check every decision/baseline coverage row against at least one visible node;
12. perform Product, Design, Frontend, Backend, Safety, Security/Privacy, and Research walkthroughs;
13. record `mapVersionAfter`, dated snapshot, reviewer results, and rejected/modified ledger items.

If the Canvas hash changed before step 1, stop and regenerate the current-node and edge audit rather than applying this ledger to a different map version.

---

## 12. Verification Gates

### Structural gate

- all twelve target groups exist,
- deleted legacy nodes and edges are absent,
- every edge endpoint exists,
- all file nodes resolve,
- no active node links to a superseded discussion or formal artifact.

### Decision coverage gate

- every inventory family is represented,
- all 28 baseline rows map to at least one node,
- POST_PILOT, REMOVED, and UNRESOLVED registers are visible,
- no accepted invariant is represented only in a hidden link with misleading visible text.

### Role walkthrough gate

- Product can explain the complete MVP and scope boundary,
- Design can explain review, confirmation, failure, degraded, and cancellation states,
- Frontend can identify resources and state transitions,
- Backend can identify canonical state, transactions, events, runtime, and access boundaries,
- Safety can identify crisis, domain, hostile-input, and zero-leakage gates,
- Security/Privacy can identify authentication, access, restricted-event, privacy, retention, and incident boundaries,
- Research can reproduce the H1/H2 evidence and hard-gate structure.

Material disagreement fails verification and returns the affected ledger items to `READY_FOR_REVIEW`.

---

## 13. Completion State

Ledger preparation, Canvas application, structural validation, and cross-role inspection are complete.

```txt
Ledger written: YES
Canvas modified: YES
Ledger approved: YES
Migration applied: YES
Migration verified: YES
```

Discussion 022 Workstreams D and E are complete. The rendered Canvas passed the Product, Design, Frontend, Backend, Safety, Security/Privacy, and Research walkthrough under the repository owner's recorded verification.

---

## خلاصهٔ فارسی

Canvas فعلی ۱۶ node و ۱۷ edge دارد و ساختار آن متعلق به MVP قدیمی است. Vision هنوز Reconcile-first و AI در Phase 2 را نشان می‌دهد، فایل‌های scope، flow، event و validation قدیمی هستند و دو node نیز به Discussionهای حذف‌شدهٔ ۰۰۱ و ۰۰۲ وصل‌اند.

این Ledger نقشهٔ هدف را در ۱۲ بخش مشخص می‌کند: Product Vision، MVP Core Loop، User Flow، AI Responsibilities، AI Guardrails، Data Model، Data Events، Traction Metrics، Current Decisions، Open Configuration، Implementation و References. برای nodeهای فعلی نوع عملیات، محتوای جایگزین، گروه هدف و reviewer مشخص شده و ۱۳ node معنایی جدید، حذف سه node قدیمی، حذف ۱۷ relation قبلی و ایجاد ۳۱ relation جدید ثبت شده است.

تمام decision familyها و ۲۸ ردیف Baseline به nodeهای هدف متصل شده‌اند. Migration روی `Planner-Mindmap.canvas` اعمال شده و کنترل ساختار، linkها، endpointها، containment و hash با موفقیت انجام شده است. walkthrough بصری نقش‌های Product، Design، Frontend، Backend، Safety، Security/Privacy و Research نیز توسط مالک repository تأیید شده و verification نهایی کامل است.
