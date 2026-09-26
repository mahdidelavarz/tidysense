namespace TidySense.Models;

public sealed class CommandResult
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid IdempotencyRecordId { get; set; }
    public string CommandType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AggregateType { get; set; }
    public Guid? AggregateId { get; set; }
    public long? AggregateVersion { get; set; }
    public long? ExpectedVersion { get; set; }
    public string? ErrorCode { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string RetentionClass { get; set; } = "R1";
}
