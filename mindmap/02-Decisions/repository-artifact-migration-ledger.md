# Repository Artifact Migration Ledger

## Status

`APPLIED_VERIFIED — M0 CLOSED; M1 CONFIGURATION PREPARATION ACTIVE`

This ledger controls migration of repository artifacts from the deprecated Reconcile-first Phase 1 MVP to the accepted AI-native MVP. It complements [[00-Canvas/Planner-Mindmap-Migration-Ledger]]; neither ledger replaces the other.

Creating or classifying a record does not make the target artifact current. An artifact becomes current only after its required action, review, link validation, and authority verification are complete.

### Review snapshot

| Field | Value |
|---|---|
| Git HEAD at classification | `f92d05c85753584abc0161d67e6ff5ece45cafa4` |
| Artifact manifest count | 67 Markdown/Canvas files, excluding this ledger |
| Artifact manifest SHA-256 | `76a40d50fe4b516486ebccdc3d20addd6dbfeecfc87a5695cebea7a6d2961a58` |
| Manifest algorithm | sort normalized repository-relative paths; create UTF-8 lines as `path<TAB>lowercase-file-sha256`; join with LF and no final LF; SHA-256 the resulting text |

Before classifications are approved or applied, regenerate this manifest. If it differs, review every changed artifact and update the affected records rather than applying stale classifications.

---

## 1. Governing authority

During migration, conflicts are resolved in this order:

1. authoritative closed Discussions 010–021 and their explicit ownership boundaries;
2. [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] for narrowly retained compatibility decisions only;
3. verified nodes in [[00-Canvas/Planner-Mindmap.canvas]] after the Canvas migration is applied and verified;
4. formal specifications and ADRs explicitly reconciled and adopted by Discussion 022;
5. older specifications, ADRs, plans, flows, sketches, and Git history as non-normative evidence only.

Navigation sources are [[README]], [[00-START-HERE]], [[02-Decisions/accepted-decision-inventory-001-021]], and [[04-Specs/ai-native-mvp-baseline]]. Navigation files summarize authority but do not create product behavior.

This hierarchy remains in force unless Discussion 022 explicitly amends it. Migrating a formal artifact does not authorize it to contradict its source decisions.

---

## 2. Record model

Every artifact record uses:

```txt
migrationItemId
artifactPath
artifactClass
currentStatus
currentAuthority
conflictingSections
action
replacementArtifact
sourceDecisions
owner
requiredReviewers
blockingMilestone
verification
status
evidence
```

The compact tables below instantiate these fields as follows:

- `Current status / conflict` supplies `currentStatus`, `currentAuthority`, and `conflictingSections`;
- `Action and replacement` supplies exactly one `action` and its `replacementArtifact`;
- `Source decisions`, `Owner / mandatory reviewers`, `Gate`, `Verification`, and `Status` supply their corresponding record fields;
- `artifactClass` is the table section containing the record;
- `evidence` is `PENDING_APPLICATION` until the record reaches `APPLIED_PENDING_VERIFICATION`, then must be replaced by a diff/commit link and verification result.

Allowed actions:

- `KEEP` — retain without behavioral change after verifying links and authority language.
- `AMEND` — preserve a bounded artifact while changing obsolete or incomplete sections.
- `REWRITE` — replace most content at the same path with a current specification.
- `ARCHIVE` — preserve only as clearly non-normative history and remove from active navigation.
- `DELETE` — remove when Git history is sufficient and no active reference needs the file.
- `REPLACE_WITH_REDIRECT` — replace the body with a short supersession notice pointing to current authority.

Allowed statuses:

- `CLASSIFIED`
- `READY_FOR_REVIEW`
- `APPROVED`
- `IN_PROGRESS`
- `APPLIED_PENDING_VERIFICATION`
- `APPLIED_VERIFIED`
- `REJECTED`
- `BLOCKED`

No record reaches `APPLIED_VERIFIED` until its required reviewers approve it and its verification rule passes.

