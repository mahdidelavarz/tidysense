# Scope-Cut Register

## Status

`WORKSTREAM_I_APPROVED — NO INDIVIDUAL CUT IS PRE-APPROVED`

No cut is approved by this register. It classifies the maximum safe response to schedule/capacity pressure.

| ID | Candidate cut | Level | Default decision | Conditions / consequence |
|---|---|---:|---|---|
| `CUT-01` | visual polish/animation beyond accessible clarity | 1 | `SAFE_TO_CUT` | preserve warnings, hierarchy, state visibility and accessibility |
| `CUT-02` | convenience filters/sorts and nonessential dashboards | 1 | `SAFE_TO_CUT` | retain operational and pilot-required views |
| `CUT-03` | broader onboarding copy variants | 1 | `SAFE_TO_CUT` | fixed crisis copy and required consent remain |
| `CUT-04` | multiple Routine slots/broader recurrence | 2 | `ALREADY_POST_PILOT` | separate named Routines and accepted daily semantics remain |
| `CUT-05` | provider fallback | 2 | `ALREADY_POST_PILOT` | manual path and provider failure state remain |
| `CUT-06` | calendar/time blocks/reminders/dependencies | 2 | `ALREADY_POST_PILOT` | no accepted MVP dependency |
| `CUT-07` | advanced deletion/archive/recovery UX | 2 | `CONDITIONAL` | accepted history, restore/correction and privacy deletion remain |
| `CUT-08` | AI Planning breadth | 3 | `CONDITIONAL` | narrow supported intention types, but retain useful non-trivial H1 path |
| `CUT-09` | AI Reconcile recommendation breadth | 3 | `CONDITIONAL` | reduce rule catalog, but retain bounded H2 path over deterministic facts |
| `CUT-10` | Routine capability | 3 | `REQUIRES_SOURCE_REOPEN` | B-12 and execution/adaptation evidence would change |
| `CUT-11` | manual planning/fallback | 4 | `FORBIDDEN` | thesis and manual escape fail |
| `CUT-12` | Today execution | 4 | `FORBIDDEN` | Execute/evidence loop disappears |
| `CUT-13` | deterministic Reconcile | 4 | `FORBIDDEN` | Adapt facts/authority boundary disappears |
| `CUT-14` | explicit preview/confirmation/revalidation | 4 | `FORBIDDEN` | unauthorized/stale mutation risk |
| `CUT-15` | crisis fail-closed/manual escape | 4 | `FORBIDDEN` | hard gate failure |
| `CUT-16` | required events/observability/privacy evidence | 4 | `FORBIDDEN` | pilot and safety claims become unauditable |
| `CUT-17` | idempotency/concurrency/atomic outbox | 4 | `FORBIDDEN` | correctness and evidence integrity fail |

## Approval procedure

Every proposed cut records requester, reason, saved cost/time, affected baseline rows, decision owner, tests/events/metrics affected, safety/privacy impact, rollback/reintroduction plan, and approval. Level 3 or 4 changes require reopening or explicitly amending the owning accepted discussion; editing a milestone or spec alone is insufficient.
