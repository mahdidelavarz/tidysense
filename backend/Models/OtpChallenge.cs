namespace TidySense.Models;

public sealed class OtpChallenge
{
    public Guid Id { get; set; }
    public string NormalizedPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = "LOGIN";
    public string CodeDigest { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
}
