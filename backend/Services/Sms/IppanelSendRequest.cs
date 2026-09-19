using System.Text.Json.Serialization;

namespace TidySense.Services.Sms;

public sealed class IppanelSendRequest
{
    [JsonPropertyName("sending_type")]
    public required string SendingType { get; init; }

    [JsonPropertyName("from_number")]
    public required string FromNumber { get; init; }

    public required string Code { get; init; }

    public required List<string> Recipients { get; init; }

    public required IppanelParams Params { get; init; }
}

public sealed class IppanelParams
{
    public required string Otp { get; init; }
}