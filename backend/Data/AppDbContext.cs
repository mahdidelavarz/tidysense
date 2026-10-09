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
    public DbSet<CaptureItem> Captures => Set<CaptureItem>();
    public DbSet<ReconcileSession> ReconcileSessions => Set<ReconcileSession>();
    public DbSet<ReconcileFact> ReconcileFacts => Set<ReconcileFact>();
    public DbSet<RuleMatch> RuleMatches => Set<RuleMatch>();
    public DbSet<ReconcileExplanation> ReconcileExplanations => Set<ReconcileExplanation>();
    public DbSet<ReconcileRecommendation> ReconcileRecommendations => Set<ReconcileRecommendation>();
    public DbSet<ReconcilePrompt> ReconcilePrompts => Set<ReconcilePrompt>();
    public DbSet<ReconcileExposure> ReconcileExposures => Set<ReconcileExposure>();
    public DbSet<PilotFeedbackResponse> PilotFeedbackResponses => Set<PilotFeedbackResponse>();
    public DbSet<ActionConfirmation> ActionConfirmations => Set<ActionConfirmation>();
    public DbSet<PlanningAttempt> PlanningAttempts => Set<PlanningAttempt>();
    public DbSet<PlanningDraft> PlanningDrafts => Set<PlanningDraft>();
    public DbSet<PlanningDraftRevision> PlanningDraftRevisions => Set<PlanningDraftRevision>();
    public DbSet<PlanningFact> PlanningFacts => Set<PlanningFact>();
    public DbSet<AiInvocation> AiInvocations => Set<AiInvocation>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<CommandResult> CommandResults => Set<CommandResult>();
    public DbSet<DomainEvent> DomainEvents => Set<DomainEvent>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<OperationsRecord> OperationsRecords => Set<OperationsRecord>();

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
            entity.Property(x => x.AiConsentProvider).HasMaxLength(64);
            entity.Property(x => x.AiConsentNoticeVersion).HasMaxLength(16);
            entity.HasIndex(x => x.PhoneNumber).IsUnique();
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Users_SessionEpoch", "\"SessionEpoch\" >= 0");
                // Consent names a provider, a notice version and a time together, or nothing at all.
                t.HasCheckConstraint("CK_Users_AiConsent", "(\"AiConsentProvider\" IS NULL) = (\"AiConsentNoticeVersion\" IS NULL) AND (\"AiConsentProvider\" IS NULL) = (\"AiConsentAt\" IS NULL)");
            });
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
            entity.Property(x => x.ProtectionReasonCode).HasMaxLength(32);
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
                t.HasCheckConstraint("CK_Tasks_Protection", "(\"IsProtected\" AND \"ProtectionReasonCode\" = 'USER') OR (NOT \"IsProtected\" AND \"ProtectionReasonCode\" IS NULL)");
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

        modelBuilder.Entity<CaptureItem>(entity =>
        {
            entity.ToTable("Captures");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.Status, x.CreatedAt, x.Id });
            entity.HasOne(x => x.User).WithMany(x => x.Captures).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Captures_Status", "\"Status\" IN ('UNRESOLVED', 'RESOLVED', 'DISCARDED')");
                t.HasCheckConstraint("CK_Captures_Source", "\"Source\" IN ('MANUAL', 'SYSTEM_MIGRATED')");
                t.HasCheckConstraint("CK_Captures_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_Captures_Resolution", "(\"Status\" = 'UNRESOLVED' AND \"ResolvedAt\" IS NULL) OR (\"Status\" IN ('RESOLVED', 'DISCARDED') AND \"ResolvedAt\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<ReconcileSession>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.TriggerType).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RulesCatalogVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Timezone).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Severity).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.OpenedAt });
            // One open session per user is the database backstop for the open-session check.
            entity.HasIndex(x => x.UserId).IsUnique().HasFilter("\"Status\" = 'OPEN'")
                .HasDatabaseName("IX_ReconcileSessions_OneOpenPerUser");
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ReconcileSessions_Status", "\"Status\" IN ('OPEN', 'COMPLETED', 'ABANDONED', 'EXPIRED')");
                t.HasCheckConstraint("CK_ReconcileSessions_TriggerType", "\"TriggerType\" IN ('MANUAL', 'PROMPT')");
                t.HasCheckConstraint("CK_ReconcileSessions_Severity", "\"Severity\" IN ('NONE', 'LIGHT', 'MEDIUM', 'RECOVERY')");
                t.HasCheckConstraint("CK_ReconcileSessions_Counts", "\"ActionableBacklogCount\" >= 0 AND \"ReviewDueCount\" >= 0 AND \"UnresolvedCaptureCount\" >= 0");
                t.HasCheckConstraint("CK_ReconcileSessions_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_ReconcileSessions_Completion", "(\"Status\" = 'OPEN' AND \"CompletedAt\" IS NULL) OR (\"Status\" <> 'OPEN' AND \"CompletedAt\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<ReconcileFact>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FactType).HasMaxLength(32).IsRequired();
            entity.Property(x => x.EntityType).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ObservedMetrics).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.ReasonCodes).IsRequired();
            entity.Property(x => x.EvidenceQuality).HasMaxLength(16).IsRequired();
            entity.HasIndex(x => x.SessionId);
            entity.HasOne(x => x.Session).WithMany(x => x.Facts).HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(t => t.HasCheckConstraint("CK_ReconcileFacts_MetricsObject",
                "jsonb_typeof(\"ObservedMetrics\") = 'object'"));
        });

        modelBuilder.Entity<RuleMatch>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RuleId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.RuleVersion).HasMaxLength(100).IsRequired();
            entity.Property(x => x.AffectedEntityIds).IsRequired();
            entity.Property(x => x.AllowedActionTypes).IsRequired();
            entity.Property(x => x.ConsequenceCodes).IsRequired();
            entity.HasIndex(x => x.SessionId);
            entity.HasOne(x => x.Session).WithMany(x => x.RuleMatches).HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReconcileExplanation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ExplainerKey).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ContextBuilderVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ContextFingerprint).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ContextManifestJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.Summary).HasMaxLength(400);
            entity.Property(x => x.FailureCode).HasMaxLength(64);
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.SessionId, x.CreatedAt });
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            // One explanation in flight per session is the database backstop for the request check.
            entity.HasIndex(x => x.SessionId).IsUnique().HasFilter("\"Status\" = 'RUNNING'")
                .HasDatabaseName("IX_ReconcileExplanations_OneRunningPerSession");
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ReconcileExplanations_Status", "\"Status\" IN ('RUNNING', 'READY', 'FAILED', 'CANCELLED')");
                t.HasCheckConstraint("CK_ReconcileExplanations_ManifestObject", "jsonb_typeof(\"ContextManifestJson\") = 'object'");
                // Text exists only for a ready explanation, a failure code only for a failed one.
                t.HasCheckConstraint("CK_ReconcileExplanations_Outcome", "(\"Status\" = 'RUNNING') = (\"CompletedAt\" IS NULL) AND (\"Status\" = 'READY') = (\"Summary\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<ReconcileRecommendation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RuleId).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RuleVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ActionType).HasMaxLength(48).IsRequired();
            entity.Property(x => x.TaskIds).IsRequired();
            entity.Property(x => x.EvidenceFingerprint).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Explanation).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Disposition).HasMaxLength(32).IsRequired();
            entity.Property(x => x.EvidenceJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(x => x.ResultingCommandResultId);
            entity.HasIndex(x => new { x.ExplanationId, x.Ordinal }).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ExplanationRecord).WithMany(x => x.Recommendations)
                .HasForeignKey(x => x.ExplanationId).OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ReconcileRecommendations_Disposition", "\"Disposition\" IN ('PENDING', 'ACCEPTED', 'ACCEPTED_EDITED', 'REJECTED', 'CANCELLED', 'EXPIRED_WITHOUT_DECISION')");
                t.HasCheckConstraint("CK_ReconcileRecommendations_EvidenceArray", "jsonb_typeof(\"EvidenceJson\") = 'array'");
                t.HasCheckConstraint("CK_ReconcileRecommendations_Disposed", "(\"Disposition\" = 'PENDING') = (\"DisposedAt\" IS NULL)");
                t.HasCheckConstraint("CK_ReconcileRecommendations_Target", "cardinality(\"TaskIds\") > 0 AND \"Ordinal\" > 0");
            });
        });

        modelBuilder.Entity<ReconcilePrompt>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.State).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.LocalDate }).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ReconcilePrompts_State", "\"State\" IN ('DISMISSED', 'SKIPPED')");
                t.HasCheckConstraint("CK_ReconcilePrompts_Version", "\"Version\" > 0");
            });
        });

        modelBuilder.Entity<ReconcileExposure>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Severity).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            // One exposure per account and local date: looking again is not a second exposure.
            entity.HasIndex(x => new { x.UserId, x.LocalDate }).IsUnique();
            entity.HasIndex(x => x.FirstSeenAt);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t => t.HasCheckConstraint("CK_ReconcileExposures_Severity",
                "\"Severity\" IN ('NONE', 'LIGHT', 'MEDIUM', 'RECOVERY')"));
        });

        modelBuilder.Entity<PilotFeedbackResponse>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Instrument).HasMaxLength(24).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            // One answer per account, question and subject: answering again is not a second answer.
            entity.HasIndex(x => new { x.UserId, x.Instrument, x.SubjectId }).IsUnique();
            entity.HasIndex(x => new { x.Instrument, x.SubjectId });
            entity.HasIndex(x => x.CreatedAt);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_PilotFeedbackResponses_Instrument",
                    "\"Instrument\" IN ('H1_USEFULNESS', 'H2_UNDERSTANDING')");
                t.HasCheckConstraint("CK_PilotFeedbackResponses_Answer", "\"Answer\" BETWEEN 1 AND 5");
                t.HasCheckConstraint("CK_PilotFeedbackResponses_InstrumentVersion", "\"InstrumentVersion\" > 0");
            });
        });

        modelBuilder.Entity<ActionConfirmation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ActionType).HasMaxLength(48).IsRequired();
            entity.Property(x => x.RequestJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.PreviewJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.PreviewHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            entity.HasIndex(x => new { x.Status, x.ExpiresAt });
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.PlanningDraftId);
            entity.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.ReconcileSessionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ReconcileRecommendationId);
            entity.HasOne<ReconcileRecommendation>().WithMany().HasForeignKey(x => x.ReconcileRecommendationId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<PlanningDraft>().WithMany().HasForeignKey(x => x.PlanningDraftId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ActionConfirmations_Status", "\"Status\" IN ('CREATED', 'SUBMITTED', 'RESOLVED', 'EXPIRED', 'CANCELLED')");
                t.HasCheckConstraint("CK_ActionConfirmations_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                t.HasCheckConstraint("CK_ActionConfirmations_Recommendation", "\"ReconcileRecommendationId\" IS NULL OR \"ReconcileSessionId\" IS NOT NULL");
                // A confirmation previews exactly one thing: a Reconcile action or one planning draft revision.
                t.HasCheckConstraint("CK_ActionConfirmations_Subject", "(\"ReconcileSessionId\" IS NOT NULL AND \"PlanningDraftId\" IS NULL AND \"PlanningDraftRevision\" IS NULL) OR (\"ReconcileSessionId\" IS NULL AND \"PlanningDraftId\" IS NOT NULL AND \"PlanningDraftRevision\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<PlanningAttempt>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ClientAttemptId).HasMaxLength(64).IsRequired();
            entity.Property(x => x.RequestHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Intention).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.GeneratorKey).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ContextBuilderVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ContextFingerprint).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ContextManifestJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.FailureCode).HasMaxLength(64);
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.ClientAttemptId }).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            // One generation in flight per user is the database backstop for the collision check.
            entity.HasIndex(x => x.UserId).IsUnique().HasFilter("\"Status\" IN ('QUEUED', 'RUNNING')")
                .HasDatabaseName("IX_PlanningAttempts_OneInFlightPerUser");
            entity.Property(x => x.Outcome).HasMaxLength(16);
            entity.Property(x => x.ClarificationJson).HasColumnType("jsonb");
            entity.Property(x => x.AnswersJson).HasColumnType("jsonb");
            // A clarification is answered by at most one following attempt.
            entity.HasIndex(x => x.PreviousAttemptId).IsUnique().HasFilter("\"PreviousAttemptId\" IS NOT NULL");
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PlanningAttempt>().WithMany().HasForeignKey(x => x.PreviousAttemptId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_PlanningAttempts_Status", "\"Status\" IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')");
                t.HasCheckConstraint("CK_PlanningAttempts_ContextExclusive", "NOT (\"ContextGoalId\" IS NOT NULL AND \"ContextProjectId\" IS NOT NULL)");
                t.HasCheckConstraint("CK_PlanningAttempts_ManifestObject", "jsonb_typeof(\"ContextManifestJson\") = 'object'");
                t.HasCheckConstraint("CK_PlanningAttempts_Completion", "(\"Status\" IN ('QUEUED', 'RUNNING')) = (\"CompletedAt\" IS NULL)");
                // Only a draft outcome has a draft; a clarification or a blocked input has its questions or reason instead.
                t.HasCheckConstraint("CK_PlanningAttempts_Outcome", "(\"Status\" = 'SUCCEEDED') = (\"Outcome\" IS NOT NULL) AND (COALESCE(\"Outcome\", '') = 'DRAFT') = (\"DraftId\" IS NOT NULL) AND (COALESCE(\"Outcome\", '') IN ('CLARIFICATION', 'INPUT_BLOCKED')) = (\"ClarificationJson\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");
                t.HasCheckConstraint("CK_PlanningAttempts_OutcomeValue", "\"Outcome\" IS NULL OR \"Outcome\" IN ('DRAFT', 'CLARIFICATION', 'INPUT_BLOCKED')");
                t.HasCheckConstraint("CK_PlanningAttempts_ClarificationTurn", "\"ClarificationTurn\" BETWEEN 0 AND 3 AND (\"ClarificationTurn\" > 0) = (\"PreviousAttemptId\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<AiInvocation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Family).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ConfigurationKey).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ProviderKey).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Model).HasMaxLength(64).IsRequired();
            entity.Property(x => x.PromptVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.SchemaVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ContextBuilderVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.RepairPolicyVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Outcome).HasMaxLength(16).IsRequired();
            entity.Property(x => x.FailureClass).HasMaxLength(32);
            entity.Property(x => x.Gate).HasMaxLength(16);
            entity.Property(x => x.RepairRulesJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.RetryReason).HasMaxLength(32);
            entity.Property(x => x.ContextReduction).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.Family, x.StartedAt });
            entity.HasIndex(x => x.PlanningAttemptId);
            entity.HasIndex(x => x.ReconcileExplanationId);
            entity.HasOne<ReconcileExplanation>().WithMany().HasForeignKey(x => x.ReconcileExplanationId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            // The diagnostic row outlives the temporary attempt it describes.
            entity.HasOne<PlanningAttempt>().WithMany().HasForeignKey(x => x.PlanningAttemptId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.ToTable(t =>
            {
                // At most two physical calls per operation; 0 records an operation that never reached the provider.
                t.HasCheckConstraint("CK_AiInvocations_Sequence", "\"Sequence\" BETWEEN 0 AND 2");
                t.HasCheckConstraint("CK_AiInvocations_Outcome", "\"Outcome\" IN ('SUCCEEDED', 'FAILED', 'REJECTED', 'BLOCKED', 'CANCELLED')");
                t.HasCheckConstraint("CK_AiInvocations_RepairRulesArray", "jsonb_typeof(\"RepairRulesJson\") = 'array'");
            });
        });

        modelBuilder.Entity<PlanningDraft>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.SchemaVersion).HasMaxLength(32).IsRequired();
            entity.Property(x => x.ContextFingerprint).HasMaxLength(64).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => x.AttemptId).IsUnique();
            entity.HasIndex(x => new { x.Status, x.ExpiresAt });
            // One unapproved draft per user: a new flow must explicitly replace the previous one.
            entity.HasIndex(x => x.UserId).IsUnique().HasFilter("\"Status\" = 'REVIEWABLE'")
                .HasDatabaseName("IX_PlanningDrafts_OneReviewablePerUser");
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PlanningAttempt>().WithMany().HasForeignKey(x => x.AttemptId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                // CONFIRMED is deliberately absent: whether a draft was applied is a command result, not a draft state.
                t.HasCheckConstraint("CK_PlanningDrafts_Status", "\"Status\" IN ('REVIEWABLE', 'SUPERSEDED', 'EXPIRED', 'CANCELLED')");
                t.HasCheckConstraint("CK_PlanningDrafts_Revision", "\"CurrentRevision\" > 0");
                t.HasCheckConstraint("CK_PlanningDrafts_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_PlanningDrafts_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                t.HasCheckConstraint("CK_PlanningDrafts_ContextExclusive", "NOT (\"ContextGoalId\" IS NOT NULL AND \"ContextProjectId\" IS NOT NULL)");
            });
        });

        modelBuilder.Entity<PlanningDraftRevision>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Origin).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ContentJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(x => new { x.DraftId, x.Revision }).IsUnique();
            entity.HasOne(x => x.Draft).WithMany(x => x.Revisions).HasForeignKey(x => x.DraftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_PlanningDraftRevisions_Revision", "\"Revision\" > 0");
                t.HasCheckConstraint("CK_PlanningDraftRevisions_Origin", "\"Origin\" IN ('GENERATED', 'USER_EDIT')");
                t.HasCheckConstraint("CK_PlanningDraftRevisions_ContentObject", "jsonb_typeof(\"ContentJson\") = 'object'");
            });
        });

        modelBuilder.Entity<PlanningFact>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FactType).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Strength).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ValueJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.Source).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.GoalId, x.Status });
            entity.HasIndex(x => new { x.UserId, x.ProjectId, x.Status });
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Goal>().WithMany()
                .HasForeignKey(x => new { x.GoalId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Project>().WithMany()
                .HasForeignKey(x => new { x.ProjectId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId })
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_PlanningFacts_OneScope", "(\"GoalId\" IS NOT NULL) <> (\"ProjectId\" IS NOT NULL)");
                t.HasCheckConstraint("CK_PlanningFacts_FactType", "\"FactType\" IN ('UNAVAILABLE_WEEKDAY', 'UNAVAILABLE_DATE', 'UNAVAILABLE_DATE_RANGE', 'AVAILABLE_DEVICE', 'CURRENT_LEVEL', 'LEARNING_FOCUS', 'EXCLUDED_PATH')");
                // HARD is a closed vocabulary: only what can be checked against a date.
                t.HasCheckConstraint("CK_PlanningFacts_Strength", "\"Strength\" IN ('SOFT', 'INFORMATIONAL') OR (\"Strength\" = 'HARD' AND \"FactType\" IN ('UNAVAILABLE_WEEKDAY', 'UNAVAILABLE_DATE', 'UNAVAILABLE_DATE_RANGE'))");
                t.HasCheckConstraint("CK_PlanningFacts_Source", "\"Source\" IN ('USER_EXPLICIT', 'USER_CONFIRMED_AI_EXTRACTION')");
                t.HasCheckConstraint("CK_PlanningFacts_Status", "\"Status\" IN ('ACTIVE', 'EXPIRED', 'REMOVED')");
                t.HasCheckConstraint("CK_PlanningFacts_ValueObject", "jsonb_typeof(\"ValueJson\") = 'object'");
                t.HasCheckConstraint("CK_PlanningFacts_Version", "\"Version\" > 0");
                t.HasCheckConstraint("CK_PlanningFacts_Lifecycle", "(\"Status\" = 'REMOVED') = (\"RemovedAt\" IS NOT NULL) AND (\"Status\" = 'EXPIRED') = (\"ExpiredAt\" IS NOT NULL)");
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

        modelBuilder.Entity<OperationsRecord>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Operator).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ReasonCode).HasMaxLength(64);
            entity.Property(x => x.Outcome).HasMaxLength(16).IsRequired();
            entity.Property(x => x.DetailsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.RetentionClass).HasMaxLength(2).IsRequired();
            entity.HasIndex(x => new { x.Kind, x.CreatedAt });
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_OperationsRecords_Kind", "\"Kind\" IN ('MAINTENANCE_RUN', 'USER_ERASURE', 'ALERT_DIGEST')");
                t.HasCheckConstraint("CK_OperationsRecords_Outcome", "\"Outcome\" IN ('SUCCEEDED', 'FAILED')");
                t.HasCheckConstraint("CK_OperationsRecords_DetailsObject", "jsonb_typeof(\"DetailsJson\") = 'object'");
            });
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
