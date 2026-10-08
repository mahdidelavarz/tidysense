using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TidySense.Infrastructure.Ai;
using TidySense.Models;
using TidySense.Services;
using TidySense.Services.Ai;

namespace TidySense.Backend.Tests;

/// <summary>
/// The model-backed explainer against a scripted provider: the real adapter, renderer, gate and
/// runtime controls, with only the HTTP transport replaced.
/// </summary>
public sealed class AiReconcileRuntimeTests
{
    private const string Provider = "test-provider";

    [Fact]
    public async Task A_valid_answer_becomes_an_explanation_from_one_tool_free_call_over_structured_evidence()
    {
        var harness = new Harness();
        harness.Provider.Reply(Completion(harness.Scenario.Valid().ToJsonString()));
        var explanationId = Guid.NewGuid();

        var content = await harness.ExplainAsync(explanationId);

        Assert.Equal(2, content.Recommendations.Count);
        var call = Assert.Single(harness.Provider.Calls);
        using var body = JsonDocument.Parse(call.Body);
        foreach (var forbidden in new[] { "tools", "functions", "tool_choice", "function_call", "plugins" })
            Assert.False(body.RootElement.TryGetProperty(forbidden, out _), forbidden);
        Assert.False(body.RootElement.GetProperty("stream").GetBoolean());
        var messages = body.RootElement.GetProperty("messages").EnumerateArray().ToArray();
        Assert.Equal(new[] { "system", "user" }, messages.Select(x => x.GetProperty("role").GetString()));
        var user = messages[1].GetProperty("content").GetString()!;
        Assert.StartsWith(ReconcileExplanationPromptRenderer.DataOpen, user);
        // Nothing the user wrote and no canonical identifier leaves the application.
        Assert.DoesNotContain("محرمانه", call.Body);
        Assert.DoesNotContain("delete_all_tasks", call.Body);
        foreach (var id in harness.Scenario.AllIds) Assert.DoesNotContain(id.ToString(), call.Body);
        Assert.Contains("REPEATED_CARRY", user);

        var row = Assert.Single(harness.Log.Rows);
        Assert.Equal(AiInvocationOutcomes.Succeeded, row.Outcome);
        Assert.Equal(AiReconcileExplainer.Family, row.Family);
        Assert.Equal(AiReconcileExplainer.ConfigurationKey, row.ConfigurationKey);
        Assert.Equal(explanationId, row.ReconcileExplanationId);
        Assert.Null(row.PlanningAttemptId);
        Assert.Equal(ReconcileExplanationPromptRenderer.PromptVersion, row.PromptVersion);
        Assert.Equal(ReconcileExplanationGate.SchemaVersion, row.SchemaVersion);
        Assert.Equal(ReconcileExplanationContextBuilder.Version, row.ContextBuilderVersion);
        Assert.Equal(120 * 2 + 80 * 4, row.EstimatedCostMicros);
        var stored = string.Join('|', typeof(AiInvocation).GetProperties()
            .Where(x => x.PropertyType == typeof(string)).Select(x => (string?)x.GetValue(row)));
        Assert.Matches("^[\\x20-\\x7E]*$", stored);
    }

    [Fact]
    public async Task An_answer_that_reaches_beyond_the_evidence_is_rejected_and_never_asked_for_again()
    {
        var harness = new Harness();
        var acting = harness.Scenario.Valid();
        acting["recommendations"]![0]!["actionType"] = "DROP_TASKS";
        acting["recommendations"]![0]!["unitRefs"]![0] = harness.Scenario.Target(harness.Scenario.Risky.Id).Ref;
        harness.Provider.Reply(Completion(acting.ToJsonString()));
        Assert.Equal(ReconcileExplanationFailureCodes.ExplanationInvalid, await harness.FailureAsync());

        var numbered = harness.Scenario.Valid();
        numbered["summary"] = "۹ کار عقب افتاده است.";
        harness.Provider.Reply(Completion(numbered.ToJsonString()));
        Assert.Equal(ReconcileExplanationFailureCodes.ExplanationInvalid, await harness.FailureAsync());

        harness.Provider.Reply(Completion(harness.Scenario.Valid().ToJsonString(), "length"));
        Assert.Equal(ReconcileExplanationFailureCodes.ExplanationInvalid, await harness.FailureAsync());

        Assert.Equal(3, harness.Provider.Calls.Count);
        Assert.Equal(new[] { PlanningOutputGate.GateSemantic, PlanningOutputGate.GatePolicy, PlanningOutputGate.GateTransport },
            harness.Log.Rows.Select(x => x.Gate));
        Assert.All(harness.Log.Rows, x => Assert.Equal(AiInvocationOutcomes.Rejected, x.Outcome));
    }

