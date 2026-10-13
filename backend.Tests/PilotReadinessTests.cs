using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.DTOs.Auth;
using TidySense.DTOs.Operations;
using TidySense.DTOs.Pilot;
using TidySense.DTOs.Planning;
using TidySense.DTOs.Reconcile;
using TidySense.Infrastructure.Ai;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Ai;
using TidySense.Services.Operations;

namespace TidySense.Backend.Tests;

/// <summary>
/// What a pilot participant is asked and told: no consent step before planning text reaches a model,
/// a privacy notice that never names the provider, the in-app pilot questions, and the daily alert digest.
/// </summary>
public sealed class PilotReadinessTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private const string Intention = "می‌خواهم ورزش منظم را شروع کنم";
    private static readonly string Hash = new('F', 64);

    [Fact]
    public async Task Planning_text_reaches_the_model_without_a_consent_step_and_users_are_never_told_the_provider()
    {
        var session = await CreateSessionAsync();
        var provider = new AiPlanningRuntimeTests.ScriptedProvider();
        using var host = ModelBackedHost(provider);
        using var client = Client(session.Token, host);

        // Nothing about consent is left on the account, and nothing user-facing names the provider or model.
        var me = await client.GetStringAsync("/api/v1/users/me");
        Assert.DoesNotContain("consent", me, StringComparison.OrdinalIgnoreCase);
        var noticeJson = await client.GetStringAsync("/api/v1/pilot/notice");
        Assert.DoesNotContain("scripted", noticeJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("test-model", noticeJson, StringComparison.OrdinalIgnoreCase);
        var notice = JsonSerializer.Deserialize<PilotNoticeDto>(noticeJson, JsonSerializerOptions.Web)!;
        Assert.True(notice.AiReceivesPlanningText);
        Assert.Equal(PrivacyNotice.Version, notice.NoticeVersion);

        // A fresh account plans with the model at once; there is no step to agree first.
        provider.Reply(Completion(PlanningOutputGateTests.Valid().ToJsonString()));
        var accepted = await StartAsync(client, "no-consent");
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        var ended = await WaitAsync(client, (await ReadAsync<PlanningAttemptDto>(accepted)).Id);
        Assert.Equal("SUCCEEDED", ended.Status);
        Assert.Single(provider.Calls);
        var attemptJson = await client.GetStringAsync($"/api/v1/planning/attempts/{ended.Id}");
        Assert.DoesNotContain("scripted", attemptJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("test-model", attemptJson, StringComparison.OrdinalIgnoreCase);

        // The consent action is gone, and no decision is recorded any more.
        var retired = await SendAsync(client, HttpMethod.Put, "/api/v1/users/me/ai-consent",
            new { granted = true, noticeVersion = PrivacyNotice.Version }, "consent-retired");
        Assert.Contains(retired.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.MethodNotAllowed });
        await using var scope = host.Services.CreateAsyncScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().DomainEvents
            .AnyAsync(x => x.UserId == session.UserId && x.EventType == AccountEventTypes.AiConsentChanged,
                TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_consent_decision_recorded_before_the_step_was_retired_stays_history_and_is_erased_with_the_account()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var session = await CreateSessionAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Clock.GetUtcNow();
        // Recorded the way the Step 11 consent action recorded it.
        var payload = JsonSerializer.Serialize(new { granted = true, provider = "deepseek", noticeVersion = "2026-10-09.1" });
        var result = await scope.ServiceProvider.GetRequiredService<CommandExecutionService>().ExecuteAsync(
            new CommandExecutionRequest(session.UserId, "consent-history", "SET_AI_CONSENT",
                CommandExecutionRequest.HashCanonicalRequest(System.Text.Encoding.UTF8.GetBytes(payload)),
                now.AddHours(24), Guid.NewGuid().ToString("N")),
            (_, owner, _) => Task.FromResult(new CommandMutation("User", owner, 1, AccountEventTypes.AiConsentChanged, 1,
                payload, now)), cancellationToken);
        Assert.Equal("SUCCEEDED", result.Status);
        var decision = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.UserId == session.UserId && x.EventType == AccountEventTypes.AiConsentChanged, cancellationToken);
        Assert.Equal("R1", decision.RetentionClass);

        // Erasure leaves the decision as a fact without the account: not as user, not as aggregate.
        var erased = await scope.ServiceProvider.GetRequiredService<UserErasureService>()
            .EraseAsync(session.UserId, "test", "TEST_CLEANUP", cancellationToken);
        Assert.False(await db.DomainEvents.AnyAsync(x =>
            x.UserId == session.UserId || x.AggregateId == session.UserId, cancellationToken));
        Assert.Equal(1, await db.DomainEvents.CountAsync(x => x.UserId == erased!.TombstoneUserId &&
            x.AggregateId == erased.TombstoneUserId && x.EventType == AccountEventTypes.AiConsentChanged, cancellationToken));
    }

    [Fact]
    public async Task Without_a_model_backed_generator_the_notice_says_no_text_reaches_a_model()
    {
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Pilot:SupportContact"] = " support@example.test ",
                ["Operations:Retention:R2DaysAfterClose"] = "120"
            })));
        var session = await CreateSessionAsync();
        using var client = Client(session.Token, host);
        Assert.Equal(HttpStatusCode.Accepted, (await StartAsync(client, "sample-generator")).StatusCode);

        // The notice is readable before signing in and repeats what the system is configured to do.
        using var anonymous = host.CreateClient(new WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        var notice = (await anonymous.GetFromJsonAsync<PilotNoticeDto>("/api/v1/pilot/notice"))!;
        Assert.Equal(new PilotNoticeDto(PrivacyNotice.Version, false, 120, 30, 90, 30, "support@example.test",
            PilotInstruments.Version), notice);
    }

    [Fact]
    public async Task A_pilot_question_is_answered_once_about_finished_work_of_the_same_account()
    {
        const string operatorPhone = "+989120009901";
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Operations:OperatorPhones:0"] = operatorPhone
            })));
        // The clock stands still while pinned, so it is moved past the records before the window is read.
        var start = DateTimeOffset.UtcNow.AddDays(60);
        factory.Clock.Pin(start);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        var operatorAccount = await CreateSessionAsync(operatorPhone);
        using var client = Client(owner.Token, host);
        using var otherClient = Client(other.Token, host);
        using var operatorClient = Client(operatorAccount.Token, host);

        var started = await ReadAsync<PlanningAttemptDto>(await StartAsync(client, "feedback-plan"));
        var draftId = (await WaitAsync(client, started.Id)).DraftId!.Value;
        Task<HttpResponseMessage> AnswerAsync(HttpClient who, object body) =>
            SendAsync(who, HttpMethod.Post, "/api/v1/pilot/feedback", body);
        object Body(string instrument, Guid subject, int answer, int version = PilotInstruments.Version) =>
            new { instrument, instrumentVersion = version, subjectId = subject, answer };

        // A draft that was not applied is not finished work.
        Assert.Equal(HttpStatusCode.NotFound,
            (await AnswerAsync(client, Body(PilotInstruments.PlanUsefulness, draftId, 4))).StatusCode);
        var draft = (await client.GetFromJsonAsync<PlanningDraftDto>($"/api/v1/planning/drafts/{draftId}"))!;
        var confirmation = await ReadAsync<PlanningConfirmationDto>(await SendAsync(client, HttpMethod.Post,
            $"/api/v1/planning/drafts/{draftId}/previews", new { expectedRevision = draft.Revision }));
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { },
            "feedback-apply")).EnsureSuccessStatusCode();

        // Another account, another wording, an answer off the scale and an unknown question are refused.
        Assert.Equal(HttpStatusCode.NotFound,
            (await AnswerAsync(otherClient, Body(PilotInstruments.PlanUsefulness, draftId, 4))).StatusCode);
        var changed = await AnswerAsync(client, Body(PilotInstruments.PlanUsefulness, draftId, 4, PilotInstruments.Version + 1));
        Assert.Equal("FEEDBACK_INSTRUMENT_CHANGED", await ProblemCodeAsync(changed));
        Assert.Equal(HttpStatusCode.BadRequest,
            (await AnswerAsync(client, Body(PilotInstruments.PlanUsefulness, draftId, 6))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await AnswerAsync(client, Body("H9_OTHER", draftId, 3))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await AnswerAsync(client, Body(PilotInstruments.PlanUsefulness, draftId, 4))).StatusCode);
        // A second answer about the same plan changes nothing.
        Assert.Equal(HttpStatusCode.NoContent,
            (await AnswerAsync(client, Body(PilotInstruments.PlanUsefulness, draftId, 1))).StatusCode);

        var reconcile = await ReadAsync<ReconcileSessionDto>(await SendAsync(client, HttpMethod.Post,
            "/api/v1/reconcile/sessions", new { triggerType = "MANUAL" }, "feedback-open"));
        Assert.Equal(HttpStatusCode.NotFound,
            (await AnswerAsync(client, Body(PilotInstruments.ReconcileUnderstanding, reconcile.Id, 5))).StatusCode);
        (await SendAsync(client, HttpMethod.Post, $"/api/v1/reconcile/sessions/{reconcile.Id}/complete",
            new { expectedVersion = reconcile.Version }, "feedback-complete")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent,
            (await AnswerAsync(client, Body(PilotInstruments.ReconcileUnderstanding, reconcile.Id, 5))).StatusCode);

        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.PilotFeedbackResponses.AsNoTracking().Where(x => x.UserId == owner.UserId)
            .OrderBy(x => x.Instrument).ToArrayAsync();
        Assert.Equal(new[] { (PilotInstruments.PlanUsefulness, draftId, 4), (PilotInstruments.ReconcileUnderstanding, reconcile.Id, 5) },
            stored.Select(x => (x.Instrument, x.SubjectId, x.Answer)));
        Assert.All(stored, x => Assert.Equal("R2", x.RetentionClass));

        // The operator sees the answers as counts next to the plans and sessions they are about.
        factory.Clock.Pin(start.AddMinutes(1));
        var metrics = (await operatorClient.GetFromJsonAsync<OperationsMetricsDto>("/api/v1/operations/metrics?days=1"))!;
        Assert.Contains(new MetricRowDto("4", 1, 1), metrics.Primary.Single(x => x.Id == "H1.USEFULNESS_RESPONSE").Rows);
        Assert.Contains(new MetricRowDto($"{reconcile.OpenedSeverity}:DETERMINISTIC:5", 1, 1),
            metrics.Primary.Single(x => x.Id == "H2.UNDERSTANDING_RESPONSE").Rows);

        // Erasure removes them with the account.
        await scope.ServiceProvider.GetRequiredService<UserErasureService>()
            .EraseAsync(owner.UserId, "test", "TEST_CLEANUP", TestContext.Current.CancellationToken);
        Assert.False(await db.PilotFeedbackResponses.AnyAsync(x => x.UserId == owner.UserId));
    }

    [Fact]
    public void The_digest_reports_what_runs_raised_what_is_active_now_and_says_so_when_there_is_nothing()
    {
        var now = new DateTimeOffset(2026, 10, 9, 4, 0, 0, TimeSpan.Zero);
        OperationsAlertDto Alert(string rule, string severity, string scope, long value = 1, long threshold = 0) =>
            new(rule, severity, scope, value, threshold);

        var quiet = OperationsAlertDigest.Build(now, [new(now.AddHours(-1), "SUCCEEDED", [])], []);
        Assert.Equal("[TidySense] no alerts in the last 24 h", quiet.Subject);
        Assert.Equal(0, quiet.AlertCount);
        Assert.Contains("No alert was raised and none is active.", quiet.Body);

        var budget = Alert(OperationsAlertRules.BudgetExhausted, OperationsAlertSeverities.Critical, "PLANNING", 2_000_000, 2_000_000);
        var circuit = Alert(OperationsAlertRules.CircuitOpen, OperationsAlertSeverities.Warning, "RECONCILE");
        var switched = Alert(OperationsAlertRules.KillSwitchActive, OperationsAlertSeverities.Warning, "GLOBAL");
        var busy = OperationsAlertDigest.Build(now,
        [
            new(now.AddHours(-3), "SUCCEEDED", [budget, circuit]),
            new(now.AddHours(-2), "FAILED", []),
            new(now.AddHours(-1), "SUCCEEDED", [budget])
        ], [budget, switched]);
        Assert.Equal("[TidySense] 3 alert(s) in the last 24 h, 2 critical", busy.Subject);
        Assert.Equal(3, busy.AlertCount);
        Assert.Contains("Maintenance runs: 3 (failed: 1).", busy.Body);
        Assert.Contains("CRITICAL AI_BUDGET_EXHAUSTED [PLANNING]: raised in 2 of 3 runs, last 03:00 UTC, value 2000000, threshold 2000000, ACTIVE NOW", busy.Body);
        Assert.Contains("WARNING AI_CIRCUIT_OPEN [RECONCILE]: raised in 1 of 3 runs, last 01:00 UTC, value 1, threshold 0, cleared", busy.Body);
        Assert.Contains("WARNING AI_KILL_SWITCH_ACTIVE [GLOBAL]: ACTIVE NOW, not yet seen by a run", busy.Body);
        // The critical alert is listed first.
        Assert.True(busy.Body.IndexOf("AI_BUDGET_EXHAUSTED", StringComparison.Ordinal) <
            busy.Body.IndexOf("AI_CIRCUIT_OPEN", StringComparison.Ordinal));
    }

    [Fact]
    public async Task The_digest_is_sent_once_a_day_from_its_hour_and_a_failed_send_is_an_alert_and_is_retried()
    {
        var sender = new RecordingSender();
        using var host = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Operations:AlertDigest:Enabled"] = "true", ["Operations:AlertDigest:HourUtc"] = "4",
                    ["Ai:Planning:KillSwitch"] = "true"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IAlertDigestSender>();
                services.AddSingleton<IAlertDigestSender>(sender);
            });
        });
        // A day well after the real time (see TestClock.Pin), so no other test's records fall inside it.
        var day = DateTime.UtcNow.Date.AddDays(40);
        DateTimeOffset At(int hour, int minute = 0) => new(day.AddHours(hour).AddMinutes(minute), TimeSpan.Zero);
        async Task<bool> DueAsync()
        {
            await using var scope = host.Services.CreateAsyncScope();
            return await scope.ServiceProvider.GetRequiredService<OperationsAlertDigest>()
                .RunDueAsync(TestContext.Current.CancellationToken);
        }
        async Task<string[]> AlertsAsync()
        {
            await using var scope = host.Services.CreateAsyncScope();
            return (await scope.ServiceProvider.GetRequiredService<OperationsHealthService>()
                .HealthAsync(TestContext.Current.CancellationToken)).Alerts.Select(x => x.Rule).ToArray();
        }

        factory.Clock.Pin(At(2));
        await using (var scope = host.Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<OperationsMaintenance>()
                .RunAsync(TestContext.Current.CancellationToken);
            // The run keeps the alerts it raised.
            var run = await scope.ServiceProvider.GetRequiredService<AppDbContext>().OperationsRecords.AsNoTracking()
                .OrderByDescending(x => x.CreatedAt).FirstAsync(x => x.Kind == OperationsRecordKinds.MaintenanceRun);
            using var details = JsonDocument.Parse(run.DetailsJson);
            Assert.Contains(details.RootElement.GetProperty("alerts").EnumerateArray(), x =>
                x.GetProperty("rule").GetString() == OperationsAlertRules.KillSwitchActive &&
                x.GetProperty("scope").GetString() == "PLANNING");
            Assert.True(details.RootElement.GetProperty("counts").TryGetProperty("pilotFeedbackResponses", out _));
        }
        // Before its hour nothing is sent.
        factory.Clock.Pin(At(3, 59));
        Assert.False(await DueAsync());
        Assert.Empty(sender.Messages);

        // A failed send is recorded, raised as an alert, and not retried at once.
        factory.Clock.Pin(At(4));
        sender.Fail = true;
        Assert.True(await DueAsync());
        Assert.Contains(OperationsAlertRules.AlertDigestFailed, await AlertsAsync());
        factory.Clock.Pin(At(4, 30));
        Assert.False(await DueAsync());
        factory.Clock.Pin(At(5, 1));
        sender.Fail = false;
        Assert.True(await DueAsync());
        var message = Assert.Single(sender.Messages);
        Assert.StartsWith("[TidySense] ", message.Subject);
        Assert.Contains("AI_KILL_SWITCH_ACTIVE [PLANNING]", message.Body);
        Assert.DoesNotContain(OperationsAlertRules.AlertDigestFailed, await AlertsAsync());

        // Once sent, the day is done; the next day is due again.
        factory.Clock.Pin(At(9));
        Assert.False(await DueAsync());
        factory.Clock.Pin(At(28));
        Assert.True(await DueAsync());
        Assert.Equal(2, sender.Messages.Count);
        await using (var scope = host.Services.CreateAsyncScope())
        {
            var dayStart = At(0);
            var records = await scope.ServiceProvider.GetRequiredService<AppDbContext>().OperationsRecords.AsNoTracking()
                .Where(x => x.Kind == OperationsRecordKinds.AlertDigest && x.CreatedAt >= dayStart)
                .OrderBy(x => x.CreatedAt).Select(x => x.Outcome).ToArrayAsync();
            Assert.Equal(new[] { "FAILED", "SUCCEEDED", "SUCCEEDED" }, records);
        }
    }

    [Fact]
    public async Task A_disabled_digest_sends_nothing()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<OperationsAlertDigest>()
            .RunDueAsync(TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("Pilot:SupportContact")]
    [InlineData("Kavenegar:ApiKey")]
    [InlineData("Kavenegar:Template")]
    [InlineData("Operations:AlertDigest:Enabled")]
    [InlineData("Operations:AlertDigest:To")]
    [InlineData("Operations:AlertDigest:SmtpHost")]
    public async Task Production_does_not_start_without_a_contact_channel_and_alert_delivery(string missing)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unused;Username=unused;Password=unused",
            ["Jwt:SigningKey"] = "production-profile-test-signing-key-32-chars",
            ["Otp:HashingKey"] = "production-profile-test-hashing-key-32-chars",
            ["Security:AllowedOrigins:0"] = "https://app.example",
            ["Pilot:SupportContact"] = "support@app.example",
            ["Kavenegar:ApiKey"] = "production-profile-test-key",
            ["Kavenegar:Template"] = "login-code",
            ["Operations:AlertDigest:Enabled"] = "true",
            ["Operations:AlertDigest:To"] = "operator@app.example",
            ["Operations:AlertDigest:From"] = "alerts@app.example",
            ["Operations:AlertDigest:SmtpHost"] = "smtp.app.example"
        };
        settings.Remove(missing);
        await using var production = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(settings));
        });
        var failure = Assert.Throws<InvalidOperationException>(() => production.CreateClient());
        Assert.Contains(missing.Split(':')[0], failure.Message);
    }

    private WebApplicationFactory<Program> ModelBackedHost(AiPlanningRuntimeTests.ScriptedProvider provider) =>
        factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Ai:Planning:Provider"] = "scripted",
                    ["Ai:Providers:scripted:BaseUrl"] = "https://provider.test",
                    ["Ai:Providers:scripted:ApiKey"] = "test-key",
                    ["Ai:Providers:scripted:Model"] = "test-model"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPlanningGenerator>();
                services.AddSingleton<IPlanningGenerator, AiPlanningGenerator>();
                services.RemoveAll<IAiCompletionClient>();
                services.AddSingleton<IAiCompletionClient>(provided => new OpenAiCompatibleChatClient(
                    new HttpClient(provider), provided.GetRequiredService<IOptionsMonitor<AiOptions>>()));
            });
        });

    private static HttpResponseMessage Completion(string content) => new(HttpStatusCode.OK)
    {
        Content = JsonContent.Create(new
        {
            choices = new[] { new { message = new { role = "assistant", content }, finish_reason = "stop" } },
            usage = new { prompt_tokens = 900, completion_tokens = 300 }
        })
    };

    private static Task<HttpResponseMessage> StartAsync(HttpClient client, string clientAttemptId,
        bool replaceActive = false) => SendAsync(client, HttpMethod.Post, "/api/v1/planning/attempts",
        new { clientAttemptId = $"attempt-{clientAttemptId}", intention = Intention, replaceActive });

    private static async Task<PlanningAttemptDto> WaitAsync(HttpClient client, Guid id)
    {
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var current = (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{id}"))!;
            if (current.Status is not ("QUEUED" or "RUNNING")) return current;
            await Task.Delay(50);
        }
        throw new TimeoutException("The planning attempt did not finish.");
    }

    private HttpClient Client(string token, WebApplicationFactory<Program> host)
    {
        var client = host.CreateClient(new WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private async Task<Session> CreateSessionAsync(string? phone = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = phone ?? "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Session(user.Id, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task<string?> ProblemCodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString();

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path,
        object body, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Session(Guid UserId, string Token);

    private sealed class RecordingSender : IAlertDigestSender
    {
        public List<(string Subject, string Body)> Messages { get; } = [];

        public bool Fail { get; set; }

        public Task SendAsync(string subject, string body, CancellationToken cancellationToken)
        {
            if (Fail) throw new InvalidOperationException("mail path down");
            Messages.Add((subject, body));
            return Task.CompletedTask;
        }
    }
}
