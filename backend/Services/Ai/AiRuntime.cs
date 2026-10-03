using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services.Ai;

/// <summary>Where AI operation metadata is kept and where the day's spend is read from.</summary>
public interface IAiInvocationLog
{
    Task RecordAsync(AiInvocation invocation);

    Task<long> SpentMicrosSinceAsync(string family, DateTimeOffset since);
}

/// <summary>Writes each record in its own unit of work, so it survives whatever happens to the attempt.</summary>
public sealed class AiInvocationStore(IServiceScopeFactory scopes) : IAiInvocationLog
{
    public async Task RecordAsync(AiInvocation invocation)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AiInvocations.Add(invocation);
        await db.SaveChangesAsync();
    }

    public async Task<long> SpentMicrosSinceAsync(string family, DateTimeOffset since)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.AiInvocations.AsNoTracking()
            .Where(x => x.Family == family && x.StartedAt >= since).SumAsync(x => x.EstimatedCostMicros);
    }
}

/// <summary>
/// Process-wide runtime state: one circuit per provider and output family, the provider spend-cap
/// latch, and the concurrency limit. A circuit moves only on provider-availability failures.
/// </summary>
public sealed class AiRuntimeState(TimeProvider time)
{
    private readonly object _gate = new();
    private readonly Dictionary<string, (int Failures, DateTimeOffset? OpenUntil)> _circuits = new(StringComparer.Ordinal);
    private readonly Dictionary<string, DateTimeOffset> _spendLatches = new(StringComparer.Ordinal);
    private SemaphoreSlim? _slots;

    public static string CircuitKey(string providerKey, string family) => $"{providerKey}|{family}";

    public SemaphoreSlim Slots(int max)
    {
        lock (_gate) return _slots ??= new SemaphoreSlim(Math.Max(1, max));
    }

    public bool IsCircuitOpen(string key)
    {
        lock (_gate)
            return _circuits.TryGetValue(key, out var circuit) && circuit.OpenUntil > time.GetUtcNow();
    }

    /// <summary>A null failure is a completed call. After the open period one call is let through; its failure opens the circuit again.</summary>
    public void Report(string key, string? failureClass, AiPlanningOptions options)
    {
        lock (_gate)
        {
            if (failureClass is null)
            {
                _circuits.Remove(key);
                return;
            }
            if (!AiFailureClasses.IsProviderAvailability(failureClass)) return;
            var failures = (_circuits.TryGetValue(key, out var circuit) ? circuit.Failures : 0) + 1;
            var threshold = Math.Max(1, options.CircuitFailureThreshold);
            _circuits[key] = failures >= threshold
                ? (threshold, time.GetUtcNow().AddSeconds(options.CircuitOpenSeconds))
                : (failures, null);
        }
    }

    public bool IsSpendLatched(string providerKey)
    {
        lock (_gate)
            return _spendLatches.TryGetValue(providerKey, out var until) && until > time.GetUtcNow();
    }

    public void LatchSpend(string providerKey, int minutes)
    {
        lock (_gate) _spendLatches[providerKey] = time.GetUtcNow().AddMinutes(Math.Max(1, minutes));
    }
}

/// <summary>
/// Writes an audit line whenever a kill switch changes. The actor is the configuration source:
/// switches are changed by whoever changes configuration, never through the application.
/// </summary>
public sealed class AiSwitchAudit(IOptionsMonitor<AiOptions> options, TimeProvider time, ILogger<AiSwitchAudit> logger)
    : IHostedService
{
    private IDisposable? _subscription;
    private Dictionary<string, bool> _known = [];

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _known = Switches(options.CurrentValue);
        foreach (var (scope, active) in _known.Where(x => x.Value))
            logger.LogWarning("AI_KILL_SWITCH_ACTIVE. Scope: {Scope}, Active: {Active}, At: {At}", scope, active,
                time.GetUtcNow());
        _subscription = options.OnChange(Audit);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _subscription?.Dispose();
        return Task.CompletedTask;
    }

    private void Audit(AiOptions current)
    {
        var next = Switches(current);
        lock (this)
        {
            foreach (var (scope, active) in next)
                if (_known.GetValueOrDefault(scope) != active)
                    logger.LogWarning(
                        "AI_KILL_SWITCH_CHANGED. Scope: {Scope}, Active: {Active}, Actor: {Actor}, Reason: {Reason}, At: {At}",
                        scope, active, "CONFIGURATION", "CONFIGURATION_CHANGE", time.GetUtcNow());
            _known = next;
        }
    }

    private static Dictionary<string, bool> Switches(AiOptions value)
    {
        var switches = new Dictionary<string, bool>(StringComparer.Ordinal)
        {
            ["GLOBAL"] = value.GlobalKillSwitch,
            ["PLANNING"] = value.Planning.KillSwitch,
            ["PLANNING_RETRY"] = !value.Planning.RetryEnabled
        };
        foreach (var (key, provider) in value.Providers) switches[$"PROVIDER:{key}"] = provider.Disabled;
        return switches;
    }
}
