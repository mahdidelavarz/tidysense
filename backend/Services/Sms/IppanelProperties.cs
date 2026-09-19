namespace TidySense.Services.Sms;

public sealed class IppanelProperties
{
    public const string SectionName = "Sms:Ippanel";

    public string ApiUrl { get; init; } = null!;

    public string ApiKey { get; init; } = null!;

    public string FromNumber { get; init; } = null!;

    public string PatternCode { get; init; } = null!;
}