namespace TidySense.Models;

public sealed class OutboxMessage
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Status { get; set; } = "PENDING";
    public int AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public string RetentionClass { get; set; } = "R4";
}
