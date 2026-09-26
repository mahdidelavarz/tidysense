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
    public DbSet<Project> Projects => Set<Project>();
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

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.Id });
            entity.HasOne(x => x.User).WithMany(x => x.Projects).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
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
