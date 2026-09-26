namespace TidySense.Common.Errors;

// OpenAPI shape for the RFC 9457 response written by ApiProblem and ApiExceptionHandler.
public sealed record ApiProblemDto(
    string Type,
    string Title,
    int Status,
    string Code,
    string MessageKey,
    bool Retryable,
    string TraceId,
    string CorrelationId,
    string? Detail,
    IReadOnlyDictionary<string, string[]>? Errors,
    Guid? EntityId,
    long? ExpectedVersion,
    long? CurrentVersion);