---

## 3. Mandatory review policy

| Content | Mandatory reviewers |
|---|---|
| Product scope, terminology, lifecycle, and flows | Product + Product Design |
| Canonical model, API, transactions, events, and runtime | Backend + Frontend where consumed |
| AI authority, failure, hostile input, and crisis behavior | Safety/Policy |
| Authentication, access, restricted events, privacy, and retention | Security/Privacy |
| Metrics, thresholds, hypotheses, and pilot gates | Pilot Research |
| Milestones, ownership, dependencies, and release gates | All accountable role owners |

“Additional reviewer” is not sufficient for these lanes. If an artifact crosses multiple lanes, every applicable reviewer is mandatory.

---

## 4. Migration gates

### Gate R0 — Navigation safety

- README and Start Here identify the AI-native baseline and current authority.
- no active entry point says the deprecated Phase 1 is ready to implement;
- old ADRs, specs, flows, and plans have visible status warnings;
- active navigation does not send readers to legacy artifacts as current authority.

### Gate R1 — Classification completeness

- every repository artifact has a record or belongs to an explicitly covered authoritative family;
- every legacy artifact has an action, owner, source decisions, reviewers, and blocking milestone;
- every unresolved configuration family has gate ownership.

### Gate R2 — Authority migration

- current formal artifacts contain no active legacy product behavior;
- replacement artifacts trace to accepted decision IDs;
- retained technical material is separated from superseded behavior;
- no two active artifacts claim authority over the same behavior incompatibly.

### Gate R3 — Repository verification

- all wiki links and file-node paths resolve;
- repository search finds no unmarked implementation instruction for the deprecated MVP;
- Canvas and formal artifacts project the same baseline;
- cross-role walkthroughs pass;
- the final Discussion 022 resolution records the verified artifact set.

Canvas application may begin after R0 and R1 pass. M0 cannot pass until both the Canvas verification gate and R3 pass.

---

## 5. Authoritative and control artifacts

The closed Discussions 010–021 are covered as one immutable authority family: `KEEP`; no migration edit may silently change their accepted decisions. Any behavior change requires a new amendment or reopened discussion.

| ID | Artifact | Current status and authority | Action | Owner / mandatory reviewers | Gate | Verification | Status |
|---|---|---|---|---|---|---|---|
| `RAM-001` | `01-Closed-Discussions/010…021` | Primary detailed decision authority | `KEEP` | Product / applicable decision owners | M0 | Inventory paths and IDs resolve; no file was edited as migration cleanup | `APPLIED_VERIFIED` |
| `RAM-002` | `01-Closed-Discussions/001-008-legacy-surviving-decisions.md` | Narrow retained compatibility authority | `KEEP` | Product + Backend + Security/Privacy | M0 | Every legacy reuse cites a retained `LEG-*` decision | `APPLIED_VERIFIED` |
| `RAM-003` | `02-Decisions/accepted-decision-inventory-001-021.md` | Authoritative index and ownership map | `KEEP` | Product + Backend + Safety + Research | M0 | All indexed discussion paths and decision families resolve | `APPLIED_VERIFIED` |
| `RAM-004` | `04-Specs/ai-native-mvp-baseline.md` | Current scope projection | `KEEP` | Product + Design + Backend + Safety + Research | M0 | All 28 rows identify one primary authority, dependencies, and milestone/gate mapping | `APPLIED_VERIFIED` |
| `RAM-005` | `01-Closed-Discussions/022-updated-mvp-implementation-plan.md` | Closed final planning resolution; M1–M8 authoritative for planning, M9 readiness gated | `AMEND` | All accountable role owners | M0 | Final artifact handoff, planning authority, and readiness boundary are explicit | `APPLIED_VERIFIED` |
| `RAM-006` | `00-Canvas/Planner-Mindmap-Migration-Ledger.md` | Applied and verified Canvas migration control | `AMEND` | Product + Design + Backend; conditional Safety, Security/Privacy, Research | M0 | Geometry, relation fields, approvals, hashes, application, and walkthrough evidence recorded | `APPLIED_VERIFIED` |
| `RAM-007` | `02-Decisions/repository-artifact-migration-ledger.md` | Repository migration control | `KEEP` | Product + Backend + Design + Safety + Security/Privacy + Research | M0 | Application and cross-role semantic verification recorded | `APPLIED_VERIFIED` |
| `RAM-008` | `README.md` | Current navigation summary; not behavioral authority | `KEEP` | Product | M0 | Link check passes and state matches Discussion 022 | `APPLIED_VERIFIED` |
| `RAM-009` | `00-START-HERE.md` | Current onboarding/navigation; not behavioral authority | `KEEP` | Product + Design + Backend | M0 | Reading order resolves and no legacy implementation start remains | `APPLIED_VERIFIED` |
| `RAM-010` | `02-Decisions/gpt-review-standards.md` | Living review-process standard | `AMEND` | Product | M0 | Startup order points to current entry points and authority hierarchy | `APPLIED_VERIFIED` |
| `RAM-011` | `02-Decisions/claude-review-standards.md` | Living adversarial-review standard | `AMEND` | Product + Safety + Research | M0 | Review rules do not revive stale product assumptions | `APPLIED_VERIFIED` |

