using Microsoft.Extensions.Options;

namespace TidySense.Services.Ai;

/// <summary>
/// The model-backed Reconcile explanation. It sends the structured evidence it was handed and no
/// tool, under the same call discipline as every AI operation, and its text is usable only after
/// the explanation gate.
/// </summary>
public sealed class AiReconcileExplainer(
    IAiCompletionClient client,
    IOptionsMonitor<AiOptions> options,
    AiRuntimeState state,
    IAiInvocationLog log,
    TimeProvider time,
    ILogger<AiReconcileExplainer> logger) : IReconcileExplainer
{
    public const string ConfigurationKey = "reconcile.explanation";
    public const string Family = "RECONCILE";

    private readonly AiOperationRunner _runner = new(client, options, state, log, time, logger);

    public string Key => ConfigurationKey;

    public async Task<ReconcileExplanationContent> ExplainAsync(ReconcileExplanationRequest request,
        CancellationToken cancellationToken)
    {
        var spec = new AiOperationSpec(Family, ConfigurationKey, ReconcileExplanationPromptRenderer.PromptVersion,
            ReconcileExplanationGate.SchemaVersion, request.Context.BuilderVersion,
            ReconcileExplanationGate.RepairPolicyVersion, request.UserId, ReconcileExplanationId: request.ExplanationId);
        try
        {
            return await _runner.RunAsync(spec, x => x.Reconcile,
                ReconcileExplanationPromptRenderer.Render(request.Context, options.CurrentValue.Reconcile.MaxInputTokens),
                result =>
                {
                    var gate = ReconcileExplanationGate.Evaluate(result.Text, result.FinishReason, request.Context);
                    return new AiGateVerdict<ReconcileExplanationContent>(gate.Content, gate.Gate, gate.FailureClass,
                        gate.RepairRules);
                }, cancellationToken);
        }
        catch (AiOperationFailedException failure)
        {
            throw new ReconcileExplanationException(failure.FailureClass switch
            {
                AiFailureClasses.KillSwitch or AiFailureClasses.CircuitOpen or AiFailureClasses.Configuration
                    => ReconcileExplanationFailureCodes.AiUnavailable,
                AiFailureClasses.Budget or AiFailureClasses.SpendCap => ReconcileExplanationFailureCodes.AiBudgetExhausted,
                AiFailureClasses.Context => ReconcileExplanationFailureCodes.ContextTooLarge,
                AiFailureClasses.Timeout => ReconcileExplanationFailureCodes.GenerationTimeout,
                AiFailureClasses.Incomplete or AiFailureClasses.Parse or AiFailureClasses.Schema
                    or AiFailureClasses.Policy or AiFailureClasses.Semantic or AiFailureClasses.ProviderRefused
                    => ReconcileExplanationFailureCodes.ExplanationInvalid,
                _ => ReconcileExplanationFailureCodes.ProviderError
            });
        }
    }
}
