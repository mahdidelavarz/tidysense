using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Npgsql;
using TidySense.Data;
using TidySense.Common.Events;
using TidySense.Services;

namespace TidySense.Backend.Tests;

public sealed class PostgresWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _databaseName = $"tidysense_tests_{Guid.NewGuid():N}";
    private HttpClient? _client;

    /// <summary>The application clock. Real time unless a test pins it to an instant.</summary>
    public TestClock Clock { get; } = new();

    /// <summary>The planning generator every test of this factory shares.</summary>
    public PlanningGate PlanningGate { get; } = new();

    public string ConnectionString
    {
        get
        {
            var configured = Environment.GetEnvironmentVariable("TIDYSENSE_TEST_POSTGRES");
            if (string.IsNullOrWhiteSpace(configured))
                throw new InvalidOperationException(
                    "TIDYSENSE_TEST_POSTGRES must contain a PostgreSQL connection string with database-creation permission.");

            return new NpgsqlConnectionStringBuilder(configured)
            {
                Database = _databaseName,
                IncludeErrorDetail = false
            }.ConnectionString;
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
        });
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                ["Jwt:Issuer"] = "TidySense.Tests",
                ["Jwt:Audience"] = "TidySense.Tests.Client",
                ["Jwt:SigningKey"] = "tests-only-signing-key-that-is-at-least-32-characters",
                ["Jwt:CookieName"] = "TidySense.Auth",
                ["Otp:HashingKey"] = "tests-only-otp-key-that-is-at-least-32-characters",
                ["ApplicationTime:TimeZoneId"] = "Asia/Tehran"
            }));
        builder.ConfigureServices(services =>
        {
            services.AddSingleton(new EventPayloadSchema("PROJECT_TITLE_CHANGED", 1,
                new EventPayloadFieldPolicy("changedFields", true, value =>
                    value.ValueKind == System.Text.Json.JsonValueKind.Array &&
                    value.GetArrayLength() > 0 && value.EnumerateArray().All(item =>
                        item.ValueKind == System.Text.Json.JsonValueKind.String &&
                        item.GetString() is "title"))));
            services.AddControllers().AddApplicationPart(typeof(DeliveryContractTestController).Assembly);
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<IPlanningGenerator>();
            services.AddSingleton<IPlanningGenerator>(PlanningGate);
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(ConnectionString));
        });
    }

    public async ValueTask InitializeAsync()
    {
        _client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public new async ValueTask DisposeAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        _client?.Dispose();
        await base.DisposeAsync();
    }
}

public sealed class TestClock : TimeProvider
{
    private DateTimeOffset? _pinned;

    public override DateTimeOffset GetUtcNow() => _pinned ?? DateTimeOffset.UtcNow;

    /// <summary>
    /// Pins the clock. Use instants at or after the real time: command idempotency expiry is
    /// checked against the real clock.
    /// </summary>
    public void Pin(DateTimeOffset instant) => _pinned = instant.ToUniversalTime();
}

/// <summary>
/// The deterministic mock, with one addition for tests: the "held" fixture waits until the test
/// releases it, so cancellation and late results can be exercised without timing guesses.
/// </summary>
public sealed class PlanningGate : IPlanningGenerator
{
    public const string HeldFixture = "held";
    private readonly DeterministicPlanningGenerator _inner = new();
    private TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _calls;

    public string Key => _inner.Key;

    /// <summary>How many generations were started, across every attempt of this factory.</summary>
    public int Calls => _calls;

    public void Hold() => _release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

    public void Release() => _release.TrySetResult();

    public async Task<PlanningGenerationResult> GenerateAsync(PlanningGenerationRequest request,
        CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _calls);
        if (request.Fixture != HeldFixture) return await _inner.GenerateAsync(request, cancellationToken);
        await _release.Task.WaitAsync(cancellationToken);
        return await _inner.GenerateAsync(request with { Fixture = null }, cancellationToken);
    }
}
