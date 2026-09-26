namespace TidySense.Infrastructure.Sms;

public sealed class KavenegarOptions
{
    public const string SectionName = "Kavenegar";
    public string ApiBaseUrl { get; init; } = "https://api.kavenegar.com";
    public string ApiKey { get; init; } = string.Empty;
    public string Sender { get; init; } = string.Empty;
    public string Template { get; init; } = string.Empty;
    public int TimeoutSeconds { get; init; } = 5;
}
