using Microsoft.Extensions.Options;
using TidySense.Common.Exceptions;
using TidySense.Services;

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
            ["receptor"] = phoneNumber,
            ["sender"] = settings.Sender,
            ["message"] = message
        });
        using var response = await httpClient.PostAsync(uri, content, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new SmsSendException("The SMS provider could not accept the message.");
    }
}
