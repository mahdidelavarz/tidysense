# Project Summary

TidySense helps a user plan an intention, execute through Today and adapt through Reconcile. AI proposes/explains within bounded contracts; users authorize consequences; deterministic backend services own validation and mutation.

Canonical work records are Goal, Project, Task, Routine and RoutineOccurrence. PlanningFact and CaptureItem are durable supporting records; Task sequence is metadata. Backlog and dedicated crisis UX are removed. Discussions 023–026 override older contradictory projections.

Implementation has started. The M1 foundation includes canonical Guid identity, temporal types, JWT-cookie plus `sessionEpoch`, Kavenegar boundary, `/api/v1`, owner-scoped Project read, generated OpenAPI transport and passing real-PostgreSQL integration evidence. PostgreSQL/Npgsql is canonical again; the temporary SQL Server provider was removed before further domain development. Goal, Task, Routine, Today, Reconcile and AI features have not been implemented. Pilot/release are not ready.

Execution state is tracked in `development-steps.md`: local/technical stabilization is DONE, authentication completion is IN_PROGRESS, and later steps have not started.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — canonical product projection.
- [Updated MVP implementation plan](../../mindmap/01-Closed-Discussions/022-updated-mvp-implementation-plan.md) — accepted sequencing and milestone boundary.
