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
        var phones = access.ExcludedPhones();
        var excluded = await db.Users.AsNoTracking().Where(x => phones.Contains(x.PhoneNumber))
            .Select(x => x.Id).ToArrayAsync(cancellationToken);
        var now = dates.UtcNow;
        return new OperationsMetricsDto(PilotMetricCatalog.Version, from, to,
            await PopulationAsync(false), await PopulationAsync(true),
            PilotMetricCatalog.External.Select(x => new ExternalMetricDto(x.Id, x.Hypothesis, x.Instrument)).ToArray());

        async Task<MetricResultDto[]> PopulationAsync(bool internalAccounts)
        {
            var results = new List<MetricResultDto>();
            foreach (var metric in PilotMetricCatalog.Metrics)
            {
                var rows = await db.Database.SqlQueryRaw<MetricRowDto>(metric.Sql,
                    new NpgsqlParameter("from", from.ToUniversalTime()),
                    new NpgsqlParameter("to", to.ToUniversalTime()),
                    new NpgsqlParameter("excluded", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = excluded },
                    new NpgsqlParameter("internal", internalAccounts),
                    new NpgsqlParameter("now", now.ToUniversalTime())).ToListAsync(cancellationToken);
                results.Add(new MetricResultDto(metric.Id, metric.DefinitionVersion, metric.Hypothesis,
                    metric.MetricClass, metric.Numerator, metric.Denominator, rows));
            }
            return results.ToArray();
        }
    }
}
