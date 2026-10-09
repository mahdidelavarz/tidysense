using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Data;
using TidySense.DTOs.Operations;
using TidySense.Models;

namespace TidySense.Services.Operations;

/// <summary>Delivers the digest outside the application. The message holds rule names and counts only.</summary>
public interface IAlertDigestSender
{
    Task SendAsync(string subject, string body, CancellationToken cancellationToken);
}

public sealed class SmtpAlertDigestSender(IOptionsMonitor<OperationsOptions> options) : IAlertDigestSender
{
    public async Task SendAsync(string subject, string body, CancellationToken cancellationToken)
    {
        var settings = options.CurrentValue.AlertDigest;
        using var client = new SmtpClient(settings.SmtpHost, settings.SmtpPort) { EnableSsl = settings.SmtpTls };
        if (!string.IsNullOrEmpty(settings.SmtpUser))
            client.Credentials = new NetworkCredential(settings.SmtpUser, settings.SmtpPassword);
        using var message = new MailMessage(settings.From, settings.To, subject, body);
        await client.SendMailAsync(message, cancellationToken);
    }
}

public sealed record AlertDigestRun(DateTimeOffset At, string Outcome, IReadOnlyList<OperationsAlertDto> Alerts);

public sealed record AlertDigestMessage(string Subject, string Body, int AlertCount);

