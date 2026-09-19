# .NET / EF Core Reference Model

**Status:** proposal for backend-owner review. These types are not production implementation until integrated into `backend`, represented by reviewed EF Core migrations, and tested against PostgreSQL.

## Runtime and persistence boundary

- Target .NET 10 and ASP.NET Core 10.
- Use EF Core 10 with the Npgsql provider.
- Use `Guid` for canonical IDs, `DateOnly` for local calendar dates, and `DateTimeOffset` for instants.
- Store lifecycle enums as strings and recurrence documents as PostgreSQL `jsonb`.
- Keep cross-aggregate relationships ID-based. Domain/application handlers, not EF navigation graphs, own lifecycle transitions.
- Treat `Version` as an optimistic-concurrency token and translate `DbUpdateConcurrencyException` into the version-conflict API contract.

## Application ports

```csharp
namespace TidySense.Application.Abstractions;

public interface ICanonicalClock
{
    DateTimeOffset UtcNow { get; }
    DateOnly CurrentDate(TimeZoneInfo timeZone);
}

public interface IIdGenerator
{
    Guid NewId();
}
```

## Canonical entity base

```csharp
namespace TidySense.Domain.Common;

public abstract class CanonicalEntity
{
    public Guid Id { get; private init; }
    public Guid UserId { get; private init; }
    public DateTimeOffset CreatedAt { get; private init; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public CreationSource Source { get; private init; }
    public long Version { get; private set; }
}
```

## Domain entities

```csharp
using System.Text.Json;
using TidySense.Domain.Common;

namespace TidySense.Domain.Planning;

public sealed class Goal : CanonicalEntity
{
    public string Title { get; private set; } = null!;
    public string DesiredOutcome { get; private set; } = null!;
    public GoalStatus Status { get; private set; }
    public DateOnly? TargetDate { get; private set; }
    public DateOnly? ReviewDate { get; private set; }
    public ReviewDateSource? ReviewDateSource { get; private set; }
    public DateTimeOffset? LastContinuationDecisionAt { get; private set; }
    public DateTimeOffset? TerminalAt { get; private set; }
}

public sealed class Project : CanonicalEntity
{
    public Guid? GoalId { get; private set; }
    public string Title { get; private set; } = null!;
    public string? CompletionMeaning { get; private set; }
    public ProjectStatus Status { get; private set; }
    public DateOnly? TargetDate { get; private set; }
    public DateOnly? ReviewDate { get; private set; }
    public ReviewDateSource? ReviewDateSource { get; private set; }
    public DateTimeOffset? TerminalAt { get; private set; }
}

public sealed class TaskItem : CanonicalEntity
{
    public Guid? GoalId { get; private set; }
    public Guid? ProjectId { get; private set; }
    public string Title { get; private set; } = null!;
    public string? Description { get; private set; }
    public TaskStatus Status { get; private set; }
    public TaskPlacement Placement { get; private set; }
    public DateOnly? PlannedDate { get; private set; }
    public DateOnly? ReviewDate { get; private set; }
    public ReviewDateSource? ReviewDateSource { get; private set; }
    public DateOnly? Deadline { get; private set; }
    public bool IsProtected { get; private set; }
    public string? ProtectionReasonCode { get; private set; }
    public DateTimeOffset? TerminalAt { get; private set; }
}

public sealed class Routine : CanonicalEntity
{
    public Guid? GoalId { get; private set; }
    public Guid? ProjectId { get; private set; }
    public string Title { get; private set; } = null!;
    public string? Description { get; private set; }
    public RoutineStatus Status { get; private set; }
    public JsonDocument RecurrenceDefinition { get; private set; } = null!;
    public string RecurrenceTimezone { get; private set; } = null!;
    public DateOnly EffectiveFromLocalDate { get; private set; }
    public DateOnly? EffectiveUntilLocalDate { get; private set; }
    public Guid? ContinuationOfRoutineId { get; private set; }
    public DateTimeOffset? StoppedAt { get; private set; }
}

public sealed class RoutineOccurrence : CanonicalEntity
{
    public Guid RoutineId { get; private init; }
    public DateOnly ScheduledLocalDate { get; private init; }
    public RoutineOccurrenceStatus Status { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
}
```

