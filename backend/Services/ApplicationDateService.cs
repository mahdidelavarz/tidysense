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
}
