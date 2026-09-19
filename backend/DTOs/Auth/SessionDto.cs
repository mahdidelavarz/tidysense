namespace TidySense.DTOs.Auth;

public class SessionDto
{
    public long Id { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public bool IsCurrent { get; set; }
}