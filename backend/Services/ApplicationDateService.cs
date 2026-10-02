using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Models;

namespace TidySense.Services;

public sealed class ApplicationDateService(IOptions<ApplicationTimeOptions> options, TimeProvider timeProvider)
{
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId);

    public DateTimeOffset UtcNow => timeProvider.GetUtcNow();

    public string TimeZoneId => _timeZone.Id;

    public DateOnly Today => LocalNow.Date;

    /// <summary>The local calendar date and wall-clock time, read from one instant.</summary>
    public (DateOnly Date, TimeOnly Time) LocalNow
    {
        get
        {
            var local = TimeZoneInfo.ConvertTime(UtcNow, _timeZone).DateTime;
            return (DateOnly.FromDateTime(local), TimeOnly.FromDateTime(local));
        }
    }

    public (DateOnly Date, string Source) InitialReview(DateOnly? targetDate, DateOnly? requested, int days)
    {
        if (requested is not null) return (requested.Value, ReviewDateSources.User);
        return (targetDate ?? Today.AddDays(days), ReviewDateSources.SystemDefault);
    }

    /// <summary>
    /// The review snapshot stored when a review keeps the entity active: the requested date, or
    /// the default interval capped by a target date that is still in the future.
    /// </summary>
    public (DateOnly Date, string Source) NextReview(DateOnly? targetDate, DateOnly? requested, int days)
    {
        var today = Today;
        if (requested is { } date)
        {
            if (date <= today) throw new ArgumentException("reviewDate must be in the future.");
            return (date, ReviewDateSources.User);
        }
        var next = today.AddDays(days);
        return (targetDate is { } target && target > today && target < next ? target : next,
            ReviewDateSources.SystemDefault);
    }

    public DateOnly LocalDateOf(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, _timeZone).DateTime);
}
