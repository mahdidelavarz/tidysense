namespace TidySense.Models;

/// <summary>
/// A server-generated, version-bound preview of one deterministic command: a Reconcile action or
/// the application of one planning draft revision. The client submits only its identity and
/// warning acknowledgements; the server re-derives everything else.
/// </summary>
public sealed class ActionConfirmation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ReconcileSessionId { get; set; }
    public Guid? PlanningDraftId { get; set; }
    public int? PlanningDraftRevision { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string RequestJson { get; set; } = "{}";
    public string PreviewJson { get; set; } = "{}";
    public string PreviewHash { get; set; } = string.Empty;
    public string Status { get; set; } = ActionConfirmationStatuses.Created;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public string RetentionClass { get; set; } = "R2";
    public ReconcileSession? Session { get; set; }
}

public static class ActionConfirmationStatuses
{
    public const string Created = "CREATED";
    public const string Submitted = "SUBMITTED";
    public const string Resolved = "RESOLVED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}