---

## 6. ADR migration records

| ID | Artifact | Conflicting or reusable content | Action and replacement | Source decisions | Owner / mandatory reviewers | Gate | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| `RAM-ADR-001` | `02-Decisions/ADR-001-reconcile-on-open.md` | Entire Reconcile-first core loop is superseded | `REPLACE_WITH_REDIRECT` → inventory, baseline, Discussions 016–018A | D010–D011; D016–D018A | Product + Design | M0 | Only historical explanation and current links remain | `APPLIED_VERIFIED` |
| `RAM-ADR-002` | `02-Decisions/ADR-002-phase-1-technical-foundation.md` | Retained framework/API/auth baseline mixed with obsolete PWA, event, AI-deferral, and sequencing rules | `REWRITE` as the post-022 technical-foundation ADR; later narrowly scoped ADRs may be referenced without changing this action | LEG-02–LEG-08; D019A–D020C | Backend + Frontend + Security/Privacy | M1 before `SLICE_LOCKED` | Rewritten and semantically approved; exact versions remain configuration | `APPLIED_VERIFIED` |
| `RAM-ADR-003` | `02-Decisions/ADR-003-phase-0-closure.md` | Body still claims old architecture authorizes coding | `REPLACE_WITH_REDIRECT` → Discussion 022 final resolution when published | D010–D011; B-28; Discussion 022 | Product + all role owners | M0 | No active readiness or authority claim remains | `APPLIED_VERIFIED` |

---

## 7. Formal specification migration records

