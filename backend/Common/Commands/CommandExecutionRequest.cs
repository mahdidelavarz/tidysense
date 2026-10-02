using System.Security.Cryptography;

namespace TidySense.Common.Commands;

public sealed record CommandExecutionRequest(
    Guid UserId,
    string IdempotencyKey,
    string CommandType,
    string RequestHash,
    DateTimeOffset ExpiresAt,
    string CorrelationId)
{
    public static string HashCanonicalRequest(ReadOnlySpan<byte> canonicalRequest) =>
        Convert.ToHexString(SHA256.HashData(canonicalRequest));
}

public sealed record CommandMutation(
    string AggregateType,
    Guid AggregateId,
    long AggregateVersion,
    string EventType,
    int EventVersion,
    string PayloadJson,
    DateTimeOffset OccurredAt,
    IReadOnlyList<CascadeEvent>? CascadeEvents = null,
    Guid? ConfirmationId = null,
    Guid? ReconcileSessionId = null);

/// <summary>
/// A consequence of the confirmed command on another aggregate, recorded in the same
/// transaction. By default it is deterministic (for example a Routine stopped by its Project's
/// terminal transition). A member the user explicitly confirmed, such as each Task of a bulk
/// Reconcile action, is recorded with actor <see cref="EventActors.User"/> instead.
/// </summary>
public sealed record CascadeEvent(
    string AggregateType,
    Guid AggregateId,
    long AggregateVersion,
    string EventType,
    int EventVersion,
    string PayloadJson,
    string Actor = EventActors.SystemDeterministic);

public static class EventActors
{
    public const string User = "USER";
    public const string SystemDeterministic = "SYSTEM_DETERMINISTIC";
}
