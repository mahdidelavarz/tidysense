# TidySense Development Map

## Purpose

The DevMap is the implementation operating manual for TidySense/Adaptive Planner. The Mind Map owns product behavior (`WHAT` and `WHY`); the DevMap owns recurring implementation decisions (`HOW`); code is the implementation.

This version is a review candidate. Once accepted, ordinary feature work follows it without reopening `LOCKED` decisions. A developer may diverge only through an explicit DevMap or ADR change.

## Decision labels

- `LOCKED` — explicitly established by accepted product documents, project rules, or an already-approved technical decision.
- `INFERRED` — consistently evidenced by the repository and safe to preserve within its stated scope.
- `OPEN DECISION` — no reliable choice exists. The decision register gives constraints and the smallest realistic option set.
- `CONFLICT` — authoritative documents or code disagree. Do not implement the affected behavior until reconciled.

## Progressive loading

For normal work, read in this order:

1. [`context/project-summary.md`](context/project-summary.md)
2. [`context/active-conventions.md`](context/active-conventions.md)
3. the relevant workflow/checklist
4. the relevant backend/frontend/shared document
5. the linked product authority only when behavior is affected
6. related source code

Do not rescan the full repository or Mind Map for a focused task unless behavior is unclear, a contradiction appears, a lifecycle is affected, or this DevMap points to the source.

## Map

| Need | Primary document |
|---|---|
| context routing | [`00-context-index.md`](00-context-index.md) |
| product concept to implementation area | [`01-product-to-code-map.md`](01-product-to-code-map.md) |
| system architecture and dependency direction | [`02-architecture.md`](02-architecture.md) |
| end-to-end delivery flow | [`03-development-flow.md`](03-development-flow.md) |
| canonical module loop | [`04-module-implementation-loop.md`](04-module-implementation-loop.md) |
| backend rules | [`backend/README.md`](backend/README.md) |
| frontend rules | [`frontend/README.md`](frontend/README.md) |
| contracts, naming, and dates | [`shared/README.md`](shared/README.md) |
| operational workflows | [`workflows/README.md`](workflows/README.md) |
| quality gates | [`quality/README.md`](quality/README.md) |
| environments and delivery | [`operations/README.md`](operations/README.md) |
| conflicts and open decisions | [`decisions/README.md`](decisions/README.md) |
| canonical examples | [`snippets/README.md`](snippets/README.md) |
| short execution checklists | [`checklists/README.md`](checklists/README.md) |

## Maintenance

When an accepted reusable convention changes, update its one authoritative detailed document. Update `context/active-conventions.md` only for broadly reusable rules and a summary only when future task routing materially changes. Do not record one-off implementation details.

Product changes belong in the Mind Map first. The DevMap may link to them but must not silently create product behavior.
