using Microsoft.Extensions.Options;
using TidySense.Common.Exceptions;
using TidySense.Services;
using System.Text.Json;

namespace TidySense.Infrastructure.Sms;

public sealed class KavenegarSmsSender(HttpClient httpClient, IOptions<KavenegarOptions> options) : ISmsSender
{
    public async Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey) || string.IsNullOrWhiteSpace(settings.Sender))
            throw new InvalidOperationException("Kavenegar configuration must be supplied externally.");

        var uri = $"{settings.ApiBaseUrl.TrimEnd('/')}/v1/{Uri.EscapeDataString(settings.ApiKey)}/sms/send.json";
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["receptor"] = phoneNumber.StartsWith("+98") ? "0" + phoneNumber[3..] : phoneNumber,
            ["sender"] = settings.Sender,
            ["message"] = message
        });
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(settings.TimeoutSeconds));
        try
        {
            using var response = await httpClient.PostAsync(uri, content, timeout.Token);
            if (!response.IsSuccessStatusCode)
                throw new SmsSendException("Verification is temporarily unavailable.");
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(timeout.Token),
                cancellationToken: timeout.Token);
            if (!json.RootElement.TryGetProperty("return", out var result) ||
                !result.TryGetProperty("status", out var status) || status.GetInt32() != 200)
                throw new SmsSendException("Verification is temporarily unavailable.");
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            throw new SmsSendException("Verification is temporarily unavailable.");
        }
    }
}
