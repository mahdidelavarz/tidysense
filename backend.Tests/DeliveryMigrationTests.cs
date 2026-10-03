using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class DeliveryMigrationTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    [Fact]
    public async Task Step3_migration_can_roll_back_to_step2_and_upgrade_without_losing_existing_users()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989120005555", IsActive = true,
            SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260921120000_CompleteAuthentication", cancellationToken);
        Assert.Equal(1, await db.Users.AsNoTracking().CountAsync(x => x.Id == user.Id, cancellationToken));
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        Assert.Equal(1, await db.Users.AsNoTracking().CountAsync(x => x.Id == user.Id, cancellationToken));
        Assert.Equal(0, await db.IdempotencyRecords.CountAsync(cancellationToken));
        Assert.Equal(0, await db.CommandResults.CountAsync(cancellationToken));
        Assert.Equal(0, await db.DomainEvents.CountAsync(cancellationToken));
        Assert.Equal(0, await db.OutboxMessages.CountAsync(cancellationToken));
    }

    [Fact]
    public async Task Event_contract_migration_rolls_back_after_R4_cleanup_and_reapplies()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        var idempotency = new IdempotencyRecord
        {
            Id = Guid.NewGuid(), UserId = user.Id, IdempotencyKey = "migration-retention",
            CommandType = "TEST_PROJECT_RENAME", RequestHash = new string('0', 64),
            Status = "SUCCEEDED", CreatedAt = now, CompletedAt = now, ExpiresAt = now.AddHours(1)
        };
        var result = new CommandResult
        {
            Id = Guid.NewGuid(), UserId = user.Id, IdempotencyRecordId = idempotency.Id,
            CommandType = idempotency.CommandType, Status = "SUCCEEDED", CreatedAt = now
        };
        idempotency.ResultId = result.Id;
        db.AddRange(user, idempotency, result);
        await db.SaveChangesAsync(cancellationToken);
        Assert.Equal(1, await db.IdempotencyRecords.Where(x => x.Id == idempotency.Id)
            .ExecuteDeleteAsync(cancellationToken));

        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260921123236_Step3DeliveryContracts", cancellationToken);
        Assert.Equal(1, await db.IdempotencyRecords.AsNoTracking()
            .CountAsync(x => x.Id == idempotency.Id, cancellationToken));
        var legacyEventId = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "DomainEvents"
                ("EventId", "EventType", "EventVersion", "OccurredAt", "RecordedAt", "UserId",
                 "Actor", "AggregateType", "AggregateId", "AggregateVersion", "TransactionId",
                 "CorrelationId", "CommandId", "PayloadJson", "RetentionClass")
            VALUES ({legacyEventId}, {"LEGACY_TEST_EVENT"}, {1}, {now}, {now}, {user.Id}, {"USER"},
                    {"Project"}, {Guid.NewGuid()}, {1L}, {Guid.NewGuid()}, {"legacy-link"},
                    {Guid.NewGuid()}, {"{}"}::jsonb, {"R1"})
            """, cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        Assert.Null((await db.DomainEvents.AsNoTracking()
            .SingleAsync(x => x.EventId == legacyEventId, cancellationToken)).CommandResultId);
        Assert.Equal(1, await db.IdempotencyRecords.Where(x => x.Id == idempotency.Id)
            .ExecuteDeleteAsync(cancellationToken));
        Assert.Equal(1, await db.CommandResults.AsNoTracking()
            .CountAsync(x => x.Id == result.Id, cancellationToken));
    }

    [Fact]
    public async Task Step4_migration_backfills_existing_project_and_round_trips_description_rename()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260926085120_HardenStep3EventContract", cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Users" ("Id", "PhoneNumber", "IsActive", "SessionEpoch", "SetupComplete", "CreatedAt")
            VALUES ({userId}, {"+989" + Random.Shared.Next(100000000, 1000000000)}, {true}, {0}, {true}, {now});
            INSERT INTO "Projects" ("Id", "UserId", "Title", "Description", "ReviewDate", "Version", "CreatedAt", "UpdatedAt")
            VALUES ({projectId}, {userId}, {"Legacy project"}, {"Legacy meaning"}, {new DateOnly(2026, 12, 1)}, {1L}, {now}, {now});
            """, cancellationToken);

        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        db.ChangeTracker.Clear();
        var upgraded = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == projectId, cancellationToken);
        Assert.Equal("Legacy meaning", upgraded.CompletionMeaning);
        Assert.Equal("ACTIVE", upgraded.Status);
        Assert.Equal("MIGRATED_DEFAULT", upgraded.ReviewDateSource);
        Assert.Equal("SYSTEM_MIGRATED", upgraded.Source);

        await migrator.MigrateAsync("20260926085120_HardenStep3EventContract", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        db.ChangeTracker.Clear();
        var reapplied = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == projectId, cancellationToken);
        Assert.Equal("Legacy meaning", reapplied.CompletionMeaning);
        Assert.Equal("MIGRATED_DEFAULT", reapplied.ReviewDateSource);
    }

    [Fact]
    public async Task Step5_task_schema_round_trips_from_the_verified_parent_baseline()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260927072255_Step4GoalProjectModules", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        var task = new TaskItem
        {
            Id = Guid.NewGuid(), UserId = user.Id, Title = "Migration Task",
            PlannedDate = new DateOnly(2026, 9, 28), CreatedAt = now, UpdatedAt = now
        };
        db.AddRange(user, task);
        await db.SaveChangesAsync(cancellationToken);
        Assert.Equal(1, await db.Tasks.CountAsync(x => x.Id == task.Id, cancellationToken));

        db.Tasks.Remove(task);
        db.Users.Remove(user);
        await db.SaveChangesAsync(cancellationToken);
        await migrator.MigrateAsync("20260927072255_Step4GoalProjectModules", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        Assert.Equal(0, await db.Tasks.CountAsync(cancellationToken));
    }

    [Fact]
    public async Task Step6_routine_schema_round_trips_from_the_verified_task_baseline()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20260928113808_Step5TaskToday", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        var routine = new Routine
        {
            Id = Guid.NewGuid(), UserId = user.Id, Title = "Migration Routine",
            RecurrenceDefinition = "{\"type\":\"DAILY\"}", RecurrenceTimezone = "Asia/Tehran",
            TimesOfDay = [new TimeOnly(8, 0), new TimeOnly(20, 0)],
            EffectiveFromLocalDate = new DateOnly(2026, 10, 2), CreatedAt = now, UpdatedAt = now
        };
        var occurrence = new RoutineOccurrence
        {
            Id = Guid.NewGuid(), RoutineId = routine.Id, ScheduledLocalDate = new DateOnly(2026, 10, 2),
            ScheduledLocalTime = new TimeOnly(8, 0), CreatedAt = now, UpdatedAt = now
        };
        db.AddRange(user, routine, occurrence);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();
        var stored = await db.Routines.AsNoTracking().SingleAsync(x => x.Id == routine.Id, cancellationToken);
        Assert.Equal(routine.TimesOfDay, stored.TimesOfDay);

        await db.RoutineOccurrences.Where(x => x.Id == occurrence.Id).ExecuteDeleteAsync(cancellationToken);
        await db.Routines.Where(x => x.Id == routine.Id).ExecuteDeleteAsync(cancellationToken);
        await db.Users.Where(x => x.Id == user.Id).ExecuteDeleteAsync(cancellationToken);
        await migrator.MigrateAsync("20260928113808_Step5TaskToday", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        Assert.Equal(0, await db.Routines.CountAsync(cancellationToken));
        Assert.Equal(0, await db.RoutineOccurrences.CountAsync(cancellationToken));
    }

    [Fact]
    public async Task Step7_capture_and_reconcile_schema_round_trips_and_keeps_existing_tasks_unprotected()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20261002132639_Step6RoutineOccurrence", cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var userId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Users" ("Id", "PhoneNumber", "IsActive", "SessionEpoch", "SetupComplete", "CreatedAt")
            VALUES ({userId}, {"+989" + Random.Shared.Next(100000000, 1000000000)}, {true}, {0}, {true}, {now});
            INSERT INTO "Tasks" ("Id", "UserId", "Title", "Status", "PlannedDate", "Source", "Version", "CreatedAt", "UpdatedAt")
            VALUES ({taskId}, {userId}, {"Step 6 task"}, {"ACTIVE"}, {new DateOnly(2026, 10, 2)}, {"MANUAL"}, {1L}, {now}, {now});
            """, cancellationToken);

        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        db.ChangeTracker.Clear();
        var upgraded = await db.Tasks.AsNoTracking().SingleAsync(x => x.Id == taskId, cancellationToken);
        Assert.False(upgraded.IsProtected);
        Assert.Null(upgraded.ProtectionReasonCode);

        var capture = new CaptureItem
        {
            Id = Guid.NewGuid(), UserId = userId, Title = "Migration capture", CreatedAt = now, UpdatedAt = now
        };
        var session = new ReconcileSession
        {
            Id = Guid.NewGuid(), UserId = userId, RulesCatalogVersion = "test", Timezone = "Asia/Tehran",
            LocalDate = new DateOnly(2026, 10, 3), OpenedAt = now
        };
        db.AddRange(capture, session);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        // The filtered unique index allows only one open session per user.
        db.ReconcileSessions.Add(new ReconcileSession
        {
            Id = Guid.NewGuid(), UserId = userId, RulesCatalogVersion = "test", Timezone = "Asia/Tehran",
            LocalDate = new DateOnly(2026, 10, 3), OpenedAt = now
        });
        var duplicate = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(cancellationToken));
        Assert.Equal("IX_ReconcileSessions_OneOpenPerUser",
            ((Npgsql.PostgresException)duplicate.InnerException!).ConstraintName);
        db.ChangeTracker.Clear();

        await migrator.MigrateAsync("20261002132639_Step6RoutineOccurrence", cancellationToken);
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        Assert.Equal(0, await db.Captures.CountAsync(cancellationToken));
        Assert.Equal(0, await db.ReconcileSessions.CountAsync(cancellationToken));
        Assert.Equal(1, await db.Tasks.AsNoTracking().CountAsync(x => x.Id == taskId, cancellationToken));
    }

    [Fact]
    public async Task Step8_planning_schema_round_trips_and_keeps_reconcile_confirmations()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var hash = new string('A', 64);
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        var goal = new Goal
        {
            Id = Guid.NewGuid(), UserId = user.Id, Title = "Migration goal", DesiredOutcome = "Outcome",
            ReviewDate = new DateOnly(2026, 12, 1), CreatedAt = now, UpdatedAt = now
        };
        var session = new ReconcileSession
        {
            Id = Guid.NewGuid(), UserId = user.Id, RulesCatalogVersion = "test", Timezone = "Asia/Tehran",
            LocalDate = new DateOnly(2026, 10, 3), OpenedAt = now
        };
        PlanningAttempt Attempt(Guid draftId) => new()
        {
            Id = Guid.NewGuid(), UserId = user.Id, ClientAttemptId = $"migration-{draftId:N}",
            RequestHash = hash, Status = PlanningAttemptStatuses.Succeeded, Intention = "Migration intention",
            GeneratorKey = "test", ContextBuilderVersion = "test", ContextFingerprint = hash, DraftId = draftId,
            Outcome = PlanningOutcomes.Draft, CreatedAt = now, UpdatedAt = now, CompletedAt = now
        };
        PlanningDraft Draft(PlanningAttempt attempt) => new()
        {
            Id = attempt.DraftId!.Value, UserId = user.Id, AttemptId = attempt.Id, SchemaVersion = "test",
            ContextFingerprint = hash, CreatedAt = now, UpdatedAt = now, ExpiresAt = now.AddDays(1),
            Revisions = [new PlanningDraftRevision { Id = Guid.NewGuid(), Revision = 1, CreatedAt = now }]
        };
        ActionConfirmation Confirmation(Guid? sessionId, Guid? draftId) => new()
        {
            Id = Guid.NewGuid(), UserId = user.Id, ReconcileSessionId = sessionId, PlanningDraftId = draftId,
            PlanningDraftRevision = draftId is null ? null : 1, ActionType = "TEST", PreviewHash = hash,
            CreatedAt = now, ExpiresAt = now.AddMinutes(15)
        };
        var attempt = Attempt(Guid.NewGuid());
        var draft = Draft(attempt);
        var reconcileConfirmation = Confirmation(session.Id, null);
        db.AddRange(user, goal, session, attempt, draft, reconcileConfirmation, Confirmation(null, draft.Id),
            new PlanningFact
            {
                Id = Guid.NewGuid(), UserId = user.Id, GoalId = goal.Id, FactType = "UNAVAILABLE_WEEKDAY",
                Strength = "HARD", ValueJson = "{\"weekdays\":[5]}", CapturedAt = now, LastConfirmedAt = now,
                UpdatedAt = now
            });
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        // Only one unapproved draft per user.
        var secondAttempt = Attempt(Guid.NewGuid());
        db.AddRange(secondAttempt, Draft(secondAttempt));
        Assert.Equal("IX_PlanningDrafts_OneReviewablePerUser", await ConstraintAsync());
        // A confirmation previews exactly one thing.
        db.Add(Confirmation(null, null));
        Assert.Equal("CK_ActionConfirmations_Subject", await ConstraintAsync());
        db.Add(Confirmation(session.Id, draft.Id));
        Assert.Equal("CK_ActionConfirmations_Subject", await ConstraintAsync());
        // HARD is limited to what a date can prove, and a detail has exactly one scope.
        db.Add(new PlanningFact
        {
            Id = Guid.NewGuid(), UserId = user.Id, GoalId = goal.Id, FactType = "AVAILABLE_DEVICE",
            Strength = "HARD", ValueJson = "{\"text\":\"phone\"}", CapturedAt = now, LastConfirmedAt = now,
            UpdatedAt = now
        });
        Assert.Equal("CK_PlanningFacts_Strength", await ConstraintAsync());
        db.Add(new PlanningFact
        {
            Id = Guid.NewGuid(), UserId = user.Id, FactType = "AVAILABLE_DEVICE", Strength = "SOFT",
            ValueJson = "{\"text\":\"phone\"}", CapturedAt = now, LastConfirmedAt = now, UpdatedAt = now
        });
        Assert.Equal("CK_PlanningFacts_OneScope", await ConstraintAsync());

        await migrator.MigrateAsync("20261002143512_Step7CaptureReconcile", cancellationToken);
        Assert.Equal(1, await db.Database.SqlQuery<int>(
            $"SELECT COUNT(*)::int AS \"Value\" FROM \"ActionConfirmations\" WHERE \"UserId\" = {user.Id}")
            .SingleAsync(cancellationToken));
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        db.ChangeTracker.Clear();
        var kept = await db.ActionConfirmations.AsNoTracking().SingleAsync(x => x.UserId == user.Id, cancellationToken);
        Assert.Equal(reconcileConfirmation.Id, kept.Id);
        Assert.Equal(session.Id, kept.ReconcileSessionId);
        Assert.Null(kept.PlanningDraftId);
        Assert.Equal(0, await db.PlanningAttempts.CountAsync(cancellationToken));
        Assert.Equal(0, await db.PlanningDrafts.CountAsync(cancellationToken));
        Assert.Equal(0, await db.PlanningFacts.CountAsync(cancellationToken));

        await db.ActionConfirmations.Where(x => x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await db.ReconcileSessions.Where(x => x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await db.Goals.Where(x => x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await db.Users.Where(x => x.Id == user.Id).ExecuteDeleteAsync(cancellationToken);

        async Task<string?> ConstraintAsync()
        {
            var failure = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(cancellationToken));
            db.ChangeTracker.Clear();
            return ((Npgsql.PostgresException)failure.InnerException!).ConstraintName;
        }
    }

    [Fact]
    public async Task Step9_ai_runtime_schema_round_trips_and_keeps_existing_draft_attempts()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(cancellationToken: cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var hash = new string('B', 64);
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = now
        };
        PlanningAttempt Attempt(string key, Action<PlanningAttempt> set)
        {
            var attempt = new PlanningAttempt
            {
                Id = Guid.NewGuid(), UserId = user.Id, ClientAttemptId = $"step9-{key}", RequestHash = hash,
                Status = PlanningAttemptStatuses.Succeeded, Intention = "Migration intention", GeneratorKey = "test",
                ContextBuilderVersion = "test", ContextFingerprint = hash, CreatedAt = now, UpdatedAt = now,
                CompletedAt = now
            };
            set(attempt);
            return attempt;
        }
        AiInvocation Invocation(Guid? attemptId, int sequence) => new()
        {
            Id = Guid.NewGuid(), UserId = user.Id, PlanningAttemptId = attemptId, Family = "PLANNING",
            ConfigurationKey = "planning.standard", ProviderKey = "test", Model = "test", PromptVersion = "test",
            SchemaVersion = "test", ContextBuilderVersion = "test", RepairPolicyVersion = "test",
            Sequence = sequence, StartedAt = now, CompletedAt = now, Outcome = AiInvocationOutcomes.Succeeded
        };
        const string questions = "{\"questions\":[{\"id\":\"q1\",\"text\":\"?\"}]}";
        var drafted = Attempt("draft", x =>
        {
            x.Outcome = PlanningOutcomes.Draft;
            x.DraftId = Guid.NewGuid();
        });
        var asking = Attempt("asking", x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = questions;
        });
        var answering = Attempt("answering", x =>
        {
            x.Status = PlanningAttemptStatuses.Failed;
            x.FailureCode = "PROVIDER_ERROR";
            x.PreviousAttemptId = asking.Id;
            x.ClarificationTurn = 1;
            x.AnswersJson = "[]";
        });
        db.AddRange(user, drafted, asking, new PlanningDraft
        {
            Id = drafted.DraftId!.Value, UserId = user.Id, AttemptId = drafted.Id, SchemaVersion = "test",
            ContextFingerprint = hash, CreatedAt = now, UpdatedAt = now, ExpiresAt = now.AddDays(1),
            Revisions = [new PlanningDraftRevision { Id = Guid.NewGuid(), Revision = 1, CreatedAt = now }]
        }, Invocation(drafted.Id, 1));
        await db.SaveChangesAsync(cancellationToken);
        db.Add(answering);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        // Only a draft outcome has a draft, and questions exist exactly when the outcome asks or blocks.
        db.Add(Attempt("no-draft", x => x.Outcome = PlanningOutcomes.Draft));
        Assert.Equal("CK_PlanningAttempts_Outcome", await ConstraintAsync());
        db.Add(Attempt("no-questions", x => x.Outcome = PlanningOutcomes.Clarification));
        Assert.Equal("CK_PlanningAttempts_Outcome", await ConstraintAsync());
        db.Add(Attempt("no-outcome", _ => { }));
        Assert.Equal("CK_PlanningAttempts_Outcome", await ConstraintAsync());
        db.Add(Attempt("unknown-outcome", x =>
        {
            x.Outcome = "PARTIAL";
            x.ClarificationJson = null;
        }));
        Assert.StartsWith("CK_PlanningAttempts_Outcome", await ConstraintAsync());
        // A clarification is answered once, within three turns, and a turn belongs to a previous attempt.
        db.Add(Attempt("second-answer", x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = questions;
            x.PreviousAttemptId = asking.Id;
            x.ClarificationTurn = 1;
        }));
        Assert.Equal("IX_PlanningAttempts_PreviousAttemptId", await ConstraintAsync());
        db.Add(Attempt("fourth-turn", x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = questions;
            x.PreviousAttemptId = answering.Id;
            x.ClarificationTurn = 4;
        }));
        Assert.Equal("CK_PlanningAttempts_ClarificationTurn", await ConstraintAsync());
        db.Add(Attempt("turn-without-previous", x =>
        {
            x.Outcome = PlanningOutcomes.Clarification;
            x.ClarificationJson = questions;
            x.ClarificationTurn = 1;
        }));
        Assert.Equal("CK_PlanningAttempts_ClarificationTurn", await ConstraintAsync());
        // An operation is at most two provider calls.
        db.Add(Invocation(null, 3));
        Assert.Equal("CK_AiInvocations_Sequence", await ConstraintAsync());

        await migrator.MigrateAsync("20261003142533_Step8PlanningFoundation", cancellationToken);
        // The earlier schema cannot hold a succeeded attempt without a draft; everything it can hold is kept.
        Assert.Equal(new[] { PlanningAttemptStatuses.Failed, PlanningAttemptStatuses.Succeeded },
            await db.Database.SqlQuery<string>(
                    $"SELECT \"Status\" AS \"Value\" FROM \"PlanningAttempts\" WHERE \"UserId\" = {user.Id} ORDER BY \"Status\"")
                .ToListAsync(cancellationToken));
        await migrator.MigrateAsync(cancellationToken: cancellationToken);
        db.ChangeTracker.Clear();
        var kept = await db.PlanningAttempts.AsNoTracking().SingleAsync(x => x.Id == drafted.Id, cancellationToken);
        Assert.Equal(PlanningOutcomes.Draft, kept.Outcome);
        Assert.Equal(0, kept.ClarificationTurn);
        var failed = await db.PlanningAttempts.AsNoTracking().SingleAsync(x => x.Id == answering.Id, cancellationToken);
        Assert.Null(failed.Outcome);
        Assert.Null(failed.PreviousAttemptId);
        Assert.Equal(0, await db.AiInvocations.CountAsync(x => x.UserId == user.Id, cancellationToken));

        await db.PlanningDrafts.Where(x => x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await db.PlanningAttempts.Where(x => x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await db.Users.Where(x => x.Id == user.Id).ExecuteDeleteAsync(cancellationToken);

        async Task<string?> ConstraintAsync()
        {
            var failure = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(cancellationToken));
            db.ChangeTracker.Clear();
            return ((Npgsql.PostgresException)failure.InnerException!).ConstraintName;
        }
    }
}
