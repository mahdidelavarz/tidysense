using Microsoft.EntityFrameworkCore;
using TidySense.Data;

namespace TidySense.Services;

public sealed class OtpRateCleanupService(IServiceScopeFactory scopes, ILogger<OtpRateCleanupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.OtpRateEvents.Where(x => x.CreatedAt < DateTimeOffset.UtcNow.AddDays(-1))
                    .ExecuteDeleteAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(exception, "OTP rate event cleanup failed.");
            }
        }
    }
}