    [Theory]
    [InlineData("global")]
    [InlineData("reconcile")]
    [InlineData("provider")]
    public async Task Each_kill_switch_blocks_the_provider_call(string scope)
    {
        var harness = new Harness(x =>
        {
            x.GlobalKillSwitch = scope == "global";
            x.Reconcile.KillSwitch = scope == "reconcile";
            x.Providers[Provider].Disabled = scope == "provider";
        });
        harness.Provider.Reply(Completion(harness.Scenario.Valid().ToJsonString()));

        Assert.Equal(ReconcileExplanationFailureCodes.AiUnavailable, await harness.FailureAsync());
        Assert.Empty(harness.Provider.Calls);
        var row = Assert.Single(harness.Log.Rows);
        Assert.Equal(0, row.Sequence);
        Assert.Equal(AiFailureClasses.KillSwitch, row.FailureClass);
    }

    [Fact]
    public async Task The_families_have_their_own_switch_budget_and_circuit()
    {
        // The planning switch and planning spend say nothing about Reconcile explanations.
        var harness = new Harness(x =>
        {
            x.Planning.KillSwitch = true;
            x.Reconcile.DailyBudgetUsd = 1m;
            x.Reconcile.RetryEnabled = false;
            x.Reconcile.CircuitFailureThreshold = 1;
        });
        harness.Log.Rows.Add(new AiInvocation
        {
            Family = AiPlanningGenerator.Family, StartedAt = harness.Clock.GetUtcNow(), EstimatedCostMicros = 5_000_000
        });
        harness.Provider.Reply(Completion(harness.Scenario.Valid().ToJsonString()));
        await harness.ExplainAsync(Guid.NewGuid());

        harness.Provider.Reply(HttpStatusCode.ServiceUnavailable);
        Assert.Equal(ReconcileExplanationFailureCodes.ProviderError, await harness.FailureAsync());
        Assert.Equal(ReconcileExplanationFailureCodes.AiUnavailable, await harness.FailureAsync());
        Assert.Equal(AiFailureClasses.CircuitOpen, harness.Log.Rows[^1].FailureClass);
        Assert.Equal(2, harness.Provider.Calls.Count);
        Assert.False(harness.State.IsCircuitOpen(AiRuntimeState.CircuitKey(Provider, AiPlanningGenerator.Family)));

        var poor = new Harness(x => x.Reconcile.DailyBudgetUsd = 0.000001m);
        Assert.Equal(ReconcileExplanationFailureCodes.AiBudgetExhausted, await poor.FailureAsync());
        Assert.Empty(poor.Provider.Calls);
    }