| ID | Artifact | Current status / conflict | Action and replacement | Source decisions | Owner / mandatory reviewers | Gate | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| `RAM-SPEC-001` | `04-Specs/auth-phase-1.md` | Retained authentication contract with unresolved configuration values | `AMEND`; rename framing to current MVP and add configuration ownership | LEG-03–LEG-05; D018A; D019A–D019C | Backend + Security/Privacy + Frontend | M1 | Amended and semantically approved; configuration values remain | `APPLIED_VERIFIED` |
| `RAM-SPEC-002` | `04-Specs/api-contracts-phase-1.md` | Global/auth conventions partly reusable; product endpoints and Reconcile contract obsolete | `REWRITE` as the current API-contract index; it may link to bounded auth, Planning, command, and Reconcile contract modules | LEG-06; D018; D019B; D020B | Backend + Frontend + Security/Privacy | M1/M2; AI portions before M4 | Rewritten and semantically approved; exact slice schemas remain to lock | `APPLIED_VERIFIED` |
| `RAM-SPEC-003` | `04-Specs/data-model-phase-1.md` | Goal/Task-only persistence and old events contradict current canonical model | `REPLACE_WITH_REDIRECT` pending the M1 canonical schema/migration specification | D012–D012A; D015–D015B; D019A–D019C | Backend + Product + Security/Privacy | M1 | Unsafe legacy body removed; current authority and M1 handoff explicit | `APPLIED_VERIFIED` |
| `RAM-SPEC-004` | `04-Specs/event-taxonomy.md` | Legacy event list and scheduling model | `REPLACE_WITH_REDIRECT` → Discussion 019C until a current event catalog is generated | D019C; D021; LEG-08 | Backend + Research + Security/Privacy | M1 | Unsafe event list removed; catalog handoff explicit | `APPLIED_VERIFIED` |
| `RAM-SPEC-005` | `04-Specs/mvp-scope.md` | Explicitly superseded Reconcile-first scope | `REPLACE_WITH_REDIRECT` → `ai-native-mvp-baseline.md` | D010–D011; B-01–B-28 | Product + Design | M0 | No old scope table remains actionable | `APPLIED_VERIFIED` |
| `RAM-SPEC-006` | `04-Specs/ai-guardrails.md` | Useful principle but incomplete and contains obsolete question/output assumptions | `REWRITE` as current guardrail specification | D013–D014A; D017–D018A; D020A–D020C; D021 | Safety + Product + Backend + Security/Privacy | M4; crisis portions before M5/pilot | Rewritten and semantically approved | `APPLIED_VERIFIED` |
| `RAM-SPEC-007` | `04-Specs/day-0-onboarding.md` | Manual-first validation and old product model | `REWRITE` as AI-native first-run/Planning entry UX, preserving only source-backed low-friction principles | D010–D014A; B-02–B-08 | Product + Design + Safety | M4 | Rewritten and semantically approved | `APPLIED_VERIFIED` |
| `RAM-SPEC-008` | `04-Specs/reconcile-ux.md` | Old Done/Carry/Drop Reconcile-first UX | `REWRITE` as current deterministic and optional AI-assisted Reconcile UX | D015–D018A; D020B | Product + Design + Backend + Safety | M6 before `SLICE_LOCKED` | Rewritten and semantically approved | `APPLIED_VERIFIED` |
| `RAM-SPEC-009` | `04-Specs/metrics.md` | Reconcile-first metric model conflicts with H1/H2 contract | `REPLACE_WITH_REDIRECT` → Discussion 021 until a current metric catalog is produced | D019C; D021 | Research + Product + Safety + Security/Privacy | M1 instrumentation; final before pilot | Unsafe metric model removed; current evidence boundary explicit | `APPLIED_VERIFIED` |
| `RAM-SPEC-010` | `04-Specs/validation-plan.md` | Sequential manual-first → AI plan is superseded | `REPLACE_WITH_REDIRECT` → Discussion 021 until pilot protocol is instantiated | D021; B-25–B-27 | Research + Safety + Security/Privacy + Product | M9 before `PILOT_LOCKED` | Unsafe pilot sequence removed; protocol handoff explicit | `APPLIED_VERIFIED` |
| `RAM-SPEC-011` | `04-Specs/week-1-evaluation-model.md` | Old evaluation concept is outside accepted metric model | `ARCHIVE`; add a non-authoritative historical warning and remove it from active navigation and Canvas | D021 | Research + Product + Safety | M0 | Archived marker applied; absent from navigation and Canvas | `APPLIED_VERIFIED` |
| `RAM-SPEC-012` | `04-Specs/target-segment-jtbd.md` | Demographic assumptions are not the accepted functional pilot need state | `REWRITE` from baseline target-user boundary and validation cohort configuration | B-02; D021 | Product + Research + Safety | M0/pilot protocol | Rewritten and semantically approved; cohort configuration remains | `APPLIED_VERIFIED` |
| `RAM-SPEC-013` | `04-Specs/phase-1-implementation-stack.md` | Technical baseline partly retained; packages, versions, exclusions, and sequence are stale | `AMEND` after reuse audit; keep exact choices provisional | LEG-02; LEG-07; D019–D020C; Discussion 022 | Backend + Frontend + Security/Privacy | M1 before scaffold lock | Amended and semantically approved; exact versions/reuse remain | `APPLIED_VERIFIED` |

