using Microsoft.Extensions.Options;
using TidySense.Common.Exceptions;
using TidySense.Services;
using System.Text.Json;

namespace TidySense.Infrastructure.Sms;

/// <summary>
/// Sends the login code through Kavenegar. With a verification template configured it uses
/// Verify Lookup (<c>verify/lookup.json</c>): the provider owns the approved message text and
/// the code is its <c>token</c>, which is how Kavenegar delivers one-time codes on its fast
/// line. Without a template it falls back to a plain message from the configured sender line.
/// </summary>
public sealed class KavenegarSmsSender(HttpClient httpClient, IOptions<KavenegarOptions> options) : ISmsSender
{
    public async Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var useTemplate = !string.IsNullOrWhiteSpace(settings.Template);
        if (string.IsNullOrWhiteSpace(settings.ApiKey) ||
            (!useTemplate && string.IsNullOrWhiteSpace(settings.Sender)))
            throw new InvalidOperationException("Kavenegar configuration must be supplied externally.");

        var receptor = phoneNumber.StartsWith("+98") ? "0" + phoneNumber[3..] : phoneNumber;
        var root = $"{settings.ApiBaseUrl.TrimEnd('/')}/v1/{Uri.EscapeDataString(settings.ApiKey)}";
        var uri = useTemplate ? $"{root}/verify/lookup.json" : $"{root}/sms/send.json";
        using var content = new FormUrlEncodedContent(useTemplate
            ? new Dictionary<string, string>
            {
                // The token may hold no space or separator; the code is digits only.
                ["receptor"] = receptor, ["token"] = message, ["template"] = settings.Template.Trim()
            }
            : new Dictionary<string, string>
            {
                ["receptor"] = receptor, ["sender"] = settings.Sender, ["message"] = message
            });
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(settings.TimeoutSeconds));
        try
        {
            // Kavenegar reports its own status inside the body, also when the HTTP status is an error
            // (for example 424: the template does not exist or is not approved yet).
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
