using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TidySense.Models;

namespace TidySense.Services.Ai;

/// <summary>The two messages of one completion and what was left out to make them fit.</summary>
public sealed record AiPrompt(string System, string User, string ContextReduction = AiPrompt.ReductionNone)
{
    public const string ReductionNone = "NONE";

    /// <summary>A deliberately high estimate: Persian text rarely needs more than one token per two characters.</summary>
    public int EstimatedTokens => (System.Length + User.Length + 1) / 2;
}

/// <summary>What identifies one logical operation in its records. The versions are pinned for the whole operation.</summary>
public sealed record AiOperationSpec(
    string Family,
    string ConfigurationKey,
    string PromptVersion,
    string SchemaVersion,
    string ContextBuilderVersion,
    string RepairPolicyVersion,
    Guid UserId,
    Guid? PlanningAttemptId = null,
    Guid? ReconcileExplanationId = null);

/// <summary>What an output gate decided about one answer. A null value is a rejection.</summary>
public sealed record AiGateVerdict<T>(T? Value, string? Gate, string? FailureClass, IReadOnlyList<string> RepairRules)
    where T : class
{
    /// <summary>What a rejected answer got wrong, in the gate's own words. Null when asking again cannot help.</summary>
    public string? Correction { get; init; }

    /// <summary>
    /// A usable, reduced result the gate built from a rejected answer, for a family that has one
    /// (planning, 029 §8): taken when the answer is not asked for again, and kept in case the answer
    /// asked for again is unusable. Its repair rules are <see cref="FallbackRepairRules"/>.
    /// </summary>
    public T? Fallback { get; init; }

    public IReadOnlyList<string> FallbackRepairRules { get; init; } = [];
}

/// <summary>An operation that ended without a usable result. The class is internal; callers map it to a bounded code.</summary>
public sealed class AiOperationFailedException(string failureClass) : Exception(failureClass)
{
    public string FailureClass { get; } = failureClass;
}

