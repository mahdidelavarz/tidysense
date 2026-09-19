# Contract Freeze Register

## Status

`WORKSTREAM_I_APPROVED — CONTRACTS REMAIN DRAFT UNTIL THEIR RECORDED LOCK GATES`

## Freeze levels

- `DRAFT` — changeable with recorded owner and consumers.
- `SLICE_LOCKED` — integration contract for a milestone; changes require amendment and coordinated consumer updates.
- `PILOT_LOCKED` — observed pilot semantics; emergency changes require audit and analysis annotation.
- `POST_PILOT_CHANGE` — intentionally deferred breaking change.

| Contract | Accountable owner | Contributors | Mandatory reviewers | First consumer | Required lock | Lock evidence | Current state |
|---|---|---|---|---|---|---|---|
| auth/session/ownership | Backend owner | Backend + Frontend | Security/Privacy | all slices | M1 `SLICE_LOCKED` | auth spec, tests, config record | `DRAFT` |
| canonical IDs/entities/versions | Backend owner | Backend | Product, Security/Privacy | M2/M3/M4 | M1 `SLICE_LOCKED` | schema, migrations, invariants | `DRAFT` |
| Problem Details/error codes | Backend owner | Backend + Frontend | Frontend owner | M2 | M1 `SLICE_LOCKED` | API schemas/contract tests | `DRAFT` |
| command/idempotency/CommandResult | Backend owner | Backend + Frontend | Product, Security/Privacy | M2 onward | M2 `SLICE_LOCKED` | replay/conflict/lost-response tests | `DRAFT` |
| event envelope/privacy classes | Backend owner | Backend + Research | Research, Security/Privacy | all producing slices | M1 `SLICE_LOCKED`; pilot fields `PILOT_LOCKED` | catalog, consumers, retention review | `DRAFT` |
| Task/Today projection | Product owner | Product + Backend + Frontend | Design, Backend | M2/M4/M6 | M2 `SLICE_LOCKED` | schema/E2E evidence | `DRAFT` |
| RoutineOccurrence/local-date rules | Backend owner | Backend + Product | Product, Frontend | M3/M6 | M3 `SLICE_LOCKED` | timezone/property tests | `DRAFT` |
| Planning Attempt/Draft/revisions | Product owner | Product + Backend + Frontend | Design, Safety | M4/M5 | M4 `SLICE_LOCKED` | mock fixtures/state tests | `DRAFT` |
| preview/warning/confirmation | Product owner | Product + Backend + Frontend | Design, Safety, Security/Privacy | M4/M6/M7 | first consuming slice lock | stale/version/atomic tests | `DRAFT` |
| runtime context/artifact manifest | Backend owner | Backend | Safety, Security/Privacy, Product | M5/M7 | evaluation-version lock; M9 `PILOT_LOCKED` | pinned bundle/context tests | `DRAFT` |
| Reconcile facts/severity/reasons | Backend owner | Backend + Product | Design, Safety, Research | M6/M7/M8 | M6 `SLICE_LOCKED`; M9 `PILOT_LOCKED` | classifier/rule tests/version | `DRAFT` |
| H1/H2 metric dictionary | Pilot Research owner | Research + Backend | Product, Safety, Security/Privacy | M8/M9 | before collection `PILOT_LOCKED` | denominator queries/test fixtures | `DRAFT` |
| crisis policy/resources/copy | Safety/Policy owner | Safety + Product + Backend | Security/Privacy, Research | M5/M9 | before exposure `PILOT_LOCKED` | corpus, resources, signatures | `DRAFT` |

## Change procedure

Every locked-contract change records reason, authority, old/new version, affected consumers, migrations/backfill, test updates, rollout/rollback, approvers, and pilot-analysis impact. Silent schema/event/classifier drift is forbidden.
