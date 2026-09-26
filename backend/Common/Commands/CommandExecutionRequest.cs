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
    DateTimeOffset OccurredAt);