/// <summary>
/// Runs one logical AI operation for any output family: at most two provider calls under one
/// pinned configuration, each preceded by the kill-switch, spend-cap, circuit and budget checks,
/// run under its own timeout inside the operation deadline and recorded as metadata. The answer
/// is usable only through the supplied gate. The second call follows a transient failure or, for
/// a family that supplies a correction, an answer its gate rejected; that answer passes the same
/// gate or the operation fails, unless the gate built a reduced result of a rejected answer.
/// </summary>
public sealed class AiOperationRunner(
    IAiCompletionClient client,
    IOptionsMonitor<AiOptions> options,
    AiRuntimeState state,
    IAiInvocationLog log,
    TimeProvider time,
    ILogger logger)
{
    private const int MaxInvocations = 2;

    /// <param name="prompt">Null when the mandatory context alone does not fit: nothing is sent and nothing is truncated.</param>
    /// <param name="correct">
    /// Builds the request that is sent again after a rejected answer, from the first request and the
    /// gate's correction. Null, or a null result, means a rejected answer ends the operation.
    /// </param>
    /// <remarks>
    /// A rejected answer is never repaired or used in part, except through the reduced result its
    /// gate built (<see cref="AiGateVerdict{T}.Fallback"/>), taken only when no answer is asked for again.
    /// </remarks>
    public async Task<T> RunAsync<T>(AiOperationSpec spec, Func<AiOptions, AiFamilyOptions> family, AiPrompt? prompt,
        Func<AiCompletionResult, AiGateVerdict<T>> gate, CancellationToken cancellationToken,
        Func<AiPrompt, string, AiPrompt?>? correct = null) where T : class
    {
        // Provider, model and limits are pinned here and stay fixed through the retry.
        var pinned = options.CurrentValue;
        var settings = family(pinned);
        var providerKey = settings.Provider;
        pinned.Providers.TryGetValue(providerKey, out var provider);
        var model = provider?.Model ?? string.Empty;
        var circuit = AiRuntimeState.CircuitKey(providerKey, spec.Family);

        if (prompt is null)
        {
            var overflow = Row(0, time.GetUtcNow(), 0, 0, AiPrompt.ReductionNone);
            overflow.Outcome = AiInvocationOutcomes.Blocked;
            overflow.FailureClass = AiFailureClasses.Context;
            await RecordAsync(overflow);
            throw new AiOperationFailedException(AiFailureClasses.Context);
        }
        var first = prompt;

        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(TimeSpan.FromSeconds(settings.OperationDeadlineSeconds));
        string? retryReason = null;
        // The gate's reduced result of a rejected answer, used if no better answer comes.
        (T Value, int Sequence)? kept = null;
        for (var sequence = 1; ; sequence++)
        {
            var estimatedTokens = prompt.EstimatedTokens;
            var estimatedCost = Cost(provider, estimatedTokens, settings.MaxOutputTokens);
            var startedAt = time.GetUtcNow();
            if (await BlockedAsync(spec.Family, family, providerKey, circuit, estimatedCost, startedAt) is { } blocked)
            {
                var refused = Row(0, startedAt, estimatedTokens, 0, prompt.ContextReduction);
                refused.Outcome = AiInvocationOutcomes.Blocked;
                refused.FailureClass = blocked;
                refused.RetryReason = retryReason;
                await RecordAsync(refused);
                throw new AiOperationFailedException(blocked);
            }

            var row = Row(sequence, startedAt, estimatedTokens, estimatedCost, prompt.ContextReduction);
            row.RetryReason = retryReason;
            var stopwatch = Stopwatch.StartNew();
            AiCompletionResult? result = null;
            string? failure = null;
            var transient = false;
            try
            {
                var slots = state.Slots(settings.MaxConcurrentInvocations);
                await slots.WaitAsync(deadline.Token);
                try
                {
                    using var call = CancellationTokenSource.CreateLinkedTokenSource(deadline.Token);
                    call.CancelAfter(TimeSpan.FromSeconds(settings.InvocationTimeoutSeconds));
                    result = await client.CompleteAsync(providerKey,
                        new AiCompletionRequest(model, prompt.System, prompt.User, settings.MaxOutputTokens),
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
                // The operation was cancelled or its deadline passed. A late answer is never read.
                var cancelled = cancellationToken.IsCancellationRequested;
                row.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
                row.Outcome = cancelled ? AiInvocationOutcomes.Cancelled : AiInvocationOutcomes.Failed;
                row.FailureClass = cancelled ? null : AiFailureClasses.Timeout;
                await RecordAsync(row);
                if (cancelled) throw;
                state.Report(circuit, AiFailureClasses.Timeout, settings);
                throw new AiOperationFailedException(AiFailureClasses.Timeout);
            }

            row.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
            if (failure is null)
            {
                state.Report(circuit, null, settings);
                var verdict = gate(result!);
                row.InputTokens = result!.InputTokens;
                row.OutputTokens = result.OutputTokens;
                row.EstimatedCostMicros = Cost(provider, result.InputTokens ?? estimatedTokens,
                    result.OutputTokens ?? settings.MaxOutputTokens);
                // A rejected answer is sent for once more with what the gate rejected, while a call is left.
                var resend = verdict.Value is null && sequence < MaxInvocations && verdict.Correction is { } correction &&
                    family(options.CurrentValue).RetryEnabled ? correct?.Invoke(first, correction) : null;
                if (verdict.Fallback is { } fallback) kept = (fallback, sequence);
                var reduced = verdict.Value is null && resend is null && verdict.Fallback is not null;
                row.Outcome = verdict.Value is not null || reduced ? AiInvocationOutcomes.Succeeded : AiInvocationOutcomes.Rejected;
                row.Gate = reduced ? null : verdict.Gate;
                row.FailureClass = reduced ? null : verdict.FailureClass;
                row.RepairRulesJson = JsonSerializer.Serialize((reduced ? verdict.FallbackRepairRules : verdict.RepairRules).Distinct());
                await RecordAsync(row);
                if (verdict.Value is not null) return verdict.Value;
                if (verdict.Correction is not null)
                    logger.LogInformation(
                        "AI output rejected. Family: {Family}, Gate: {Gate}, Sequence: {Sequence}, AttemptId: {AttemptId}, ExplanationId: {ExplanationId}, Detail: {Detail}",
                        spec.Family, verdict.Gate, sequence, spec.PlanningAttemptId, spec.ReconcileExplanationId,
                        verdict.Correction);
                if (resend is not null)
                {
                    prompt = resend;
                    retryReason = verdict.FailureClass;
                    continue;
                }
                if (kept is { } usable) return Reduced(usable);
                throw new AiOperationFailedException(verdict.FailureClass!);
            }

            state.Report(circuit, failure, settings);
            if (failure == AiFailureClasses.SpendCap)
            {
                state.LatchSpend(providerKey, settings.SpendCapLatchMinutes);
                logger.LogCritical("AI_PROVIDER_SPEND_CAP_REACHED. Provider: {Provider}, Family: {Family}",
                    providerKey, spec.Family);
            }
            row.Outcome = AiInvocationOutcomes.Failed;
            row.FailureClass = failure;
            await RecordAsync(row);
            if (sequence < MaxInvocations && transient && family(options.CurrentValue).RetryEnabled)
            {
                retryReason = failure;
                continue;
            }
            if (kept is { } earlier) return Reduced(earlier);
            throw new AiOperationFailedException(failure);
        }

        T Reduced((T Value, int Sequence) kept)
        {
            logger.LogInformation(
                "AI output used without the items its gate removed. Family: {Family}, Sequence: {Sequence}, AttemptId: {AttemptId}",
                spec.Family, kept.Sequence, spec.PlanningAttemptId);
            return kept.Value;
        }

        AiInvocation Row(int sequence, DateTimeOffset startedAt, int inputEstimate, long cost, string reduction) =>
            new()
            {
                Id = Guid.NewGuid(), UserId = spec.UserId, PlanningAttemptId = spec.PlanningAttemptId,
                ReconcileExplanationId = spec.ReconcileExplanationId,
                Family = spec.Family, ConfigurationKey = spec.ConfigurationKey, ProviderKey = providerKey, Model = model,
                PromptVersion = spec.PromptVersion, SchemaVersion = spec.SchemaVersion,
                ContextBuilderVersion = spec.ContextBuilderVersion,
                RepairPolicyVersion = spec.RepairPolicyVersion, Sequence = sequence,
                StartedAt = startedAt, CompletedAt = startedAt, EstimatedInputTokens = inputEstimate,
                MaxOutputTokens = settings.MaxOutputTokens, EstimatedCostMicros = cost, ContextReduction = reduction
            };
    }

    /// <summary>Checked before every physical call, the retry included, against the configuration as it is now.</summary>
    private async Task<string?> BlockedAsync(string familyKey, Func<AiOptions, AiFamilyOptions> family,
        string providerKey, string circuit, long estimatedCost, DateTimeOffset now)
    {
        var current = options.CurrentValue;
        var settings = family(current);
        if (current.GlobalKillSwitch || settings.KillSwitch) return AiFailureClasses.KillSwitch;
        if (!current.Providers.TryGetValue(providerKey, out var provider)) return AiFailureClasses.Configuration;
        if (provider.Disabled) return AiFailureClasses.KillSwitch;
        if (state.IsSpendLatched(providerKey)) return AiFailureClasses.SpendCap;
        if (state.IsCircuitOpen(circuit)) return AiFailureClasses.CircuitOpen;
        var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var spent = await log.SpentMicrosSinceAsync(familyKey, dayStart);
        return spent + estimatedCost > (long)(settings.DailyBudgetUsd * 1_000_000m)
            ? AiFailureClasses.Budget : null;
    }

    private async Task RecordAsync(AiInvocation row)
    {
        row.CompletedAt = time.GetUtcNow();
        await log.RecordAsync(row);
        logger.LogInformation(
            "AI invocation recorded. Family: {Family}, Provider: {Provider}, Sequence: {Sequence}, Outcome: {Outcome}, FailureClass: {FailureClass}, Gate: {Gate}, LatencyMs: {LatencyMs}, AttemptId: {AttemptId}, ExplanationId: {ExplanationId}",
            row.Family, row.ProviderKey, row.Sequence, row.Outcome, row.FailureClass, row.Gate, row.LatencyMs,
            row.PlanningAttemptId, row.ReconcileExplanationId);
    }

    /// <summary>Prices are per million tokens, so a token costs its price in millionths of a dollar.</summary>
    private static long Cost(AiProviderOptions? provider, int inputTokens, int outputTokens) => provider is null
        ? 0
        : (long)Math.Ceiling(inputTokens * provider.InputPricePerMillionTokens +
            outputTokens * provider.OutputPricePerMillionTokens);
}
