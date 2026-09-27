using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Models;

namespace TidySense.Services;

public sealed class ApplicationDateService(IOptions<ApplicationTimeOptions> options, TimeProvider timeProvider)
{
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId);

    public DateTimeOffset UtcNow => timeProvider.GetUtcNow();

    public DateOnly Today => DateOnly.FromDateTime(
        TimeZoneInfo.ConvertTime(UtcNow, _timeZone).DateTime);

    public (DateOnly Date, string Source) InitialReview(DateOnly? targetDate, DateOnly? requested, int days)
    {
        if (requested is not null) return (requested.Value, ReviewDateSources.User);
        return (targetDate ?? Today.AddDays(days), ReviewDateSources.SystemDefault);
    }
}
