namespace TidySense.Common.Commands;

public sealed class CommandConflictException(string errorCode, string message)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}
