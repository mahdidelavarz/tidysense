# Contract Freeze Register

## Status

`WORKSTREAM_I_APPROVED — M1 CONTRACTS SLICE_LOCKED; LATER LOCK GATES REMAIN DRAFT, PREPARED FOR SIGN-OFF 2026-10-09`

## Freeze levels

- `DRAFT` — changeable with recorded owner and consumers.
- `SLICE_LOCKED` — integration contract for a milestone; changes require amendment and coordinated consumer updates.
- `PILOT_LOCKED` — observed pilot semantics; emergency changes require audit and analysis annotation.
- `POST_PILOT_CHANGE` — intentionally deferred breaking change.

| Contract | Accountable owner | Contributors | Mandatory reviewers | First consumer | Required lock | Lock evidence | Current state |
|---|---|---|---|---|---|---|---|
| auth/session/ownership | Backend owner | Backend + Frontend | Security/Privacy | all slices | M1 `SLICE_LOCKED` | [Step 3 M1 review package](../../devmap/step-03-m1-review-package.md#approval-record); auth specification, tests and configuration record. Security/Privacy approved; Reza signed off as Backend owner on 2026-09-27. | `SLICE_LOCKED` |
| canonical IDs/entities/versions | Backend owner | Backend | Product, Security/Privacy | M2/M3/M4 | M1 `SLICE_LOCKED` | [Step 3 M1 review package](../../devmap/step-03-m1-review-package.md#approval-record); schema, migrations and invariants. Product and Security/Privacy approved; Reza signed off as Backend owner on 2026-09-27. | `SLICE_LOCKED` |
| Problem Details/error codes | Backend owner | Backend + Frontend | Frontend owner | M2 | M1 `SLICE_LOCKED` | [Step 3 M1 review package](../../devmap/step-03-m1-review-package.md#approval-record); API schemas and contract tests. Frontend approved; Reza signed off as Backend owner on 2026-09-27. | `SLICE_LOCKED` |
| command/idempotency/CommandResult | Backend owner | Backend + Frontend | Product, Security/Privacy | M2 onward | M2 `SLICE_LOCKED` | replay/conflict/lost-response tests | `DRAFT` |
| event envelope/privacy classes | Backend owner | Backend + Research | Research, Security/Privacy | all producing slices | M1 `SLICE_LOCKED`; pilot fields `PILOT_LOCKED` | [Step 3 event family/consumer, schema-defined bounded-payload, result-link and independent-retention review](../../devmap/step-03-m1-review-package.md#m1-event-envelope-and-privacy-review-completed-2026-09-26); [accepted event/retention authority](../01-Closed-Discussions/019c-events-ai-observability-and-retention.md); PostgreSQL policy/constraint/retention/migration tests linked in review package. Research and Security/Privacy confirmed full approval and Reza signed off as Backend owner on 2026-09-27. Product event catalogs and pilot fields remain subject to their later lock gates. | `SLICE_LOCKED` |
| Task/Today projection | Product owner | Product + Backend + Frontend | Design, Backend | M2/M4/M5 | M2 `SLICE_LOCKED` | schema/E2E evidence | `DRAFT` |
| RoutineOccurrence/local-date rules | Backend owner | Backend + Product | Product, Frontend | M3/M4 | M3 `SLICE_LOCKED` | timezone/property tests | `DRAFT` |
| Planning Attempt/Draft/revisions | Product owner | Product + Backend + Frontend | Design, Safety | M5/M6 | M5 `SLICE_LOCKED` | mock fixtures/state tests | `DRAFT` |
| preview/warning/confirmation | Product owner | Product + Backend + Frontend | Design, Safety, Security/Privacy | M4/M5/M7 | first consuming slice lock | stale/version/atomic tests | `DRAFT` |
| runtime context/artifact manifest | Backend owner | Backend | Safety, Security/Privacy, Product | M6/M7 | evaluation-version lock; M9 `PILOT_LOCKED` | pinned bundle/context tests | `DRAFT` |
| Reconcile facts/severity/reasons | Backend owner | Backend + Product | Design, Safety, Research | M4/M7/M8 | M4 `SLICE_LOCKED`; M9 `PILOT_LOCKED` | classifier/rule tests/version | `DRAFT` |
| H1/H2 metric dictionary | Pilot Research owner | Research + Backend | Product, Safety, Security/Privacy | M8/M9 | before collection `PILOT_LOCKED` | denominator queries/test fixtures | `DRAFT` |
| provider safeguards, hostile-input policy and degraded/manual behavior | AI/Safety owner | Product + Backend | Security/Privacy, Research | M6/M8 | before real-user AI exposure | adversarial tests, provider review, signatures | `DRAFT` |

## Pending sign-off (prepared 2026-10-09)

The nine `DRAFT` rows above, and the pilot fields of the event-envelope row, have their evidence; what they lack is a signature. The roles in this register (Backend, Frontend, Product, Design, Safety, Security/Privacy, Research) were written for a team. **If one person holds all of them for the pilot, that person says so on the line below and signs each row once, after reading the acceptance contract named for it.** A signature here means "I read this contract and its 'Not covered' section and accept it as the locked behavior", not "the tests pass". Until a row is signed its state stays `DRAFT`; the metric dictionary must be signed before any pilot data is collected.

Roles held by one person for the pilot: ☐ yes — name: ____________ date: ____________

| Contract | Read before signing | Lock on signature | Signed (name, date) |
|---|---|---|---|
| command/idempotency/CommandResult | [Step 3 M1 review package](../../devmap/step-03-m1-review-package.md), [Step 5](../../devmap/development-steps.md) evidence | `SLICE_LOCKED` | |
| Task/Today projection | STEP-05 evidence in [development steps](../../devmap/development-steps.md) | `SLICE_LOCKED` | |
| RoutineOccurrence/local-date rules | [Step 6 acceptance](../../devmap/step-06-routine-acceptance.md) | `SLICE_LOCKED` | |
| Planning Attempt/Draft/revisions | [Step 8 acceptance](../../devmap/step-08-planning-acceptance.md) | `SLICE_LOCKED` | |
| preview/warning/confirmation | [Step 7](../../devmap/step-07-capture-reconcile-acceptance.md) and [Step 8](../../devmap/step-08-planning-acceptance.md) acceptance; 019C §20 amendment of 2026-10-09 | `SLICE_LOCKED` | |
| runtime context/artifact manifest | [Step 9](../../devmap/step-09-ai-planning-acceptance.md) and [Step 10](../../devmap/step-10-ai-reconcile-acceptance.md) acceptance | `PILOT_LOCKED` | |
| Reconcile facts/severity/reasons | [Step 7](../../devmap/step-07-capture-reconcile-acceptance.md) and [Step 10](../../devmap/step-10-ai-reconcile-acceptance.md) acceptance | `PILOT_LOCKED` | |
| H1/H2 metric dictionary | [metric dictionary](../../devmap/operations/metric-dictionary.md) (catalog `2026-10-09.1`), [research protocol](../../devmap/operations/pilot-research-protocol.md) including the wording of the two in-app questions, [Step 11 acceptance](../../devmap/step-11-operations-acceptance.md) | `PILOT_LOCKED`, before collection | |
| provider safeguards, hostile-input policy and degraded/manual behavior | [Step 9](../../devmap/step-09-ai-planning-acceptance.md), [Step 10](../../devmap/step-10-ai-reconcile-acceptance.md), [Step 11](../../devmap/step-11-operations-acceptance.md) acceptance, the consent notice wording, [security review](../../devmap/quality/security-review-2026-10-09.md) | before real-user AI exposure | |
| event envelope/privacy classes, pilot fields | 019C amendment of 2026-10-09 (confirmation retention, consent event, pilot answers, durations) | `PILOT_LOCKED` | |

When a row is signed, copy the signature into the "Lock evidence" column of the table above and change its "Current state".

## Change procedure

Every locked-contract change records reason, authority, old/new version, affected consumers, migrations/backfill, test updates, rollout/rollback, approvers, and pilot-analysis impact. Silent schema/event/classifier drift is forbidden.
