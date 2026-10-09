using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.DTOs.Auth;
using TidySense.DTOs.Operations;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Ai;
using TidySense.Services.Operations;

namespace TidySense.Backend.Tests;

/// <summary>Who may read operational evidence, what it may contain, and when an alert is raised.</summary>
public sealed class OperationsApiTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private const string OperatorPhone = "+989120008801";
    private static readonly string[] Paths =
        ["/api/v1/operations/metrics", "/api/v1/operations/ai?days=7", "/api/v1/operations/health"];

    [Fact]
    public async Task Only_an_operator_reads_operational_evidence_and_it_identifies_nobody()
    {
        using var host = Host(new() { ["Operations:OperatorPhones:0"] = OperatorPhone });
        var operatorAccount = await CreateAccountAsync(host, OperatorPhone);
        var member = await CreateAccountAsync(host, "+989" + Random.Shared.Next(100000000, 1000000000));
        using var operatorClient = Client(host, operatorAccount.Token);
        using var memberClient = Client(host, member.Token);
        using var anonymous = Client(host, null);

        // Activity of an ordinary account, so the aggregates are not empty.
        const string title = "عنوان خصوصی عملیات";
        using (var create = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tasks"))
        {
            create.Content = JsonContent.Create(new
            {
                title, description = (string?)null, goalId = (Guid?)null, projectId = (Guid?)null,
                plannedDate = DateOnly.FromDateTime(factory.Clock.GetUtcNow().UtcDateTime).AddDays(1),
                deadline = (string?)null, sequenceId = (Guid?)null, sequenceOrder = (int?)null, isProtected = false
            });
            create.Headers.Add("Origin", "http://localhost");
            create.Headers.Add("Idempotency-Key", "operations-task");
            (await memberClient.SendAsync(create)).EnsureSuccessStatusCode();
        }
        using (var open = new HttpRequestMessage(HttpMethod.Post, "/api/v1/reconcile/sessions"))
        {
            open.Content = JsonContent.Create(new { triggerType = "MANUAL" });
            open.Headers.Add("Origin", "http://localhost");
            open.Headers.Add("Idempotency-Key", "operations-open");
            (await memberClient.SendAsync(open)).EnsureSuccessStatusCode();
        }

        Assert.True((await operatorClient.GetFromJsonAsync<CurrentUserDto>("/api/v1/users/me"))!.IsOperator);
        Assert.False((await memberClient.GetFromJsonAsync<CurrentUserDto>("/api/v1/users/me"))!.IsOperator);
        foreach (var path in Paths)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(path)).StatusCode);
            // The same answer as for a resource that does not exist.
            Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync(path)).StatusCode);
            var response = await operatorClient.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain(member.UserId.ToString(), body);
            Assert.DoesNotContain(member.Phone, body);
            Assert.DoesNotContain("خصوصی", body);
            Assert.DoesNotContain("manifest", body, StringComparison.OrdinalIgnoreCase);
        }

        var metrics = (await operatorClient.GetFromJsonAsync<OperationsMetricsDto>("/api/v1/operations/metrics?days=1"))!;
        var opened = metrics.Primary.Single(x => x.Id == "H2.SESSIONS_OPENED").Rows;
        Assert.Equal(1, opened.Sum(x => x.Numerator));
        // The real open command wrote a result the availability metric reads.
        Assert.Equal(new MetricRowDto("", 1, 1),
            metrics.Primary.Single(x => x.Id == "H2.DETERMINISTIC_AVAILABILITY").Rows.Single());
        Assert.All(metrics.Internal, x => Assert.All(x.Rows, row => Assert.Equal(0, row.Numerator)));

        var ai = (await operatorClient.GetFromJsonAsync<OperationsAiDto>("/api/v1/operations/ai"))!;
        Assert.Equal(new[] { "PLANNING", "RECONCILE" }, ai.Families.Select(x => x.Family));
        Assert.All(ai.Families, x => Assert.True(x.Sample));

        // Nothing has run maintenance in this host yet: that absence is itself reported.
        var health = (await operatorClient.GetFromJsonAsync<OperationsHealthDto>("/api/v1/operations/health"))!;
        Assert.Contains(health.Alerts, x => x.Rule == OperationsAlertRules.MaintenanceMissing);
        Assert.DoesNotContain(health.Alerts, x => x.Rule == OperationsAlertRules.KillSwitchActive);
    }

    [Fact]
    public async Task A_kill_switch_is_shown_to_the_operator_as_an_alert()
    {
        var phone = "+989120008802";
        using var host = Host(new()
        {
            ["Operations:OperatorPhones:0"] = phone, ["Ai:GlobalKillSwitch"] = "true",
            ["Ai:Reconcile:KillSwitch"] = "true"
        });
        using var client = Client(host, (await CreateAccountAsync(host, phone)).Token);
        var health = (await client.GetFromJsonAsync<OperationsHealthDto>("/api/v1/operations/health"))!;
        Assert.Equal(new[] { "GLOBAL", "RECONCILE" },
            health.Alerts.Where(x => x.Rule == OperationsAlertRules.KillSwitchActive).Select(x => x.Scope).Order());
        var ai = (await client.GetFromJsonAsync<OperationsAiDto>("/api/v1/operations/ai"))!;
        Assert.True(ai.GlobalKillSwitch);
        Assert.True(ai.Families.Single(x => x.Family == "RECONCILE").KillSwitch);
        Assert.False(ai.Families.Single(x => x.Family == "PLANNING").KillSwitch);
    }

    [Fact]
    public void Alert_rules_fire_at_their_thresholds_and_stay_quiet_below_them()
    {
        var now = new DateTimeOffset(2026, 10, 8, 12, 0, 0, TimeSpan.Zero);
        var thresholds = new AlertOptions();
        AlertFamilyInput Family(long spent = 0, int calls = 0, int rejected = 0, int failed = 0, bool circuit = false,
            bool latched = false) => new("PLANNING", false, false, circuit, latched, spent, 2_000_000, calls, rejected, failed);
        string[] Rules(AlertInput input) => OperationsAlertRules.Evaluate(input, thresholds).Select(x => x.Rule).ToArray();
        AlertInput Input(AlertFamilyInput family, int stuck = 0, DateTimeOffset? lastRun = null, string? outcome = "SUCCEEDED") =>
            new(now, false, [family], stuck, 0, lastRun ?? now.AddHours(-1), outcome);

        Assert.Empty(Rules(Input(Family(spent: 1_599_999, calls: 9, rejected: 9, failed: 9))));
        Assert.Equal([OperationsAlertRules.BudgetNearLimit], Rules(Input(Family(spent: 1_600_000))));
        Assert.Equal([OperationsAlertRules.BudgetExhausted], Rules(Input(Family(spent: 2_000_000))));
        // A rate needs a minimum sample; at the sample it fires at the threshold and not one call below.
        Assert.Empty(Rules(Input(Family(calls: 10, rejected: 2, failed: 2))));
        Assert.Equal([OperationsAlertRules.RejectionRate], Rules(Input(Family(calls: 10, rejected: 3))));
        Assert.Equal([OperationsAlertRules.FailureRate], Rules(Input(Family(calls: 10, failed: 3))));
        Assert.Equal([OperationsAlertRules.SpendCapLatched, OperationsAlertRules.CircuitOpen],
            Rules(Input(Family(circuit: true, latched: true))));
        Assert.Equal([OperationsAlertRules.WorkStuck], Rules(Input(Family(), stuck: 1)));
        Assert.Equal([OperationsAlertRules.MaintenanceFailed], Rules(Input(Family(), outcome: "FAILED")));
        Assert.Empty(Rules(Input(Family(), lastRun: now.AddHours(-48))));
        Assert.Equal([OperationsAlertRules.MaintenanceMissing], Rules(Input(Family(), lastRun: now.AddHours(-49))));
        Assert.Equal([OperationsAlertRules.MaintenanceMissing],
            Rules(new AlertInput(now, false, [Family()], 0, 0, null, null)));

        var critical = OperationsAlertRules.Evaluate(Input(Family(spent: 2_000_000, latched: true)), thresholds);
        Assert.All(critical, x => Assert.Equal(OperationsAlertSeverities.Critical, x.Severity));
    }

    [Fact]
    public async Task Changing_a_kill_switch_writes_one_audit_line_with_its_scope_and_new_value()
    {
        var monitor = new ChangingOptions(new AiOptions());
        var logger = new ListLogger<AiSwitchAudit>();
        var audit = new AiSwitchAudit(monitor, TimeProvider.System, logger);
        await audit.StartAsync(CancellationToken.None);
        Assert.Empty(logger.Lines);

        monitor.Set(new AiOptions { GlobalKillSwitch = true });
        var line = Assert.Single(logger.Lines);
        Assert.Equal(LogLevel.Warning, line.Level);
        Assert.StartsWith("AI_KILL_SWITCH_CHANGED. Scope: GLOBAL, Active: True, Actor: CONFIGURATION", line.Text);

        // The same configuration read again is not a change; switching a family off and back on is two.
        monitor.Set(new AiOptions { GlobalKillSwitch = true });
        Assert.Single(logger.Lines);
        var reconcileOff = new AiOptions { GlobalKillSwitch = true };
        reconcileOff.Reconcile.KillSwitch = true;
        monitor.Set(reconcileOff);
        monitor.Set(new AiOptions());
        Assert.Equal(new[]
        {
            "Scope: GLOBAL, Active: True", "Scope: RECONCILE, Active: True", "Scope: GLOBAL, Active: False",
            "Scope: RECONCILE, Active: False"
        }, logger.Lines.Select(x => x.Text.Split(". ")[1].Split(", Actor")[0]).ToArray());
        await audit.StopAsync(CancellationToken.None);

        // A switch that is already on when the process starts is stated at start.
        var startedOn = new ListLogger<AiSwitchAudit>();
        await new AiSwitchAudit(new ChangingOptions(new AiOptions { GlobalKillSwitch = true }), TimeProvider.System,
            startedOn).StartAsync(CancellationToken.None);
        Assert.StartsWith("AI_KILL_SWITCH_ACTIVE. Scope: GLOBAL", Assert.Single(startedOn.Lines).Text);
    }

    private WebApplicationFactory<Program> Host(Dictionary<string, string?> configuration) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, source) =>
            source.AddInMemoryCollection(configuration)));

    private static HttpClient Client(WebApplicationFactory<Program> host, string? token)
    {
        var client = host.CreateClient(new WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        if (token is not null) client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private static async Task<Account> CreateAccountAsync(WebApplicationFactory<Program> host, string phone)
    {
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = phone, IsActive = true, SetupComplete = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Account(user.Id, phone, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private sealed record Account(Guid UserId, string Phone, string Token);

    private sealed class ChangingOptions(AiOptions initial) : IOptionsMonitor<AiOptions>
    {
        private readonly List<Action<AiOptions, string?>> _listeners = [];

        public AiOptions CurrentValue { get; private set; } = initial;

        public AiOptions Get(string? name) => CurrentValue;

        public IDisposable? OnChange(Action<AiOptions, string?> listener)
        {
            _listeners.Add(listener);
            return null;
        }

        public void Set(AiOptions value)
        {
            CurrentValue = value;
            foreach (var listener in _listeners) listener(value, null);
        }
    }

    private sealed class ListLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Text)> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Lines.Add((logLevel, formatter(state, exception)));
    }
}
