# Domain Model and Persistence

- Canonical entity/FK IDs are `Guid`/PostgreSQL `uuid`.
- Instants are `DateTimeOffset`/`timestamptz`; local dates are `DateOnly`/`date`; local slots are `TimeOnly`/`time`.
- Keep the repository’s established EF/PostgreSQL identifier convention. Do not install a global snake_case convention.
- Configure required lengths, conversions, checks, indexes, delete behavior and optimistic `Version` in Fluent API.
- Lifecycle rows preserve history; privacy deletion is a separate governed operation. Broad cascades do not perform product transitions.

Ownership follows the accepted domain, not a universal base class. Goal, Project, Task, Routine, PlanningFact and CaptureItem are user-owned and every backend read/write applies ownership. RoutineOccurrence inherits through Routine. Shared/system records receive no artificial `UserId`. Canonical Project is user-owned; the current permission-only Project endpoints are unsafe prototype code and must be corrected before reuse.

Task has no Backlog, `Placement`, Task `ReviewDate` or `ReviewDateSource`. Sequence pair/scope/order invariants apply. Routine occurrence uniqueness distinguishes timed and untimed slots. PlanningFact has exactly one accepted owner. Capture resolution creates a separate work identity.

Migration from prototype structures must explicitly map integer IDs to Guid IDs, cut over FKs, normalize ambiguous `DateTime` values, add Project ownership, replace opaque sessions and remove obsolete routes/provider code. Do not extend prototype integer Project architecture into new modules.