Constructors/factories and mutation methods are intentionally omitted here. They must enforce the lifecycle rules from the owning decisions rather than expose public setters.

## Enums

```csharp
public enum CreationSource { Manual, AiAssisted, SystemMigrated }
public enum ReviewDateSource { User, SystemDefault, MigratedDefault }
public enum GoalStatus { Active, Achieved, Abandoned }
public enum ProjectStatus { Active, Completed, Stopped }
public enum TaskStatus { Active, Completed, Dropped }
public enum TaskPlacement { Scheduled, Backlog }
public enum RoutineStatus { Active, Stopped }
public enum RoutineOccurrenceStatus { Pending, Done, Missed }
```

EF Core converters must persist these values using the uppercase contract strings in `V1__canonical_domain.sql`, for example `AI_ASSISTED` and `SYSTEM_MIGRATED`, rather than relying on default enum names.

## EF Core configuration pattern

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TidySense.Infrastructure.Persistence.Configurations;

internal abstract class CanonicalEntityConfiguration<TEntity>
    : IEntityTypeConfiguration<TEntity>
    where TEntity : CanonicalEntity
{
    public virtual void Configure(EntityTypeBuilder<TEntity> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.Id, x.UserId }).IsUnique();

        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired();
        builder.Property(x => x.Source)
            .HasMaxLength(30)
            .HasConversion(
                value => value.ToString().ToUpperInvariant(),
                value => Enum.Parse<CreationSource>(value, ignoreCase: true));
        builder.Property(x => x.Version).IsConcurrencyToken();
    }
}

internal sealed class RoutineOccurrenceConfiguration
    : CanonicalEntityConfiguration<RoutineOccurrence>
{
    public override void Configure(EntityTypeBuilder<RoutineOccurrence> builder)
    {
        base.Configure(builder);
        builder.ToTable("routine_occurrences");
        builder.HasIndex(x => new { x.RoutineId, x.ScheduledLocalDate })
            .IsUnique()
            .HasDatabaseName("uq_occurrences_routine_date");
        builder.Property(x => x.Status)
            .HasMaxLength(20)
            .HasConversion(
                value => value.ToString().ToUpperInvariant(),
                value => Enum.Parse<RoutineOccurrenceStatus>(value, ignoreCase: true));
    }
}
```

All table/column names, check constraints, partial indexes, composite ownership foreign keys, enum converters, and `jsonb` mappings from the reviewed schema must be represented in Fluent API and in the generated migration. Do not depend on conventions for contract-critical names or constraints.

## Repository ports

```csharp
public interface IGoalRepository
{
    Task<Goal?> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken);
    void Add(Goal entity);
}

public interface IProjectRepository
{
    Task<Project?> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken);
    void Add(Project entity);
}

public interface ITaskRepository
{
    Task<TaskItem?> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<TaskItem>> FindTodayAsync(Guid userId, DateOnly date, CancellationToken cancellationToken);
    Task<IReadOnlyList<TaskItem>> FindExecutionOverdueAsync(Guid userId, DateOnly date, CancellationToken cancellationToken);
    Task<IReadOnlyList<TaskItem>> FindReviewDueAsync(Guid userId, DateOnly date, CancellationToken cancellationToken);
    Task<IReadOnlyList<TaskItem>> FindActiveByProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken);
    void Add(TaskItem entity);
}

public interface IRoutineRepository
{
    Task<Routine?> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Routine>> FindActiveByProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken);
    Task<Routine?> FindDirectContinuationAsync(Guid sourceRoutineId, CancellationToken cancellationToken);
    void Add(Routine entity);
}

public interface IRoutineOccurrenceRepository
{
    Task<RoutineOccurrence?> FindAsync(Guid routineId, DateOnly date, CancellationToken cancellationToken);
    Task<IReadOnlyList<RoutineOccurrence>> FindForUserAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken);
    void Add(RoutineOccurrence entity);
}
```

## Unit of work and mapping rule

Repository ports track aggregate changes; the application-level unit of work owns `SaveChangesAsync`, transaction boundaries, outbox persistence, and concurrency-error translation. A SaveChanges interceptor or equivalent application-owned mechanism must increment `Version` for every canonical mutation so the original value participates in the update predicate. These mappings are not permission for direct field mutation. Broad cascade graphs remain intentionally absent.
