# Required Database Invariant Tests

Run with xUnit + `WebApplicationFactory` against real PostgreSQL through Testcontainers or an explicitly configured isolated local database. EF InMemory or a compatibility database is not evidence for these semantics.

## Identity and ownership

1. All canonical PK/FK values round-trip as Guid/PostgreSQL `uuid`.
2. Cross-user Goal/Project/Task/Routine/PlanningFact references are rejected by the use case and cannot leak through API reads.
3. Project endpoints require authenticated `UserId`, not permission alone.
4. RoutineOccurrence ownership resolves through Routine; no artificial owner column is required.

## Task scope and sequence

5. Task cannot have both direct Goal and Project.
6. Active standalone Task without `PlannedDate` fails; active direct Goal/Project Task without it succeeds.
7. `SequenceId` and `SequenceOrder` are both null or both present.
8. Duplicate order in one sequence fails under concurrency.
9. Cross-scope sequence membership and invalid predecessor/drop transitions fail atomically.
10. No Task `Placement`, `ReviewDate` or `ReviewDateSource` columns exist.

## Routine and occurrences

11. Routine effective range and unique local `TimesOfDay` are validated.
12. Duplicate timed `(RoutineId, ScheduledLocalDate, ScheduledLocalTime)` fails.
13. Duplicate untimed `(RoutineId, ScheduledLocalDate)` fails, while different timed slots on one date succeed.
14. Pending/resolved timestamps and next-slot/day-end missed transitions obey the accepted contract.
15. Concurrent bounded generation yields one row per accepted identity.

## PlanningFact and CaptureItem

16. PlanningFact has exactly one accepted owner and valid lifecycle timestamps.
17. Capture terminal state/resolution correlation is consistent.
18. Capture resolution atomically creates a distinct Task/Routine identity and correlated event; it never reuses the CaptureItem ID.

## Time, concurrency and atomicity

19. `DateOnly` values round-trip without UTC day shift; UTC-offset `DateTimeOffset` instants persist with `timestamptz` semantics.
20. Stale `Version` updates return the concurrency contract.
21. Today excludes terminal/wrong-date Tasks and selects due timed/untimed occurrences in the configured pilot timezone.
22. Sequence/bulk commands roll back every row and event intent when one item fails.

Keep the schema gate unverified until these tests run against the exact EF migration/Npgsql/PostgreSQL configuration.
