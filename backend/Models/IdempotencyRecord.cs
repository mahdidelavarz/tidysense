namespace TidySense.Models;

public sealed class IdempotencyRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string CommandType { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public string Status { get; set; } = "IN_PROGRESS";
    public Guid? ResultId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public string RetentionClass { get; set; } = "R4";
}
