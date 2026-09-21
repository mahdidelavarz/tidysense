# .NET / EF Core Canonical Domain Reference

Status: **Canonical implementation guidance; feature code not implemented by this document.**

## Base conventions

```csharp
public Guid Id { get; private set; }
public long Version { get; private set; }
public DateTimeOffset CreatedAt { get; private set; }
public DateTimeOffset UpdatedAt { get; private set; }
```

- Entity/FK IDs: `Guid`; PostgreSQL `uuid`.
- Real instants: `DateTimeOffset`; PostgreSQL `timestamptz`; write UTC-offset values through Npgsql.
- Local calendar dates: `DateOnly`; PostgreSQL `date`.
- Local wall-clock slots: `TimeOnly`; PostgreSQL `time`.
- Keep established EF-generated identifier names. Do not add a global snake_case convention.
- Configure `Version` as a concurrency token; enforce cross-row invariants transactionally.
- Keep these domain meanings provider-neutral. Npgsql mappings and PostgreSQL migrations are infrastructure artifacts.

## Ownership

Goal, Project, Task, Routine, PlanningFact and CaptureItem are user-scoped through their accepted relationships. Project has `UserId`. Every operation on a user-owned record applies an authenticated ownership predicate server-side. RoutineOccurrence inherits ownership through Routine. Do not add `UserId` to a shared/system record merely for uniformity.

## Aggregate shapes

```csharp
Goal: Id, UserId, Title, Status, TargetDate?, ReviewDate, Version, timestamps
Project: Id, UserId, GoalId?, Title, Status, TargetDate?, ReviewDate, Version, timestamps
Task: Id, UserId, GoalId?, ProjectId?, Title, Status, PlannedDate?, Deadline?,
      SequenceId?, SequenceOrder?, Version, timestamps
Routine: Id, UserId, GoalId?, ProjectId?, ContinuationOfRoutineId?, Title, Status,
         RecurrenceTimezone, EffectiveFromDate, EffectiveToDate?, TimesOfDay[],
         RecurrenceDefinition, Version, timestamps
RoutineOccurrence: Id, RoutineId, ScheduledLocalDate, ScheduledLocalTime?, Status,
                   ResolvedAt?, Version, timestamps
PlanningFact: Id, UserId, GoalId?, ProjectId?, FactType, Strength, StructuredValue,
              Source, Status, SourcePlanningAttemptId?, CapturedAt, LastConfirmedAt,
              UpdatedAt, ExpiredAt?, RemovedAt?, Version
CaptureItem: Id, UserId, Title, Status, Source, ResolvedEntityType?, ResolvedEntityId?,
             Version, timestamps
```

Task has no `Placement`, `ReviewDate` or `ReviewDateSource`. Both sequence fields are null or both present. Sequence order is unique per sequence and all members share the same direct scope. Standalone active Tasks require `PlannedDate`; direct Goal/Project Tasks may be undated.

Routine `TimesOfDay` stores zero or more unique local times. Use filtered unique indexes for timed `(RoutineId, ScheduledLocalDate, ScheduledLocalTime)` and untimed `(RoutineId, ScheduledLocalDate)` occurrences.

PlanningFact belongs to exactly one Goal or standalone Project. CaptureItem resolution creates a different Task/Routine row and only records correlation; it never changes identity into that entity.

## Persistence boundary

Feature/application services may query and persist directly through `AppDbContext` for straightforward use cases. Add a narrow repository/port only when aggregate behavior, a domain boundary, an external dependency or a meaningful test seam justifies it. No generic repository or mandatory per-entity repository.

## Migration notes

The prototype/dev database is disposable. Create the canonical PostgreSQL schema directly with Guid keys, explicit temporal types, Project ownership and JWT/sessionEpoch; remove obsolete opaque-session, temporary SQL Server, and `/api/...` structures rather than maintaining compatibility.
