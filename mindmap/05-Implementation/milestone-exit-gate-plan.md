# Milestone and Exit-Gate Plan

## Status

`WORKSTREAM_I_APPROVED — M9 PASSAGE STILL REQUIRES WORKSTREAM_J`

No milestone starts merely because a date arrives. Entry dependencies, accountable owners, locked contracts, and exit evidence govern progression.

| Milestone | Outcome | Entry gate | Exit gate | Primary evidence |
|---|---|---|---|---|
| M0 | verified source-of-truth baseline | accepted decisions available | Canvas, artifacts, reuse matrix verified; source freeze complete | ledgers, hashes, walkthroughs |
| M1 | delivery/domain foundation | M0 | auth/ownership, IDs/versions, migrations, transaction/outbox/event/error/test foundation proven | integration, migration, security, concurrency tests |
| M2 | manual Task → Today → Complete | M1 contracts locked | end-to-end authenticated slice with idempotency, conflict, events and accessibility | E2E + event/CommandResult evidence |
| M3 | Routine generation/execution | M2 complete; Today contract available | deterministic local-date occurrence generation, Done/Missed, stop/continuation invariants | timezone/DST/uniqueness/property tests |
| M4 | PlanningDraft with mock provider | M2 | complete Attempt/Draft/revision/edit/preview/confirm/apply/failure flow; invalid output unusable | deterministic valid/invalid/race fixtures |
| M5 | real AI Planning runtime | M4 | pinned bounded runtime, strict gates, safety/reliability/cost controls; manual Planning available | architecture, adversarial, crisis, spend/kill tests |
| M6 | deterministic Reconcile | M2+M3; M4 contract compatible | facts, cleanup, severity, separate lanes, rules, preview/confirmation and Today access | classifier, rule, bulk, accessibility tests |
| M7 | AI-assisted Reconcile | M5+M6 | structured bounded explanation/recommendation with no authority leakage and manual escape | H2 contract/adversarial/application tests |
| M8 | evidence and operational readiness | instrumentation since M1; M5+M7 | metric dictionary/queries, dashboards, retention, runbooks, support, rollback and drills complete | reproducibility and drill records |
| M9 | pilot readiness | M8 | all hard gates pass; protocol/artifacts/thresholds/resources/owners locked | signed readiness checklist |

## Definition of done for every product slice

```txt
accepted behavior trace
design states and accessibility
frontend state machine
versioned API/command contract
domain invariants
persistence and migration
transaction/concurrency/idempotency
events/outbox and metric consumers
logs/traces/alerts
privacy/retention/access
safety/failure/manual escape
automated tests and rollback evidence
named exit-gate approval
```

## Gate failure rule

- A failed required test or missing artifact keeps the milestone open.
- A hard safety, privacy, authorization, evidence, reliability, or manual-escape failure blocks downstream exposure regardless of conversion metrics.
- Emergency safety fixes may cross a lock only with an audited amendment, consumer updates, and analysis annotation.
- Schedule pressure cannot convert a thesis-breaking scope cut into an acceptable exit.

## Parallelization constraints

- Design can lead future-state UX while contracts are draft.
- Frontend can implement against deterministic mocks after schema version agreement.
- Backend can implement runtime adapters while frontend consumes the same mock lifecycle.
- Research can define metric consumers while event schemas are draft, but collection cannot begin before lock.
- No parallel branch may invent a competing resource, event, warning, or classifier version.
