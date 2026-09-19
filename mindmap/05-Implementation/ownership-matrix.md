# Ownership Matrix

## Status

`WORKSTREAM_I_APPROVED — M1 NAMES INSTANTIATED; ACKNOWLEDGEMENT PENDING`

M1 roles are instantiated in [[05-Implementation/m1-entry-package]]: Reza owns Backend and Mahdi owns every other accountability lane. Alireza is a paid external design contributor whose work is accepted by Mahdi; he is not an accountable owner. Later milestones must revisit Mahdi's concentration of roles before entry.

| Area | Accountable | Responsible contributors | Mandatory reviewers | Approval point |
|---|---|---|---|---|
| product scope and traceability | Product owner | Product/Frontend | Design, Backend | every slice lock |
| interaction flows and accessibility | Product Design | Design + Frontend | Product, Safety where applicable | design handoff/exit |
| frontend contracts/state machines | Frontend owner | Frontend | Backend, Design, Security | slice integration |
| domain/persistence/transactions | Backend owner | Backend | Product, Security | migration and slice exit |
| authentication/authorization | Backend owner | Backend + Frontend | Security/Privacy | M1 and production gate |
| events/observability/retention | Backend owner | Backend + Research | Security/Privacy, Research | schema lock/M8 |
| AI runtime/reliability/cost | Backend owner | Backend + Frontend | Safety, Security/Privacy, Product | M5/M7 exits |
| AI UX and manual escape | Product owner | Design + Frontend + Backend | Safety | M4/M5/M7 exits |
| crisis/high-risk boundary | Safety/Policy owner | Safety + Product + Backend | Security/Privacy, Research | any real-user AI exposure/M9 |
| metrics and pilot analysis | Pilot Research owner | Research + Backend/Product | Safety, Security/Privacy | M8/M9 |
| operations/support/incident/rollback | Backend owner | Backend + Product | Safety, Security/Privacy | M8/M9 |

## Milestone accountability

### Current named role map

| Role | Named owner | Boundary |
|---|---|---|
| Product owner | Mahdi | confirmed |
| Backend owner | Reza | confirmed; acknowledgement pending |
| Product Design owner | Mahdi | confirmed; Alireza is a paid external contributor |
| Frontend owner | Mahdi | temporary |
| Security/Privacy owner | Mahdi | temporary; Reza supplies independent technical review |
| Safety/Policy owner | Mahdi | temporary |
| Pilot Research owner | Mahdi | temporary |
| Operations/Support owner | Mahdi | temporary; Reza reviews backend operations |

| Milestone | Accountable role | Required exit approvers |
|---|---|---|
| M1 | Backend owner | Product, Frontend, Security/Privacy |
| M2 | Product/Frontend owner | Backend, Design, Security/Privacy |
| M3 | Backend owner | Product, Frontend, Design |
| M4 | Product/Frontend owner | Backend, Design, Safety |
| M5 | Backend owner | Product, Frontend, Safety, Security/Privacy |
| M6 | Backend owner | Product, Frontend, Design, Safety, Research |
| M7 | Backend owner | Product, Frontend, Design, Safety, Security/Privacy, Research |
| M8 | Pilot Research owner | Product, Backend, Safety, Security/Privacy |
| M9 | Product owner | all accountable owners and mandatory reviewers |

## Handoff rule

Each handoff records artifact/version, assumptions, unresolved items, test evidence, consumer acknowledgement, and rollback owner. “Everyone owns it” is not a valid accountable assignment.
