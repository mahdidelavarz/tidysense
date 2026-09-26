namespace TidySense.Models;

public sealed class DomainEvent
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int EventVersion { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
    public Guid UserId { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string AggregateType { get; set; } = string.Empty;
    public Guid AggregateId { get; set; }
    public long AggregateVersion { get; set; }
    public Guid TransactionId { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public Guid? CausationId { get; set; }
    public Guid? CommandResultId { get; set; }
    public Guid? ProposalId { get; set; }
    public Guid? ConfirmationId { get; set; }
    public Guid? ReconcileSessionId { get; set; }
    public string? RuleId { get; set; }
    public string? RuleVersion { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public string RetentionClass { get; set; } = "R1";
}
