# Test Coverage Matrix

## Status

`WORKSTREAM_I_APPROVED — REQUIRED COVERAGE FRAMEWORK`

Legend: `R` required for milestone exit; `C` continuously required after introduction; `—` not yet applicable.

| Test family | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 |
|---|---|---|---|---|---|---|---|---|---|
| domain invariants | R | C | C | C | C | C | C | C | C |
| database constraints/migrations/rollback | R | C | C | C | C | C | C | C | C |
| authentication/ownership/authorization | R | C | C | C | C | C | C | C | C |
| transactions/concurrency/idempotency | R | R | R | R | C | R | R | C | C |
| API schemas/errors/compatibility | R | R | R | R | R | R | R | C | C |
| frontend state machine/input preservation | — | R | R | R | R | R | R | C | C |
| accessibility/responsive behavior | — | R | R | R | R | R | R | C | C |
| events/outbox/delivery/deduplication | R | R | R | R | R | R | R | R | C |
| logs/traces/alerts/privacy redaction | R | C | C | C | R | C | R | R | C |
| retention/deletion/restricted access | R | C | C | C | R | C | R | R | R |
| end-to-end slice | — | R | R | R | R | R | R | R | R |
| rollback/kill-switch/drill | R | C | C | C | R | C | R | R | R |

## AI-specific required tests

| Test | M4 mock | M5 Planning | M7 Reconcile | M9 |
|---|---|---|---|---|
| schema/semantic/temporal/reference/policy gates | R | C | C | C |
| invalid and partial output creates no resource | R | C | C | C |
| allowlisted repair only; no intent mutation | R | C | C | C |
| temporary-reference graph validation | R | C | as applicable | C |
| context scope/minimization and no tools | R | R | R | C |
| prompt injection/imported-content isolation | R | R | R | R |
| cancellation, timeout, retry and late-result race | R | R | R | C |
| rate/circuit/token/spend limits | fixtures | R | R | R |
| provider unavailable/manual escape | R | R | R | R |
| stale/unauthorized confirmation | R | R | R | R |
| crisis fixed fallback and zero leakage | fixture | R | R | R corpus |
| artifact version/pinning/reproducibility | R | R | R | R |

## Domain scenario suites

- Goal/Project terminal action with active children.
- Task complete/drop/carry/restore/correction and duplicate command.
- Routine stop/continuation, effective local dates, DST/travel, uniqueness and inactivity reconstruction.
- Review due versus execution overdue.
- Reconcile cleanup, deduplication, severity, suppression, separate lanes and skip.
- Protected items, parent consequences and all-or-nothing bulk.

## Pilot evidence tests

- Exact numerator/denominator reproduction from immutable fixtures.
- Exposure, output, resource, disposition, command and application separation.
- Duplicate attempt and lost-response handling.
- User-level weighting, exclusions and missing-data classification.
- Severity segmentation and classifier-version immutability.
- Edited versus unchanged acceptance.
- Regret/reversal attribution and trust/behavior mismatch.
- Manual Escape Success.
- Crisis and other hard gates overriding positive funnels.

## Evidence format

Every required test family records suite location, owner, environment, fixture/artifact version, last result, known exclusions, linked requirement IDs, and blocking defect references. A green percentage without requirement mapping is insufficient.
