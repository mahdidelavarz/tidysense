# Forms, Components, Hooks, and Pages

## Forms

- `LOCKED`: Task, Goal, Project, and Routine use entity-specific create/edit flows, not one conditional universal form.
- React Hook Form owns form state; Zod provides form/client shape and cross-field feedback. Generated OpenAPI remains transport authority.
- Server/domain validation remains authoritative. Map field errors to controls and non-field errors to a visible summary.
- Preserve user input across validation, conflict, temporary network failure, and recoverable auth refresh.
- Disable duplicate submit, show submitting state, focus the first actionable error, and announce result changes.

## Hooks

Create a hook when it combines reusable React lifecycle/state behavior or wraps one feature's Query contract. Do not wrap a service function merely to rename it, create universal hooks, or hide important dependency/state transitions.

## Components

Reuse order: existing pattern -> shared component -> extend stable abstraction -> small feature component -> new abstraction after demonstrated repetition.

- Shared components express stable visual/interaction semantics, not product-specific lifecycle rules.
- Feature components may understand their entity/use case.
- Keep props semantic (`entity="goal"`, `tone="caution"`) so entity and state colors do not collapse into aliases.
- Dialog/Drawer/Bottom Sheet choice follows the accepted flow and responsive context; all require focus management, escape/close semantics, labelled title, and restored focus.

## Page pattern

A page composes route state, query state, feature actions, and layout. It does not contain raw Axios calls or duplicate backend business logic.

## UI state matrix

| State | Required behavior |
|---|---|
| initial loading | labelled skeleton/progress without false empty content |
| background fetch | preserve content; subtle non-blocking indication |
| empty | explain absence and offer allowed next action |
| error | safe message, trace/support context when useful, bounded retry |
| validation | field + summary; preserve input; focus/announce |
| submitting/applying | prevent duplicate action; do not claim success |
| success | only authoritative response/CommandResult; announce and update cache |
| disabled/read-only | explain reason when not obvious; remain perceivable |
| unauthenticated | login/session recovery path |
| forbidden | no misleading missing-data state |
| not found | ownership-safe copy; valid navigation exit |
| conflict/stale | show change, refresh preview/data, require re-confirmation |
| offline | keep safe readable state; disable canonical mutation; no invented queue |

A feature is incomplete when an applicable row is absent.

## Related Mind Map

- [MVP core loop](../../mindmap/05-Flows/mvp-core-loop.md) — manual/AI review, confirmation and deterministic apply flow.
- [API/frontend state contracts](../../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md) — explicit client state distinctions.
- [Reconcile UI specification](../../mindmap/04-Specs/reconcile-ui-ux-specification.md) — Reconcile-specific interaction behavior when that module is in scope.