    [Fact]
    public async Task A_transient_failure_is_retried_once_and_evidence_that_does_not_fit_is_never_sent()
    {
        var harness = new Harness();
        harness.Provider.Reply(HttpStatusCode.ServiceUnavailable);
        harness.Provider.Reply(Completion(harness.Scenario.Valid().ToJsonString()));
        await harness.ExplainAsync(Guid.NewGuid());
        Assert.Equal(harness.Provider.Calls[0].Body, harness.Provider.Calls[1].Body);
        Assert.Equal(new[] { 1, 2 }, harness.Log.Rows.Select(x => x.Sequence));

        var down = new Harness();
        for (var i = 0; i < 4; i++) down.Provider.Reply(HttpStatusCode.BadGateway);
        Assert.Equal(ReconcileExplanationFailureCodes.ProviderError, await down.FailureAsync());
        Assert.Equal(2, down.Provider.Calls.Count);

        var small = new Harness(x => x.Reconcile.MaxInputTokens = 50);
        Assert.Equal(ReconcileExplanationFailureCodes.ContextTooLarge, await small.FailureAsync());
        Assert.Empty(small.Provider.Calls);
        Assert.Equal(AiFailureClasses.Context, Assert.Single(small.Log.Rows).FailureClass);
    }

    [Fact]
    public async Task Cancelling_abandons_the_provider_call()
    {
        var harness = new Harness();
        harness.Provider.Hang();
        using var cancel = new CancellationTokenSource();
        var running = harness.Explainer.ExplainAsync(harness.Request(Guid.NewGuid()), cancel.Token);
        await harness.Provider.Started.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await cancel.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => running);
        Assert.Equal(AiInvocationOutcomes.Cancelled, Assert.Single(harness.Log.Rows).Outcome);
    }

    /// <summary>
    /// Talks to the real provider. It runs only when TIDYSENSE_AI_SMOKE_KEY is set
    /// (TIDYSENSE_AI_SMOKE_BASEURL and TIDYSENSE_AI_SMOKE_MODEL override the DeepSeek defaults).
    /// </summary>
    [Fact]
    public async Task Real_provider_smoke_returns_an_explanation_that_passes_the_gate()
    {
        var key = Environment.GetEnvironmentVariable("TIDYSENSE_AI_SMOKE_KEY");
        Assert.SkipWhen(string.IsNullOrWhiteSpace(key), "TIDYSENSE_AI_SMOKE_KEY is not set.");
        var options = new TestOptionsMonitor<AiOptions>(new AiOptions
        {
            Reconcile = new AiReconcileOptions { Provider = "deepseek" },
            Providers =
            {
                ["deepseek"] = new AiProviderOptions
                {
                    BaseUrl = Environment.GetEnvironmentVariable("TIDYSENSE_AI_SMOKE_BASEURL") ?? "https://api.deepseek.com",
                    ApiKey = key!,
                    Model = Environment.GetEnvironmentVariable("TIDYSENSE_AI_SMOKE_MODEL") ?? "deepseek-v4-flash",
                    DisableThinking = true
                }
            }
        });
        var log = new AiPlanningRuntimeTests.MemoryInvocationLog();
        using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        var explainer = new AiReconcileExplainer(new OpenAiCompatibleChatClient(http, options), options,
            new AiRuntimeState(TimeProvider.System), log, TimeProvider.System, NullLogger<AiReconcileExplainer>.Instance);
        var scenario = ReconcileExplanationGateTests.Scenario.Create();

        var content = await explainer.ExplainAsync(
            new ReconcileExplanationRequest(Guid.NewGuid(), Guid.NewGuid(), scenario.Input.Context),
            TestContext.Current.CancellationToken);

        Assert.Null(ReconcileExplanationGate.Validate(content, scenario.Input.Context));
        Assert.Equal(AiInvocationOutcomes.Succeeded, log.Rows[^1].Outcome);
        TestContext.Current.SendDiagnosticMessage(
            "Smoke: recommendations {0}, calls {1}, input tokens {2}, output tokens {3}, latency {4} ms, repairs {5}",
            content.Recommendations.Count, log.Rows.Count, log.Rows[^1].InputTokens, log.Rows[^1].OutputTokens,
            log.Rows[^1].LatencyMs, log.Rows[^1].RepairRulesJson);
    }

    [Fact]
    public void Explanation_components_cannot_reach_persistence_commands_or_services()
    {
        var forbidden = new[]
        {
            typeof(DbContext), typeof(CommandExecutionService), typeof(PlanningService), typeof(TaskService),
            typeof(GoalService), typeof(ProjectService), typeof(RoutineService), typeof(ReconcileService),
            typeof(ReconcileExplanationService), typeof(CaptureService), typeof(IServiceProvider),
            typeof(IServiceScopeFactory)
        };
        foreach (var type in new[]
                 {
                     typeof(ReconcileExplanationPromptRenderer), typeof(ReconcileExplanationGate),
                     typeof(ReconcileExplanationContextBuilder), typeof(AiReconcileExplainer),
                     typeof(DeterministicReconcileExplainer), typeof(IReconcileExplainer), typeof(AiOperationRunner),
                     typeof(AiOutputText)
                 })
        {
            const BindingFlags all = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance |
                BindingFlags.Static | BindingFlags.DeclaredOnly;
            var reachable = type.GetFields(all).Select(x => x.FieldType)
                .Concat(type.GetConstructors(all).SelectMany(x => x.GetParameters()).Select(x => x.ParameterType))
                .Concat(type.GetMethods(all).SelectMany(x => x.GetParameters().Select(p => p.ParameterType)
                    .Append(x.ReturnType)))
                .ToArray();
            Assert.DoesNotContain(reachable, used => forbidden.Any(x => x.IsAssignableFrom(used)));
        }
    }

    private static HttpResponseMessage Completion(string content, string finishReason = "stop") => new(HttpStatusCode.OK)
    {
        Content = new StringContent(JsonSerializer.Serialize(new
        {
            id = "completion-1",
            choices = new[] { new { index = 0, message = new { role = "assistant", content }, finish_reason = finishReason } },
            usage = new { prompt_tokens = 120, completion_tokens = 80 }
        }), Encoding.UTF8, "application/json")
    };

    private sealed class Harness
    {
        public Harness(Action<AiOptions>? configure = null)
        {
            var options = new AiOptions
            {
                Reconcile = new AiReconcileOptions { Provider = AiReconcileRuntimeTests.Provider },
                Providers =
                {
                    [AiReconcileRuntimeTests.Provider] = new AiProviderOptions
                    {
                        BaseUrl = "https://provider.test/v1/", ApiKey = "test-key", Model = "test-model",
                        InputPricePerMillionTokens = 2m, OutputPricePerMillionTokens = 4m
                    }
                }
            };
            configure?.Invoke(options);
            Options = new TestOptionsMonitor<AiOptions>(options);
            Clock.Pin(new DateTimeOffset(2026, 10, 8, 8, 0, 0, TimeSpan.Zero));
            State = new AiRuntimeState(Clock);
            Explainer = new AiReconcileExplainer(
                new OpenAiCompatibleChatClient(new HttpClient(Provider) { Timeout = Timeout.InfiniteTimeSpan }, Options),
                Options, State, Log, Clock, NullLogger<AiReconcileExplainer>.Instance);
        }

        public TestOptionsMonitor<AiOptions> Options { get; }
        public AiPlanningRuntimeTests.ScriptedProvider Provider { get; } = new();
        public AiPlanningRuntimeTests.MemoryInvocationLog Log { get; } = new();
        public TestClock Clock { get; } = new();
        public AiRuntimeState State { get; }
        public AiReconcileExplainer Explainer { get; }
        public ReconcileExplanationGateTests.Scenario Scenario { get; } = ReconcileExplanationGateTests.Scenario.Create();

        public ReconcileExplanationRequest Request(Guid explanationId) =>
            new(explanationId, Guid.NewGuid(), Scenario.Input.Context);

        public Task<ReconcileExplanationContent> ExplainAsync(Guid explanationId) =>
            Explainer.ExplainAsync(Request(explanationId), TestContext.Current.CancellationToken);

        public async Task<string> FailureAsync() =>
            (await Assert.ThrowsAsync<ReconcileExplanationException>(() => ExplainAsync(Guid.NewGuid()))).FailureCode;
    }
}
