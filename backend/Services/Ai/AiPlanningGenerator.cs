using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TidySense.Models;

namespace TidySense.Services.Ai;

/// <summary>
/// The model-backed planning generator. One logical operation is at most two provider calls under
/// one pinned configuration: every call is preceded by the kill-switch, spend-cap, circuit and
/// budget checks, runs under its own timeout inside the operation deadline, and is recorded as
/// metadata. The model receives one rendered request and no tool; its text is usable only after
/// the output gate. A failure ends the attempt with a bounded code and changes nothing else.
/// </summary>
public sealed class AiPlanningGenerator(
    IAiCompletionClient client,
    IOptionsMonitor<AiOptions> options,
    AiRuntimeState state,
    IAiInvocationLog log,
    TimeProvider time,
    ILogger<AiPlanningGenerator> logger) : IPlanningGenerator
{
    public const string ConfigurationKey = "planning.standard";
    public const string Family = "PLANNING";
    private const int MaxInvocations = 2;

    public string Key => ConfigurationKey;

    public async Task<PlanningGenerationResult> GenerateAsync(PlanningGenerationRequest request,
        CancellationToken cancellationToken)
    {
        // Provider, model and limits are pinned here and stay fixed through the retry.
        var pinned = options.CurrentValue;
        var planning = pinned.Planning;
        var providerKey = planning.Provider;
        pinned.Providers.TryGetValue(providerKey, out var provider);
        var model = provider?.Model ?? string.Empty;
        var circuit = AiRuntimeState.CircuitKey(providerKey, Family);

        var prompt = PlanningPromptRenderer.Render(request, planning.MaxInputTokens);
        if (prompt is null)
        {
            // The mandatory context alone does not fit: nothing is sent and nothing is truncated.
            var overflow = Row(0, time.GetUtcNow(), 0, 0, PlanningPromptRenderer.ReductionNone);
            overflow.Outcome = AiInvocationOutcomes.Blocked;
            overflow.FailureClass = AiFailureClasses.Context;
            await RecordAsync(overflow);
            throw Failed(AiFailureClasses.Context);
        }
        var estimatedTokens = PlanningPromptRenderer.EstimateTokens(prompt);
        var estimatedCost = Cost(provider, estimatedTokens, planning.MaxOutputTokens);

        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(TimeSpan.FromSeconds(planning.OperationDeadlineSeconds));
        string? retryReason = null;
        for (var sequence = 1; ; sequence++)
        {
            var startedAt = time.GetUtcNow();
            if (await BlockedAsync(providerKey, circuit, estimatedCost, startedAt) is { } blocked)
            {
                var refused = Row(0, startedAt, estimatedTokens, 0, prompt.ContextReduction);
                refused.Outcome = AiInvocationOutcomes.Blocked;
                refused.FailureClass = blocked;
                refused.RetryReason = retryReason;
                await RecordAsync(refused);
                throw Failed(blocked);
            }

            var row = Row(sequence, startedAt, estimatedTokens, estimatedCost, prompt.ContextReduction);
            row.RetryReason = retryReason;
            var stopwatch = Stopwatch.StartNew();
            AiCompletionResult? result = null;
            string? failure = null;
            var transient = false;
            try
            {
                var slots = state.Slots(planning.MaxConcurrentInvocations);
                await slots.WaitAsync(deadline.Token);
                try
                {
                    using var call = CancellationTokenSource.CreateLinkedTokenSource(deadline.Token);
                    call.CancelAfter(TimeSpan.FromSeconds(planning.InvocationTimeoutSeconds));
                    result = await client.CompleteAsync(providerKey,
                        new AiCompletionRequest(model, prompt.System, prompt.User, planning.MaxOutputTokens),
                        call.Token);
                }
                catch (OperationCanceledException) when (!deadline.IsCancellationRequested)
                {
                    failure = AiFailureClasses.Timeout;
                    transient = true;
                }
                catch (AiProviderException exception)
                {
                    failure = exception.FailureClass;
                    transient = exception.Transient;
                }
                finally
                {
                    slots.Release();
                }
            }
            catch (OperationCanceledException)
            {
                // The attempt was cancelled or the operation deadline passed. A late answer is never read.
                var cancelled = cancellationToken.IsCancellationRequested;
                row.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
                row.Outcome = cancelled ? AiInvocationOutcomes.Cancelled : AiInvocationOutcomes.Failed;
                row.FailureClass = cancelled ? null : AiFailureClasses.Timeout;
                await RecordAsync(row);
                if (cancelled) throw;
                state.Report(circuit, AiFailureClasses.Timeout, planning);
                throw Failed(AiFailureClasses.Timeout);
            }

            row.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
            if (failure is null)
            {
                state.Report(circuit, null, planning);
                var gate = PlanningOutputGate.Evaluate(result!.Text, result.FinishReason, request.Context,
                    request.AllowClarification);
                row.InputTokens = result.InputTokens;
                row.OutputTokens = result.OutputTokens;
                row.EstimatedCostMicros = Cost(provider, result.InputTokens ?? estimatedTokens,
                    result.OutputTokens ?? planning.MaxOutputTokens);
                row.Outcome = gate.Passed ? AiInvocationOutcomes.Succeeded : AiInvocationOutcomes.Rejected;
                row.Gate = gate.Gate;
                row.FailureClass = gate.FailureClass;
                row.RepairRulesJson = JsonSerializer.Serialize(gate.RepairRules.Distinct());
                await RecordAsync(row);
                // An output the gate rejects is never repaired by asking again.
                if (!gate.Passed) throw Failed(gate.FailureClass!);
                return new PlanningGenerationResult(gate.Draft, request.Context.Fingerprint)
                {
                    Outcome = gate.Outcome!, Clarification = gate.Clarification
                };
            }

            state.Report(circuit, failure, planning);
            if (failure == AiFailureClasses.SpendCap)
            {
                state.LatchSpend(providerKey, planning.SpendCapLatchMinutes);
                logger.LogCritical("AI_PROVIDER_SPEND_CAP_REACHED. Provider: {Provider}, Family: {Family}",
                    providerKey, Family);
            }
            row.Outcome = AiInvocationOutcomes.Failed;
            row.FailureClass = failure;
            await RecordAsync(row);
            if (sequence < MaxInvocations && transient && options.CurrentValue.Planning.RetryEnabled)
            {
                retryReason = failure;
                continue;
            }
            throw Failed(failure);
        }

        AiInvocation Row(int sequence, DateTimeOffset startedAt, int inputEstimate, long cost, string reduction) =>
            new()
            {
                Id = Guid.NewGuid(), UserId = request.UserId, PlanningAttemptId = request.AttemptId,
                Family = Family, ConfigurationKey = ConfigurationKey, ProviderKey = providerKey, Model = model,
                PromptVersion = PlanningPromptRenderer.PromptVersion, SchemaVersion = PlanningJson.SchemaVersion,
                ContextBuilderVersion = request.Context.BuilderVersion,
                RepairPolicyVersion = PlanningOutputGate.RepairPolicyVersion, Sequence = sequence,
                StartedAt = startedAt, CompletedAt = startedAt, EstimatedInputTokens = inputEstimate,
                MaxOutputTokens = planning.MaxOutputTokens, EstimatedCostMicros = cost, ContextReduction = reduction
            };
    }

    /// <summary>Checked before every physical call, the retry included, against the configuration as it is now.</summary>
    private async Task<string?> BlockedAsync(string providerKey, string circuit, long estimatedCost,
        DateTimeOffset now)
    {
        var current = options.CurrentValue;
        if (current.GlobalKillSwitch || current.Planning.KillSwitch) return AiFailureClasses.KillSwitch;
        if (!current.Providers.TryGetValue(providerKey, out var provider)) return AiFailureClasses.Configuration;
        if (provider.Disabled) return AiFailureClasses.KillSwitch;
        if (state.IsSpendLatched(providerKey)) return AiFailureClasses.SpendCap;
        if (state.IsCircuitOpen(circuit)) return AiFailureClasses.CircuitOpen;
        var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var spent = await log.SpentMicrosSinceAsync(Family, dayStart);
        return spent + estimatedCost > (long)(current.Planning.DailyBudgetUsd * 1_000_000m)
            ? AiFailureClasses.Budget : null;
    }

    private async Task RecordAsync(AiInvocation row)
    {
        row.CompletedAt = time.GetUtcNow();
        await log.RecordAsync(row);
        logger.LogInformation(
            "AI invocation recorded. Family: {Family}, Provider: {Provider}, Sequence: {Sequence}, Outcome: {Outcome}, FailureClass: {FailureClass}, Gate: {Gate}, LatencyMs: {LatencyMs}, AttemptId: {AttemptId}",
            row.Family, row.ProviderKey, row.Sequence, row.Outcome, row.FailureClass, row.Gate, row.LatencyMs,
            row.PlanningAttemptId);
    }

    /// <summary>Prices are per million tokens, so a token costs its price in millionths of a dollar.</summary>
    private static long Cost(AiProviderOptions? provider, int inputTokens, int outputTokens) => provider is null
        ? 0
        : (long)Math.Ceiling(inputTokens * provider.InputPricePerMillionTokens +
            outputTokens * provider.OutputPricePerMillionTokens);

    private static PlanningGenerationException Failed(string failureClass) => new(failureClass switch
    {
        AiFailureClasses.KillSwitch or AiFailureClasses.CircuitOpen or AiFailureClasses.Configuration
            => PlanningFailureCodes.AiUnavailable,
        AiFailureClasses.Budget or AiFailureClasses.SpendCap => PlanningFailureCodes.AiBudgetExhausted,
        AiFailureClasses.Context => PlanningFailureCodes.ContextTooLarge,
        AiFailureClasses.Timeout => PlanningFailureCodes.GenerationTimeout,
        AiFailureClasses.Incomplete or AiFailureClasses.Parse or AiFailureClasses.Schema
            or AiFailureClasses.Policy or AiFailureClasses.Semantic or AiFailureClasses.ProviderRefused
            => PlanningFailureCodes.DraftInvalid,
        _ => PlanningFailureCodes.ProviderError
    });
}