/// <summary>
/// The daily alert e-mail: what the hourly maintenance runs of the last day raised, and what is
/// active now. It is sent once per UTC day, also when nothing was raised, and each send is
/// recorded. The application runs as one instance, so no two processes compete for a day.
/// </summary>
public sealed class OperationsAlertDigest(
    AppDbContext db,
    ApplicationDateService dates,
    IOptionsMonitor<OperationsOptions> options,
    OperationsHealthService health,
    IAlertDigestSender sender,
    ILogger<OperationsAlertDigest> logger)
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // A failed send is tried again, but not on every tick.
    private static readonly TimeSpan RetryAfter = TimeSpan.FromHours(1);

    /// <summary>Sends today's digest when it is due. Returns whether a send was attempted.</summary>
    public async Task<bool> RunDueAsync(CancellationToken cancellationToken)
    {
        var settings = options.CurrentValue.AlertDigest;
        var now = dates.UtcNow;
        if (!settings.Enabled || now.Hour < settings.HourUtc) return false;
        var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var last = await db.OperationsRecords.AsNoTracking()
            .Where(x => x.Kind == OperationsRecordKinds.AlertDigest && x.CreatedAt >= dayStart)
            .OrderByDescending(x => x.CreatedAt).Select(x => new { x.CreatedAt, x.Outcome })
            .FirstOrDefaultAsync(cancellationToken);
        if (last is not null &&
            (last.Outcome == OperationsRecordOutcomes.Succeeded || now - last.CreatedAt < RetryAfter)) return false;

        var since = now.AddHours(-24);
        var stored = await db.OperationsRecords.AsNoTracking()
            .Where(x => x.Kind == OperationsRecordKinds.MaintenanceRun && x.CreatedAt >= since)
            .OrderBy(x => x.CreatedAt).Select(x => new { x.CreatedAt, x.Outcome, x.DetailsJson })
            .ToListAsync(cancellationToken);
        var runs = stored.Select(x => new AlertDigestRun(x.CreatedAt, x.Outcome, Alerts(x.DetailsJson))).ToArray();
        var message = Build(now, runs, (await health.HealthAsync(cancellationToken)).Alerts);

        var record = new OperationsRecord
        {
            Id = Guid.NewGuid(), Kind = OperationsRecordKinds.AlertDigest, CreatedAt = now,
            DetailsJson = JsonSerializer.Serialize(new { alerts = message.AlertCount, runs = runs.Length })
        };
        try
        {
            await sender.SendAsync(message.Subject, message.Body, cancellationToken);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError("Alert digest could not be sent. ExceptionType: {ExceptionType}", exception.GetType().Name);
            record.Outcome = OperationsRecordOutcomes.Failed;
            record.DetailsJson = JsonSerializer.Serialize(new { exceptionType = exception.GetType().Name });
        }
        db.OperationsRecords.Add(record);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>Pure: the same runs and active alerts always give the same message.</summary>
    public static AlertDigestMessage Build(DateTimeOffset now, IReadOnlyList<AlertDigestRun> runs,
        IReadOnlyList<OperationsAlertDto> active)
    {
        var raised = runs.SelectMany(run => run.Alerts.Select(alert => (run.At, Alert: alert)))
            .GroupBy(x => (x.Alert.Rule, x.Alert.Severity, x.Alert.Scope))
            .OrderByDescending(x => x.Key.Severity == OperationsAlertSeverities.Critical)
            .ThenBy(x => x.Key.Rule, StringComparer.Ordinal).ThenBy(x => x.Key.Scope, StringComparer.Ordinal)
            .ToArray();
        var failedRuns = runs.Count(x => x.Outcome == OperationsRecordOutcomes.Failed);
        // An alert that is active now but was raised by no run (a switch set minutes ago) still counts.
        var activeOnly = active.Where(x => !raised.Any(r => r.Key.Rule == x.Rule && r.Key.Scope == x.Scope)).ToArray();
        var count = raised.Length + activeOnly.Length;
        var critical = raised.Count(x => x.Key.Severity == OperationsAlertSeverities.Critical) +
            activeOnly.Count(x => x.Severity == OperationsAlertSeverities.Critical) + (failedRuns > 0 ? 1 : 0);

        var body = new StringBuilder();
        body.AppendLine($"TidySense alert digest, {now:yyyy-MM-dd HH:mm} UTC, last 24 hours.");
        body.AppendLine($"Maintenance runs: {runs.Count} (failed: {failedRuns}). About 24 are expected.");
        body.AppendLine();
        if (count == 0) body.AppendLine("No alert was raised and none is active.");
        foreach (var group in raised)
        {
            var latest = group.OrderByDescending(x => x.At).First();
            body.AppendLine($"{group.Key.Severity} {group.Key.Rule} [{group.Key.Scope}]: raised in {group.Count()} of " +
                $"{runs.Count} runs, last {latest.At:HH:mm} UTC, value {latest.Alert.Value}, threshold {latest.Alert.Threshold}" +
                (active.Any(x => x.Rule == group.Key.Rule && x.Scope == group.Key.Scope) ? ", ACTIVE NOW" : ", cleared"));
        }
        foreach (var alert in activeOnly)
            body.AppendLine($"{alert.Severity} {alert.Rule} [{alert.Scope}]: ACTIVE NOW, not yet seen by a run, " +
                $"value {alert.Value}, threshold {alert.Threshold}");
        body.AppendLine();
        body.AppendLine("Responses: devmap/operations/runbooks.md. This message is sent every day; a day without it means the backend or the mail path is down.");
        var subject = count == 0 && failedRuns == 0
            ? "[TidySense] no alerts in the last 24 h"
            : $"[TidySense] {count} alert(s) in the last 24 h" + (critical > 0 ? $", {critical} critical" : string.Empty);
        return new AlertDigestMessage(subject, body.ToString(), count);
    }

    private static IReadOnlyList<OperationsAlertDto> Alerts(string detailsJson)
    {
        using var document = JsonDocument.Parse(detailsJson);
        return document.RootElement.TryGetProperty("alerts", out var alerts) && alerts.ValueKind == JsonValueKind.Array
            ? alerts.Deserialize<OperationsAlertDto[]>(Json) ?? []
            : [];
    }
}

/// <summary>Checks every fifteen minutes whether today's digest is due.</summary>
public sealed class OperationsAlertDigestService(
    IServiceScopeFactory scopes,
    ILogger<OperationsAlertDigestService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // After the first maintenance run of this process, so a fresh start reports itself.
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    await scope.ServiceProvider.GetRequiredService<OperationsAlertDigest>().RunDueAsync(stoppingToken);
                }
                catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError("Alert digest failed. ExceptionType: {ExceptionType}", exception.GetType().Name);
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // The host is stopping.
        }
    }
}