---

## 8. Flow, implementation, research, and reference records

| ID | Artifact | Current status / conflict | Action and replacement | Source decisions | Owner / mandatory reviewers | Gate | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| `RAM-FLOW-001` | `05-Flows/mvp-core-loop.md` | Old Reconcile-on-open Mermaid flow | `REWRITE` as Plan → Execute → Adapt flow after Canvas approval | D010–D020B; B-01 | Product + Design + Backend + Safety | M0 | Rewritten and semantically approved | `APPLIED_VERIFIED` |
| `RAM-IMPL-001` | `05-Implementation/phase-1-plan.md` | Legacy phase sequence and product scope | `REPLACE_WITH_REDIRECT` until final Discussion 022 plan is approved; later replace with accepted vertical milestone plan | Discussion 022 Workstreams F–J; B-28 | All accountable role owners | M0 | No team member can mistake old milestones for current instructions | `APPLIED_VERIFIED` |
| `RAM-RES-001` | `03-Research/research-log.md` | Non-authoritative evidence; some themes may no longer map to current hypotheses | `AMEND` with authority warning and current hypothesis/source mapping | LEG-01; D021 | Research + Product | Before pilot protocol | Authority boundary verified; detailed claim/source audit remains a pre-pilot research task | `APPLIED_VERIFIED` |
| `RAM-REF-001` | `06-References/social-evidence.md` | Appropriately marked anecdotal, but centered on old problem framing | `KEEP` with link/claim audit | LEG-01 | Research | M0 | Non-authoritative boundary verified; detailed claim audit remains a pre-pilot research task | `APPLIED_VERIFIED` |
| `RAM-CANVAS-001` | `00-Canvas/Planner-Mindmap.canvas` | Migrated and verified AI-native visual projection | Governed by the separate Canvas migration ledger | D010–D021; B-01–B-28 | Product + Design + Backend + Safety + Security/Privacy + Research | M0 | Structural, link, hash, and cross-role walkthrough gates passed | `APPLIED_VERIFIED` |

---

## 9. Unresolved configuration and readiness ownership

These are not unresolved product semantics. Defaults may not weaken accepted invariants. Exact named individuals and dates must be added before the applicable lock.

