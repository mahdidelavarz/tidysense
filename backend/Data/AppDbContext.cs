using Microsoft.EntityFrameworkCore;
using TidySense.Common;
using TidySense.Models;

namespace TidySense.Data;

public class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // --------------------------------------------------
    // Project
    // --------------------------------------------------

    public DbSet<Project> Projects => Set<Project>();

    // --------------------------------------------------
    // IAM
    // --------------------------------------------------

    public DbSet<User> Users => Set<User>();

    public DbSet<Group> Groups => Set<Group>();

    public DbSet<Permission> Permissions => Set<Permission>();

    public DbSet<UserGroup> UserGroups => Set<UserGroup>();

    public DbSet<GroupPermission> GroupPermissions => Set<GroupPermission>();

    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();

    public DbSet<Session> Sessions => Set<Session>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureProject(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureGroup(modelBuilder);
        ConfigurePermission(modelBuilder);
        ConfigureUserGroup(modelBuilder);
        ConfigureGroupPermission(modelBuilder);
        ConfigureOtpChallenge(modelBuilder);
        ConfigureSession(modelBuilder);
    }

    private static void ConfigureProject(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasQueryFilter(x => !x.IsDeleted);
        });
    }

    private static void ConfigureUser(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.PhoneNumber)
                .IsRequired()
                .HasMaxLength(32);

            entity.Property(x => x.DisplayName)
                .HasMaxLength(200);

            entity.HasIndex(x => x.PhoneNumber)
                .IsUnique();

            entity.HasQueryFilter(x => !x.IsDeleted);
        });
    }

    private static void ConfigureGroup(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.HasIndex(x => x.Name)
                .IsUnique();

            entity.HasQueryFilter(x => !x.IsDeleted);
        });
    }

    private static void ConfigurePermission(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Resource)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Action)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.HasIndex(x => new
            {
                x.Resource,
                x.Action
            })
            .IsUnique();

            entity.HasQueryFilter(x => !x.IsDeleted);
        });
    }

    private static void ConfigureUserGroup(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserGroup>(entity =>
        {
            entity.HasKey(x => new
            {
                x.UserId,
                x.GroupId
            });

            entity.HasOne(x => x.User)
                .WithMany(x => x.UserGroups)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Group)
                .WithMany(x => x.UserGroups)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureGroupPermission(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GroupPermission>(entity =>
        {
            entity.HasKey(x => new
            {
                x.GroupId,
                x.PermissionId
            });

            entity.HasOne(x => x.Group)
                .WithMany(x => x.GroupPermissions)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Permission)
                .WithMany(x => x.GroupPermissions)
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureOtpChallenge(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OtpChallenge>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.CodeHash)
                .IsRequired()
                .HasMaxLength(128);

            entity.HasOne(x => x.User)
                .WithMany(x => x.OtpChallenges)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new
            {
                x.UserId,
                x.ExpiresAt
            });
        });
    }

    private static void ConfigureSession(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TokenHash)
                .IsRequired()
                .HasMaxLength(64);

            entity.Property(x => x.IpAddress)
                .HasMaxLength(45);

            entity.Property(x => x.UserAgent)
                .HasMaxLength(1000);

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.HasIndex(x => new
            {
                x.UserId,
                x.ExpiresAt
            });

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    // --------------------------------------------------
    // SaveChanges
    // --------------------------------------------------

    public override int SaveChanges()
    {
        ApplyAuditFields();

        return base.SaveChanges();
    }

    public override int SaveChanges(
        bool acceptAllChangesOnSuccess)
    {
        ApplyAuditFields();

        return base.SaveChanges(
            acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();

        return base.SaveChangesAsync(
            cancellationToken);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();

        return base.SaveChangesAsync(
            acceptAllChangesOnSuccess,
            cancellationToken);
    }

    // --------------------------------------------------
    // Audit
    // --------------------------------------------------

    private void ApplyAuditFields()
    {
        var now = DateTime.UtcNow;
        var userId = GetCurrentUserId();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                SetIfExists(
                    entry,
                    "CreatedAt",
                    now);

                SetIfExists(
                    entry,
                    "CreatedBy",
                    userId);
            }

            if (entry.State == EntityState.Modified)
            {
                SetIfExists(
                    entry,
                    "UpdatedAt",
                    now);

                SetIfExists(
                    entry,
                    "UpdatedBy",
                    userId);
            }
        }
    }

    private int? GetCurrentUserId()
    {
        var value =
            _httpContextAccessor.HttpContext?
                .User
                .FindFirst(AuthConstants.UserIdClaim)?
                .Value;

        return int.TryParse(
            value,
            out var userId)
                ? userId
                : null;
    }

    private static void SetIfExists(
        Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry,
        string propertyName,
        object? value)
    {
        if (entry.Metadata.FindProperty(propertyName) is not null)
        {
            entry.Property(propertyName).CurrentValue = value;
        }
    }
}