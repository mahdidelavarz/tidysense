using Microsoft.Extensions.Options;

namespace TidySense.Services.Ai;

/// <summary>
/// The model-backed planning generator. The model receives one rendered request and no tool; its
/// text is usable only after the output gate. The call discipline (two calls at most, the checks
/// before each, the record of each) is <see cref="AiOperationRunner"/>'s. An answer the gate
/// rejects is asked for once more with the gate's correction. A failure ends the attempt with a
/// bounded code and changes nothing else.
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

    private readonly AiOperationRunner _runner = new(client, options, state, log, time, logger);

    public string Key => ConfigurationKey;

    public async Task<PlanningGenerationResult> GenerateAsync(PlanningGenerationRequest request,
        CancellationToken cancellationToken)
    {
        var maxInputTokens = options.CurrentValue.Planning.MaxInputTokens;
        var rendered = PlanningPromptRenderer.Render(request, maxInputTokens);
        var spec = new AiOperationSpec(Family, ConfigurationKey, PlanningPromptRenderer.PromptVersion,
            PlanningJson.SchemaVersion, request.Context.BuilderVersion, PlanningOutputGate.RepairPolicyVersion,
            request.UserId, PlanningAttemptId: request.AttemptId);
        try
        {
            var gate = await _runner.RunAsync(spec, x => x.Planning,
                rendered is null ? null : new AiPrompt(rendered.System, rendered.User, rendered.ContextReduction),
                result =>
                {
                    var evaluated = PlanningOutputGate.Evaluate(result.Text, result.FinishReason, request.Context,
                        request.AllowClarification);
                    return new AiGateVerdict<PlanningGateResult>(evaluated.Passed ? evaluated : null, evaluated.Gate,
                        evaluated.FailureClass, evaluated.RepairRules) { Correction = evaluated.Correction };
                }, cancellationToken,
                // The resend is the same request with the correction added to the instructions, if it still fits.
                (first, correction) => first with { System = PlanningPromptRenderer.Corrected(first.System, correction) }
                    is { } corrected && corrected.EstimatedTokens <= maxInputTokens ? corrected : null);
            return new PlanningGenerationResult(gate.Draft, request.Context.Fingerprint)
            {
                Outcome = gate.Outcome!, Clarification = gate.Clarification
            };
        }
        catch (AiOperationFailedException failure)
        {
            throw Failed(failure.FailureClass);
        }
    }

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
