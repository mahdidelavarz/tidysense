namespace TidySense.Models;

public class OtpChallenge
{
    public long Id { get; set; }

    public int UserId { get; set; }

    public string CodeHash { get; set; } = null!;

    public int FailedAttempts { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? ConsumedAt { get; set; }

    public User User { get; set; } = null!;
}