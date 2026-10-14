using Microsoft.EntityFrameworkCore;
using TidySense.Data;
using TidySense.DTOs.Operations;
using TidySense.Models;

namespace TidySense.Services.Operations;

/// <summary>
/// The «سنجش محصول» view (Discussion 027 §5, §10): the product figures over the primary population
/// only, how many internal accounts were left out, and the reasons given with low ratings, which
/// carry no identity.
/// </summary>
public sealed class ProductInsightsService(AppDbContext db, ApplicationDateService dates, OperatorAccess access)
{
    /// <summary>The most recent reasons shown; older ones stay in the record until retention removes them.</summary>
    public const int ReasonLimit = 50;

    public async Task<OperationsInsightsDto> ComputeAsync(DateTimeOffset from, DateTimeOffset to,
        CancellationToken cancellationToken)
    {
        var excluded = await MetricQuery.ExcludedAsync(db, access, cancellationToken);
        var internalAccounts = await db.Users.AsNoTracking()
            .CountAsync(x => excluded.Contains(x.Id) && x.CreatedAt < to, cancellationToken);
        var figures = await MetricQuery.RunAsync(db, ProductInsightCatalog.Figures,
            new MetricWindow(from, to, dates.UtcNow, excluded, false), cancellationToken);
        var reasons = await db.AiResponseFeedback.AsNoTracking()
            .Where(x => x.Outcome == AiResponseFeedbackOutcomes.Answered
                && x.Rating <= AiResponseFeedbackInstrument.ReasonMaxRating
                && x.Reason != null && x.Reason != ""
                && x.ShownAt >= from && x.ShownAt < to && !excluded.Contains(x.UserId))
            .OrderByDescending(x => x.ShownAt).ThenBy(x => x.Id).Take(ReasonLimit)
            .Select(x => new LowRatingReasonDto(x.Surface, x.Rating!.Value, x.ShownOn, x.Reason!))
            .ToArrayAsync(cancellationToken);
        return new OperationsInsightsDto(ProductInsightCatalog.Version, from, to, internalAccounts, figures, reasons);
    }
}