| Configuration family | Accountable role | Required reviewers | Required by | Default if undecided | Blocking gate | Destination artifact | Status |
|---|---|---|---|---|---|---|---|
| OTP lifetime, resend, attempts, cooldown, JWT lifetime, SMS provider | Reza | Mahdi | M1 auth foundation | No production enablement | `SLICE_LOCKED` for authenticated slice | auth spec + M1 configuration register + deployment config | `PROPOSED_VALUES`; Kavenegar `CONFIRMED` |
| Framework/package/image versions and database migrations | Reza (Backend) / Mahdi (Frontend) | consuming owner + Mahdi as Security/Privacy | M1 | No scaffold lock | M1 exit | stack spec + M1 configuration register + manifests | `PROPOSED_VALUES` |
| Retry, timeout, rate, circuit-breaker, cancellation, and concurrency limits | Backend | Frontend + Safety + Security/Privacy | M4 mock contract; final M5 | Fail closed; manual path remains | M5 exit | runtime/reliability spec + config | `UNASSIGNED_VALUES` |
| Provider, model, artifact bundle, token budget, unit-cost budget, and hard spend cap | Backend/Product | Safety + Security/Privacy | M5 | AI runtime disabled | M5 exit and `PILOT_LOCKED` | runtime spec + operations config | `UNASSIGNED_VALUES` |
| Planning clarification/chunk limits, draft TTL, confirmation TTL, Undo duration, final copy | Product | Design + Backend + Safety | M4/M6 as applicable | Feature remains behind internal gate | applicable slice lock | UX/contract specs | `UNASSIGNED_VALUES` |
| Reconcile numeric thresholds and rule parameters | Product | Backend + Research + Safety | M6 | Deterministic feature not pilot-enabled | M6 exit and `PILOT_LOCKED` | Reconcile rules spec + versioned config | `UNASSIGNED_VALUES` |
| Pilot cohort, locale, consent, observation window, thresholds, and analysis lock | Research | Product + Safety + Security/Privacy | M9 | Pilot blocked | `PILOT_LOCKED` | pilot protocol | `UNASSIGNED_VALUES` |
| Localized crisis resources, fixed copy, classifier thresholds, corpus, and human sign-offs | Safety | Product + Research + Security/Privacy | M5 testing; final M9 | AI crisis-sensitive paths disabled; pilot blocked | M5 crisis gate and `PILOT_LOCKED` | safety spec + crisis readiness package | `UNASSIGNED_VALUES` |
| Retention/deletion/legal schedule and restricted-event access | Security/Privacy | Backend + Research + Safety | M1 schema; final M9 | Collect no optional restricted data | M1 migration approval and `PILOT_LOCKED` | retention schedule + event catalog | `UNASSIGNED_VALUES` |
| Owners, alerts, incident response, support, rollback and kill-switch drills | Product/Backend by service | Safety + Security/Privacy + Research | M5/M9 | Affected feature or pilot remains disabled | milestone exit and `PILOT_LOCKED` | operations runbook + readiness checklist | `UNASSIGNED_VALUES` |

---

## 10. Application order

1. approve this ledger’s classifications and mandatory review policy;
2. finish R0 by verifying README and Start Here and adding unmistakable warnings/redirects to unsafe artifacts;
3. amend Discussion 022 to reference this ledger and mark M1–M9 `PROVISIONAL`;
4. finalize and approve the Canvas migration ledger;
5. apply and structurally verify the Canvas migration;
6. replace the old scope, ADR-001, ADR-003, event, metric, validation, implementation-plan, and core-loop bodies with current redirects or content;
7. audit retained authentication and stack material;
8. create current data, API, guardrail, onboarding/Planning, and Reconcile specifications in dependency order;
9. instantiate unresolved configuration values before their blocking milestone or keep the affected feature disabled;
10. run repository link, authority, stale-language, and cross-role walkthrough checks;
11. record final artifact statuses and evidence in this ledger;
12. complete R3 together with Canvas verification before M0 is closed.

---

## 11. Completion state

### Application evidence

Repository artifact classifications were approved for application by the repository owner and applied on `2026-07-22`.

```txt
unsafe legacy bodies replaced or archived: PASS
rewritten projections created:             PASS
navigation synchronized:                   PASS
all repository wiki links resolve:         PASS
unsafe legacy instruction search:          PASS (zero unmarked matches)
Canvas JSON/hash regression:               PASS
rewritten-content role walkthrough:        PASS — repository owner approval on `2026-07-22`
unresolved configuration packages:         PENDING BY MILESTONE
```

```txt
Ledger written:                         YES
Classifications approved:               YES
Navigation safety verified:             YES
Canvas migration applied:               YES
Canvas visual verification:             YES
Formal artifacts migrated:              YES
Configuration ownership instantiated:   YES FOR M1; VALUES PENDING APPROVAL
Repository verification passed:         YES
M0 source-of-truth freeze:               YES
```

Discussion 022 Workstreams A–K and repository gate R3 are complete. M1–M8 are authoritative for implementation planning; M9, pilot, and release remain gated and not ready. The active handoff is [[05-Implementation/m1-entry-package]].
