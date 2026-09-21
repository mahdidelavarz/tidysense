using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.DTOs.Projects;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class ProjectReadSliceTests : IClassFixture<PostgresWebApplicationFactory>
{
    private readonly PostgresWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProjectReadSliceTests(PostgresWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task Readiness_check_executes_against_real_postgresql()
    {
        var cancellationToken = TestContext.Current.CancellationToken;

        var response = await _client.GetAsync("/health/ready", cancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(cancellationToken));
    }

    [Fact]
    public async Task Unauthenticated_request_returns_canonical_problem_details()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var response = await _client.GetAsync($"/api/v1/projects/{Guid.NewGuid()}", cancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(cancellationToken);
        Assert.Equal("AUTHENTICATION_REQUIRED", problem!["code"].ToString());
        Assert.True(problem.ContainsKey("traceId"));
    }

    [Fact]
    public async Task Owner_can_read_project_with_guid_identity()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var seeded = await SeedAsync();
        Authenticate(seeded.OwnerToken);

        var response = await _client.GetAsync($"/api/v1/projects/{seeded.ProjectId}", cancellationToken);
        response.EnsureSuccessStatusCode();
        var project = await response.Content.ReadFromJsonAsync<ProjectDto>(cancellationToken);
        Assert.Equal(seeded.ProjectId, project!.Id);
        Assert.NotEqual(Guid.Empty, project.Id);
        Assert.Equal("پروژه آزمایشی", project.Title);
    }

    [Fact]
    public async Task Other_user_receives_ownership_safe_not_found()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var seeded = await SeedAsync();
        Authenticate(seeded.OtherToken);

        var response = await _client.GetAsync($"/api/v1/projects/{seeded.ProjectId}", cancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(cancellationToken);
        Assert.Equal("RESOURCE_NOT_FOUND", problem!["code"].ToString());
        Assert.DoesNotContain(seeded.OwnerId.ToString(), await response.Content.ReadAsStringAsync(cancellationToken));
    }

    [Fact]
    public async Task Session_epoch_change_invalidates_existing_jwt()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var seeded = await SeedAsync();
        Authenticate(seeded.OwnerToken);
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var owner = await db.Users.SingleAsync(x => x.Id == seeded.OwnerId, cancellationToken);
            owner.SessionEpoch++;
            await db.SaveChangesAsync(cancellationToken);
        }

        var response = await _client.GetAsync($"/api/v1/projects/{seeded.ProjectId}", cancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Normalized_phone_number_is_unique_in_real_postgresql()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Projects.ExecuteDeleteAsync(cancellationToken);
        await db.Users.ExecuteDeleteAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        db.Users.AddRange(
            new User { Id = Guid.NewGuid(), PhoneNumber = "+989120000003", IsActive = true, CreatedAt = now },
            new User { Id = Guid.NewGuid(), PhoneNumber = "+989120000003", IsActive = true, CreatedAt = now });

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(cancellationToken));
    }

    [Fact]
    public async Task Canonical_instant_and_local_date_round_trip_through_postgresql()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Projects.ExecuteDeleteAsync(cancellationToken);
        await db.Users.ExecuteDeleteAsync(cancellationToken);

        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var instant = new DateTimeOffset(2026, 9, 20, 6, 30, 0, TimeSpan.Zero);
        var localDate = new DateOnly(2026, 10, 1);
        db.Users.Add(new User
        {
            Id = userId,
            PhoneNumber = "+989120000004",
            IsActive = true,
            CreatedAt = instant
        });
        db.Projects.Add(new Project
        {
            Id = projectId,
            UserId = userId,
            Title = "پروژه زمان",
            TargetDate = localDate,
            ReviewDate = localDate.AddDays(7),
            CreatedAt = instant,
            UpdatedAt = instant
        });
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        var persisted = await db.Projects.AsNoTracking().SingleAsync(x => x.Id == projectId, cancellationToken);
        Assert.Equal(localDate, persisted.TargetDate);
        Assert.Equal(instant, persisted.CreatedAt);
        Assert.Equal(TimeSpan.Zero, persisted.CreatedAt.Offset);
    }

    private void Authenticate(string token)
    {
        _client.DefaultRequestHeaders.Remove("Cookie");
        _client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
    }

    private async Task<SeededData> SeedAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Projects.ExecuteDeleteAsync(cancellationToken);
        await db.Users.ExecuteDeleteAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var owner = new User { Id = Guid.NewGuid(), PhoneNumber = "+989120000001", IsActive = true, CreatedAt = now };
        var other = new User { Id = Guid.NewGuid(), PhoneNumber = "+989120000002", IsActive = true, CreatedAt = now };
        var project = new Project
        {
            Id = Guid.NewGuid(), UserId = owner.Id, Title = "پروژه آزمایشی",
            ReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            CreatedAt = now, UpdatedAt = now
        };
        db.AddRange(owner, other, project);
        await db.SaveChangesAsync(cancellationToken);

        var tokens = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
        return new SeededData(owner.Id, project.Id, tokens.Create(owner), tokens.Create(other));
    }

    private sealed record SeededData(Guid OwnerId, Guid ProjectId, string OwnerToken, string OtherToken);
}
