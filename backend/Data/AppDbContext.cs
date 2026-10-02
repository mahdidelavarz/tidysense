using Microsoft.EntityFrameworkCore;
using TidySense.Common.Events;
using TidySense.Models;

namespace TidySense.Data;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    EventPayloadValidator eventPayloadValidator) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();
    public DbSet<OtpRateEvent> OtpRateEvents => Set<OtpRateEvent>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Routine> Routines => Set<Routine>();
    public DbSet<RoutineOccurrence> RoutineOccurrences => Set<RoutineOccurrence>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<CommandResult> CommandResults => Set<CommandResult>();
    public DbSet<DomainEvent> DomainEvents => Set<DomainEvent>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidateEventPayloads();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ValidateEventPayloads();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PhoneNumber).HasMaxLength(16).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(200);
            entity.HasIndex(x => x.PhoneNumber).IsUnique();
            entity.ToTable(t => t.HasCheckConstraint("CK_Users_SessionEpoch", "\"SessionEpoch\" >= 0"));
        });

        modelBuilder.Entity<OtpChallenge>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.NormalizedPhone).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Purpose).HasMaxLength(16).IsRequired();
            entity.Property(x => x.CodeDigest).HasMaxLength(128).IsRequired();
            entity.HasIndex(x => new { x.NormalizedPhone, x.Purpose, x.CreatedAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_OtpChallenges_AttemptCount", "\"AttemptCount\" >= 0"));
        });

        modelBuilder.Entity<OtpRateEvent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasMaxLength(24).IsRequired();
            entity.Property(x => x.KeyDigest).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => new { x.Kind, x.KeyDigest, x.CreatedAt });
            entity.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasAlternateKey(x => new { x.Id, x.UserId });
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.DesiredOutcome).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ReviewDateSource).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id });
            entity.HasIndex(x => new { x.UserId, x.Status, x.ReviewDate });
            entity.HasOne(x => x.User).WithMany(x => x.Goals).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Goals_Status", "\"Status\" IN ('ACTIVE', 'ACHIEVED', 'ABANDONED')");
                t.HasCheckConstraint("CK_Goals_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                t.HasCheckConstraint("CK_Goals_ReviewDateSource", "\"ReviewDateSource\" IN ('USER', 'SYSTEM_DEFAULT', 'MIGRATED_DEFAULT')");
                t.HasCheckConstraint("CK_Goals_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_Goals_TerminalState", "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL) OR (\"Status\" IN ('ACHIEVED', 'ABANDONED') AND \"TerminalAt\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasAlternateKey(x => new { x.Id, x.UserId });
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CompletionMeaning).HasMaxLength(2000);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ReviewDateSource).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id });
            entity.HasIndex(x => new { x.UserId, x.Status, x.ReviewDate });
            entity.HasOne(x => x.User).WithMany(x => x.Projects).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Goal).WithMany(x => x.Projects)
                .HasForeignKey(x => new { x.GoalId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Projects_Status", "\"Status\" IN ('ACTIVE', 'COMPLETED', 'STOPPED')");
                t.HasCheckConstraint("CK_Projects_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                t.HasCheckConstraint("CK_Projects_ReviewDateSource", "\"ReviewDateSource\" IN ('USER', 'SYSTEM_DEFAULT', 'MIGRATED_DEFAULT')");
                t.HasCheckConstraint("CK_Projects_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_Projects_TerminalState", "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL) OR (\"Status\" IN ('COMPLETED', 'STOPPED') AND \"TerminalAt\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id });
            entity.HasIndex(x => new { x.UserId, x.Status, x.PlannedDate });
            entity.HasIndex(x => new { x.UserId, x.GoalId, x.Status });
            entity.HasIndex(x => new { x.UserId, x.ProjectId, x.Status });
            entity.HasIndex(x => new { x.UserId, x.SequenceId, x.SequenceOrder })
                .IsUnique().HasFilter("\"SequenceId\" IS NOT NULL");
            entity.HasOne(x => x.User).WithMany(x => x.Tasks).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Goal).WithMany(x => x.Tasks)
                .HasForeignKey(x => new { x.GoalId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Project).WithMany(x => x.Tasks)
                .HasForeignKey(x => new { x.ProjectId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Tasks_Status", "\"Status\" IN ('ACTIVE', 'COMPLETED', 'DROPPED')");
                t.HasCheckConstraint("CK_Tasks_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                t.HasCheckConstraint("CK_Tasks_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_Tasks_ParentExclusive", "NOT (\"GoalId\" IS NOT NULL AND \"ProjectId\" IS NOT NULL)");
                t.HasCheckConstraint("CK_Tasks_TemporalValidity", "\"Status\" <> 'ACTIVE' OR \"GoalId\" IS NOT NULL OR \"ProjectId\" IS NOT NULL OR \"PlannedDate\" IS NOT NULL");
                t.HasCheckConstraint("CK_Tasks_SequencePair", "(\"SequenceId\" IS NULL AND \"SequenceOrder\" IS NULL) OR (\"SequenceId\" IS NOT NULL AND \"SequenceOrder\" IS NOT NULL AND \"SequenceOrder\" > 0)");
                t.HasCheckConstraint("CK_Tasks_Deadline", "\"Deadline\" IS NULL OR \"PlannedDate\" IS NULL OR \"PlannedDate\" <= \"Deadline\"");
                t.HasCheckConstraint("CK_Tasks_TerminalState", "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL AND \"CompletedForLocalDate\" IS NULL) OR (\"Status\" = 'COMPLETED' AND \"TerminalAt\" IS NOT NULL AND \"CompletedForLocalDate\" IS NOT NULL) OR (\"Status\" = 'DROPPED' AND \"TerminalAt\" IS NOT NULL AND \"CompletedForLocalDate\" IS NULL)");
            });
        });

        modelBuilder.Entity<Routine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RecurrenceDefinition).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.RecurrenceTimezone).HasMaxLength(64).IsRequired();
            entity.Property(x => x.TimesOfDay).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id });
            entity.HasIndex(x => new { x.UserId, x.Status });
            entity.HasIndex(x => new { x.UserId, x.GoalId, x.Status });
            entity.HasIndex(x => new { x.UserId, x.ProjectId, x.Status });
            entity.HasIndex(x => x.ContinuationOfRoutineId)
                .IsUnique().HasFilter("\"ContinuationOfRoutineId\" IS NOT NULL");
            entity.HasOne(x => x.User).WithMany(x => x.Routines).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Goal).WithMany(x => x.Routines)
                .HasForeignKey(x => new { x.GoalId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Project).WithMany(x => x.Routines)
                .HasForeignKey(x => new { x.ProjectId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ContinuationOf).WithMany()
                .HasForeignKey(x => x.ContinuationOfRoutineId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Routines_Status", "\"Status\" IN ('ACTIVE', 'STOPPED')");
                t.HasCheckConstraint("CK_Routines_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                t.HasCheckConstraint("CK_Routines_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_Routines_ParentExclusive", "NOT (\"GoalId\" IS NOT NULL AND \"ProjectId\" IS NOT NULL)");
                t.HasCheckConstraint("CK_Routines_RecurrenceObject", "jsonb_typeof(\"RecurrenceDefinition\") = 'object'");
                // A Routine stopped before its first eligible date has an empty range: until = from - 1.
                t.HasCheckConstraint("CK_Routines_EffectiveRange", "\"EffectiveUntilLocalDate\" IS NULL OR \"EffectiveUntilLocalDate\" >= \"EffectiveFromLocalDate\" - 1");
                t.HasCheckConstraint("CK_Routines_StoppedState", "(\"Status\" = 'ACTIVE' AND \"StoppedAt\" IS NULL AND \"EffectiveUntilLocalDate\" IS NULL) OR (\"Status\" = 'STOPPED' AND \"StoppedAt\" IS NOT NULL AND \"EffectiveUntilLocalDate\" IS NOT NULL)");
                t.HasCheckConstraint("CK_Routines_ContinuationNotSelf", "\"ContinuationOfRoutineId\" IS NULL OR \"ContinuationOfRoutineId\" <> \"Id\"");
            });
        });

        modelBuilder.Entity<RoutineOccurrence>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.RoutineId, x.ScheduledLocalDate, x.ScheduledLocalTime })
                .IsUnique().HasFilter("\"ScheduledLocalTime\" IS NOT NULL")
                .HasDatabaseName("IX_RoutineOccurrences_TimedIdentity");
            entity.HasIndex(x => new { x.RoutineId, x.ScheduledLocalDate })
                .IsUnique().HasFilter("\"ScheduledLocalTime\" IS NULL")
                .HasDatabaseName("IX_RoutineOccurrences_UntimedIdentity");
            entity.HasIndex(x => new { x.Status, x.ScheduledLocalDate });
            entity.HasOne(x => x.Routine).WithMany(x => x.Occurrences).HasForeignKey(x => x.RoutineId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_RoutineOccurrences_Status", "\"Status\" IN ('PENDING', 'DONE', 'MISSED')");
                t.HasCheckConstraint("CK_RoutineOccurrences_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_RoutineOccurrences_Resolution", "(\"Status\" = 'PENDING' AND \"ResolvedAt\" IS NULL) OR (\"Status\" IN ('DONE', 'MISSED') AND \"ResolvedAt\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<IdempotencyRecord>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(128).IsRequired();
            entity.Property(x => x.CommandType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.RequestHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(24).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
            entity.HasIndex(x => new { x.Status, x.ExpiresAt });
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t => t.HasCheckConstraint("CK_IdempotencyRecords_Status",
                "\"Status\" IN ('IN_PROGRESS', 'SUCCEEDED', 'CONFLICTED', 'FAILED_FINAL', 'FAILED_RETRYABLE')"));
        });

        modelBuilder.Entity<CommandResult>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CommandType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(24).IsRequired();
            entity.Property(x => x.AggregateType).HasMaxLength(100);
            entity.Property(x => x.ErrorCode).HasMaxLength(100);
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => x.IdempotencyRecordId).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_CommandResults_Status",
                "\"Status\" IN ('SUCCEEDED', 'CONFLICTED', 'FAILED_FINAL', 'FAILED_RETRYABLE')"));
        });

        modelBuilder.Entity<DomainEvent>(entity =>
        {
            entity.HasKey(x => x.EventId);
            entity.Property(x => x.EventType).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Actor).HasMaxLength(32).IsRequired();
            entity.Property(x => x.AggregateType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.CorrelationId).HasMaxLength(128).IsRequired();
            entity.Property(x => x.RuleId).HasMaxLength(100);
            entity.Property(x => x.RuleVersion).HasMaxLength(100);
            entity.Property(x => x.PayloadJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.OccurredAt });
            entity.HasIndex(x => new { x.AggregateType, x.AggregateId, x.OccurredAt });
            entity.HasIndex(x => x.TransactionId);
            entity.HasIndex(x => x.CorrelationId);
            entity.HasIndex(x => x.CommandResultId);
            entity.HasOne<CommandResult>().WithMany().HasForeignKey(x => x.CommandResultId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_DomainEvents_EventVersion", "\"EventVersion\" > 0");
                t.HasCheckConstraint("CK_DomainEvents_AggregateVersion", "\"AggregateVersion\" > 0");
                t.HasCheckConstraint("CK_DomainEvents_Actor", "\"Actor\" IN ('USER', 'SYSTEM_DETERMINISTIC')");
                t.HasCheckConstraint("CK_DomainEvents_PayloadObject", "jsonb_typeof(\"PayloadJson\") = 'object'");
                t.HasCheckConstraint("CK_DomainEvents_PayloadSize", "octet_length(\"PayloadJson\"::text) <= 4096");
            });
        });

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(24).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => x.EventId).IsUnique();
            entity.HasIndex(x => new { x.Status, x.NextAttemptAt });
            entity.HasOne<DomainEvent>().WithMany().HasForeignKey(x => x.EventId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t => t.HasCheckConstraint("CK_OutboxMessages_AttemptCount", "\"AttemptCount\" >= 0"));
        });
    }

    private void ValidateEventPayloads()
    {
        foreach (var entry in ChangeTracker.Entries<DomainEvent>()
                     .Where(x => x.State is EntityState.Added or EntityState.Modified))
            eventPayloadValidator.Validate(entry.Entity.EventType, entry.Entity.EventVersion,
                entry.Entity.PayloadJson);
    }
}
