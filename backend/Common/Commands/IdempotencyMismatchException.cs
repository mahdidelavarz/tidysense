namespace TidySense.Common.Commands;

public sealed class IdempotencyMismatchException()
    : Exception("The idempotency key belongs to a different request.");
