# Risk and Contingency Register

## Status

`WORKSTREAM_I_APPROVED — RISKS REQUIRE REASSESSMENT AT EACH GATE`

Scale: likelihood and impact use exactly `LOW`, `MEDIUM`, or `HIGH`. Residual risk must be reassessed at each milestone exit.

| ID | Risk | L | I | Prevention/detection | Contingency / stop condition | Owner | Gate |
|---|---|---|---|---|---|---|---|
| `R-01` | scope/contract drift across parallel work | MEDIUM | HIGH | freeze register, one schema version, traceability and consumer acknowledgement | stop integration; reconcile contract and update consumers/tests | Product owner | every slice |
| `R-02` | canonical/temporal model encoded incorrectly | MEDIUM | HIGH | constraints, property/scenario tests, migration review | block slice; replace migration before data reliance | Backend owner | M1–M3 |
| `R-03` | duplicate/stale/partial mutation | MEDIUM | HIGH | expected versions, idempotency, locks, atomic bulk/outbox tests | disable affected command; reconcile state/events; incident review | Backend owner | M2 onward |
| `R-04` | frontend presents success before CommandResult | MEDIUM | HIGH | explicit state machines and lost-response tests | show recovery/polling state; never infer success | Frontend owner | M2 onward |
| `R-05` | invalid AI output reaches review/application | MEDIUM | HIGH | strict gates, immutable revisions, adversarial fixtures | kill AI path; preserve manual path; audit artifacts | Backend owner | M4–M7 |
| `R-06` | prompt injection/imported content gains authority | MEDIUM | HIGH | context isolation, no tools, policy tests, minimized structured context | disable affected entry; security/safety incident review | Security/Privacy owner | M5/M7 |
| `R-07` | crisis proposal/mutation leakage | MEDIUM | HIGH | fixed fallback, zero-leakage corpus, restricted observability | immediate kill switch; block pilot; human review | Safety/Policy owner | M5/M9 |
| `R-08` | provider cost/latency/outage harms use | HIGH | HIGH | hard cap, timeout/rate/circuit limits, dashboards | disable provider path; manual/degraded mode; no silent fallback | Backend owner | M5/M7/M9 |
| `R-09` | sensitive/raw content overcollection | MEDIUM | HIGH | context manifest, retention classes, field review, access tests | stop collection; delete/anonymize per approved schedule; incident review | Security/Privacy owner | M1 onward |
| `R-10` | event/metric denominator drift | MEDIUM | HIGH | catalog/consumer mapping, immutable versions, fixture queries | freeze analysis; repair/backfill only with audit; classify inconclusive | Pilot Research owner | M1/M8/M9 |
| `R-11` | small pilot overinterpreted | HIGH | MEDIUM | locked thresholds, uncertainty/inconclusive state, forbidden claims | report inconclusive; extend evidence, not narrative confidence | Pilot Research owner | M9 |
| `R-12` | manual escape exists on paper but fails | MEDIUM | HIGH | timed E2E/manual escape tests in failure states | block AI exposure; restore manual path first | Product owner | M4–M9 |
| `R-13` | insufficient support/incident capacity | MEDIUM | HIGH | named on-call/support path and drills | delay pilot or reduce cohort; disable affected features | Product owner | M8/M9 |
| `R-14` | migration/rollback failure | MEDIUM | HIGH | forward/backward tests, backups, restore rehearsal | halt rollout; restore known-good version/data; incident record | Backend owner | M1 onward |
| `R-15` | key role unavailable | MEDIUM | HIGH | named deputies, documented handoffs, bounded WIP | resequence only along dependency graph; do not waive gates | Product owner | all |
| `R-16` | accessibility failure blocks real use/evidence | MEDIUM | HIGH | keyboard/screen-reader/contrast/responsive tests | block slice/pilot exposure until critical paths pass | Product Design owner | M2 onward |

## Escalation rule

Any realized safety, privacy, authorization, data-integrity, or evidence-integrity risk is a gate failure, not ordinary backlog. Record incident, affected versions/users/data, containment, recovery, notification decision, root cause, corrective tests, and re-enable approvers.

## Review cadence

- review before every milestone entry and exit;
- review immediately after incident, dependency change, contract amendment, or scope cut;
- lock pilot risks, owners, monitoring, contingencies, and stop conditions before M9 approval.
