using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TidySense.Common.Exceptions;

namespace TidySense.Services.Sms;

public sealed class IppanelSmsSender : ISmsSender
{
    private readonly HttpClient _httpClient;
    private readonly IppanelProperties _properties;

    public IppanelSmsSender(
        HttpClient httpClient,
        IOptions<IppanelProperties> options)
    {
        _httpClient = httpClient;
        _properties = options.Value;
    }

    public async Task SendAsync(
        string phoneNumber,
        string message,
        CancellationToken cancellationToken = default)
    {
        var request = new IppanelSendRequest
        {
            SendingType = "pattern",
            FromNumber = _properties.FromNumber,
            Code = _properties.PatternCode,
            Recipients = [phoneNumber],
            Params = new IppanelParams
            {
                Otp = message
            }
        };

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            _properties.ApiUrl)
        {
            Content = JsonContent.Create(request)
        };

        if (!string.IsNullOrWhiteSpace(_properties.ApiKey))
        {
            httpRequest.Headers.TryAddWithoutValidation(
                "Authorization",
                _properties.ApiKey);
        }

        try
        {
            using var response = await _httpClient.SendAsync(
                httpRequest,
                cancellationToken);

            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new SmsSendException(
                "SMS sending failed.",
                ex);
        }
    }
}