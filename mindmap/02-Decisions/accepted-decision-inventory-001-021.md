# Accepted Decision Inventory — Discussions 001–026

Status: **Canonical consolidated projection** (2026-09-19). The filename is retained so existing links do not break. Later accepted discussions override earlier contradictory decisions.

## Authority index

| Subject | Authority |
|---|---|
| Narrow legacy compatibility (mobile OTP, auth/API basics, palette) | [[../01-Closed-Discussions/001-008-legacy-surviving-decisions]] as amended by the technical DevMap |
| AI-native direction and scope | Discussions 010–011 |
| core/temporal model | Discussions 012–012A, amended by 023–026 |
| Planning flow/output | Discussions 013–014A, amended by 023 and 026 |
| Task/Routine/Today | Discussions 015–015B, amended by 024–026 |
| Reconcile | Discussions 016–017A, amended by 025–026 |
| authority, privacy, hostile input and failure | Discussions 018–018A; dedicated crisis UX removed by 2026-09-19 consolidation |
| persistence, transactions, events and retention | Discussions 019A–019C, amended by 023–026 |
| AI/API/frontend runtime | Discussions 020A–020C, amended by current DevMap technical decisions |
| validation and gates | Discussion 021, with crisis-specific gate removed |
| implementation sequence | Discussion 022, amended by 023–026 and current repository evidence |
| persistent PlanningFacts | Discussion 023 |
| multi-time Routine scheduling | Discussion 024 |
| Task sequences and hierarchical Reconcile | Discussion 025, as amended by 026 |
| Backlog removal, parent-owned undated Tasks and CaptureItem | Discussion 026 |

## Consolidated accepted state

### Product and authority

- The product is TidySense; Plan is not a canonical entity.
- Canonical work entities are Goal, Project, Task, Routine and RoutineOccurrence.
- Supporting durable records include PlanningFact and CaptureItem; Task sequence is structural metadata, not a separate entity.
- AI proposes or explains. It cannot authorize, execute commands, mutate repositories, infer lifecycle outcomes or turn invalid output into canonical state.
- The backend authenticates, authorizes, validates ownership where the model defines ownership, checks versions and invariants, and commits atomically.

### PlanningFact and rolling context — D023

- A `PlanningFact` belongs to exactly one Goal or one standalone Project.
- Required fields: `id`, `factType`, `strength`, `structuredValue`, `source`, `status`, `capturedAt`, `lastConfirmedAt`, `updatedAt`; plus exactly one of `goalId`/`projectId`, optional `sourcePlanningAttemptId`, `expiredAt`, `removedAt`.
- `strength`: `HARD | SOFT | INFORMATIONAL`; status: `ACTIVE | EXPIRED | REMOVED`; source: `USER_EXPLICIT | USER_CONFIRMED_AI_EXTRACTION`.
- Initial hard facts cover unavailable weekday/date/date-range. Category is derived from `factType`.
- AI may propose extracted facts, but each is separately approved and must not duplicate a canonical home.
- AI generation uses a bounded weekly context: detailed seven-day horizon plus the immediately previous window where allowed. Manual creation is not blocked by PlanningFacts.

### Routine schedule/occurrence — D024

- Routine recurrence is local-calendar based and stores zero or more unique local wall-clock `timesOfDay` values.
- Empty `timesOfDay` means untimed, with at most one occurrence per local date.
- Timed identity is `(routineId, scheduledLocalDate, scheduledLocalTime)`; untimed identity is `(routineId, scheduledLocalDate)`.
- A pending timed occurrence becomes missed at the next slot or local-day end; an untimed occurrence becomes missed at local-day end. There is no arbitrary grace period.
- Generation is bounded, idempotent and per date/per slot. True `EVERY_N_HOURS` is deferred.

### Task sequences and Reconcile — D025/D026

- A Task has optional `sequenceId` and `sequenceOrder`; both are present or absent together and order is unique per sequence.
- Sequence members share one direct ownership scope: same Project, same Goal, or all standalone.
- A predecessor must be complete before its successor is actionable. An active predecessor blocks; dropping a predecessor requires explicit structural resolution.
- Today may show a blocked task planned for today as non-actionable context.
- Reconcile groups Project → Sequence → Task. Blocked descendants do not increase actionable count or oldest-actionable age.
- Sequence bulk actions (`CARRY_ALL`, `DROP_ALL`, `REVIEW_INDIVIDUALLY`, `REVIEW_WITH_AI`) are atomic when applied.
- Discussion 026 replaces every Backlog-specific rule in Discussion 025 with `UNSCHEDULED_PARENT_OWNED` semantics.

### Backlog removal and CaptureItem — D026

- Backlog is removed, including `Task.placement`, Task-level `reviewDate`/`reviewDateSource`, related actions, filters and events.
- An active standalone Task requires `plannedDate`. An active Task directly owned by a Goal or Project may be undated and resurfaces through its direct parent review.
- Today includes active Tasks planned for the current local date; Carry changes an existing planned date.
- Goal/Project `reviewDate` is a stored system-managed snapshot: target date when present, otherwise Project creation +30 local days or Goal creation +90. Continuing after review sets the next snapshot to `min(default, targetDate)`.
- Quick Capture without a parent/date creates a `CaptureItem` (`UNRESOLVED | RESOLVED | DISCARDED`). Resolution creates a separate Task or Routine and correlated events; it never changes the capture row into a work entity.
- Capture is a separate Reconcile lane/count, not execution severity.

### Safety consolidation

Dedicated crisis pages, gates, routing, emergency-resource screens and crisis-specific product records are removed. Remaining guardrails are: bounded provider/moderation controls, hostile-input isolation, context minimization, no diagnosis/high-risk inference, no AI mutation, explicit invalid/failure states, manual/deterministic fallback, authorization, privacy, observability, rate/cost limits and normal incident handling.

## Superseded guidance

The following no longer define the product: explicit Backlog; Task review checkpoints; one occurrence per Routine/day regardless of slot; multiple daily slots as post-pilot; Task dependency graph as post-pilot; dedicated crisis UX/gate; “implementation not started”; Java/Spring as the backend stack; `/app` repository layout; integer IDs, opaque DB sessions, IPPanel, unversioned APIs or snake_case as canonical architecture.
