# Domain Model and Persistence

- Canonical entity/FK IDs are .NET `Guid`/PostgreSQL `uuid`.
- Instants are `DateTimeOffset`/PostgreSQL `timestamp with time zone`; local dates are `DateOnly`/`date`; local slots are `TimeOnly`/`time without time zone`.
- Keep the repository's established EF identifier convention. Do not install a new naming strategy solely because the provider changed.
- Configure required lengths, conversions, checks, indexes, delete behavior and optimistic `Version` in Fluent API.
- Lifecycle rows preserve history; privacy deletion is a separate governed operation. Broad cascades do not perform product transitions.

Ownership follows the accepted domain, not a universal base class. Goal, Project, Task, Routine, PlanningFact and CaptureItem are user-owned and every backend read/write applies ownership. RoutineOccurrence inherits through Routine. Shared/system records receive no artificial `UserId`. Canonical Project is user-owned; the current permission-only Project endpoints are unsafe prototype code and must be corrected before reuse.

Task has no Backlog, `Placement`, Task `ReviewDate` or `ReviewDateSource`. Sequence pair/scope/order invariants apply. Routine occurrence uniqueness distinguishes timed and untimed slots. PlanningFact has exactly one accepted owner. Capture resolution creates a separate work identity.

The disposable prototype database is replaced by a direct canonical PostgreSQL schema: Guid IDs, canonical temporal types, Project ownership, JWT plus `sessionEpoch`, and no persisted session model. No compatibility migration for prototype integer data is required. Do not extend prototype integer Project architecture into new modules. Npgsql accepts only UTC (`Offset == 00:00`) `DateTimeOffset` values for `timestamp with time zone`; application-created instants use UTC while API offsets still identify equivalent instants.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — canonical records and removed concepts.
- [Canonical data model and invariants](../../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md) — ownership, keys and lifecycle constraints.
- [Planning facts amendment](../../mindmap/01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context.md), [Routine slots](../../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [Task sequences](../../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), and [Capture/undated Tasks](../../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md) — accepted later amendments.
