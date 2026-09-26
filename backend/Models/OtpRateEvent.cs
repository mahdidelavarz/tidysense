namespace TidySense.Models;

public sealed class OtpRateEvent
{
    public long Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string KeyDigest { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
