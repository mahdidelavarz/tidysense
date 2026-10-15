using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using TidySense.Data;
using TidySense.DTOs.Operations;

namespace TidySense.Services.Operations;

/// <summary>
/// Runs the metric dictionary. Every number is reproducible: the same catalog version over the
/// same records and window returns the same numerators and denominators.
/// </summary>
public sealed class PilotMetricsService(AppDbContext db, ApplicationDateService dates, OperatorAccess access)
{
    public async Task<OperationsMetricsDto> ComputeAsync(DateTimeOffset from, DateTimeOffset to,
        CancellationToken cancellationToken)
    {
        var excluded = await MetricQuery.ExcludedAsync(db, access, cancellationToken);
        var now = dates.UtcNow;
        return new OperationsMetricsDto(PilotMetricCatalog.Version, from, to,
            await PopulationAsync(false), await PopulationAsync(true),
            PilotMetricCatalog.External.Select(x => new ExternalMetricDto(x.Id, x.Hypothesis, x.Instrument)).ToArray());

        Task<MetricResultDto[]> PopulationAsync(bool internalAccounts) => MetricQuery.RunAsync(db,
            PilotMetricCatalog.Metrics, new MetricWindow(from, to, now, excluded, internalAccounts), cancellationToken);
    }
}

/// <summary>The window and population a catalog runs over: <c>@from</c>, <c>@to</c>, <c>@now</c>, <c>@excluded</c>, <c>@internal</c>.</summary>
public sealed record MetricWindow(DateTimeOffset From, DateTimeOffset To, DateTimeOffset Now, Guid[] Excluded, bool Internal);

/// <summary>Runs versioned metric definitions; shared by every catalog so each figure is computed the same way.</summary>
public static class MetricQuery
{
    /// <summary>The internal accounts (027 §10): operators, team members and test accounts.</summary>
    public static Task<Guid[]> ExcludedAsync(AppDbContext db, OperatorAccess access, CancellationToken cancellationToken)
    {
        var phones = access.ExcludedPhones();
        return db.Users.AsNoTracking().Where(x => phones.Contains(x.PhoneNumber)).Select(x => x.Id)
            .ToArrayAsync(cancellationToken);
    }

    public static async Task<MetricResultDto[]> RunAsync(AppDbContext db, IEnumerable<PilotMetric> metrics,
        MetricWindow window, CancellationToken cancellationToken)
    {
        var results = new List<MetricResultDto>();
        foreach (var metric in metrics)
        {
            var rows = await db.Database.SqlQueryRaw<MetricRowDto>(metric.Sql,
                new NpgsqlParameter("from", window.From.ToUniversalTime()),
                new NpgsqlParameter("to", window.To.ToUniversalTime()),
                new NpgsqlParameter("excluded", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = window.Excluded },
                new NpgsqlParameter("internal", window.Internal),
                new NpgsqlParameter("now", window.Now.ToUniversalTime())).ToListAsync(cancellationToken);
            results.Add(new MetricResultDto(metric.Id, metric.DefinitionVersion, metric.Hypothesis,
                metric.MetricClass, metric.Numerator, metric.Denominator, rows));
        }
        return results.ToArray();
    }
}
