namespace TidySense.Common.Commands;

public sealed class CommandRejectedException(
    string errorCode = "DOMAIN_RULE_VIOLATION",
    string message = "The command is not valid for the current resource state.")
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}
