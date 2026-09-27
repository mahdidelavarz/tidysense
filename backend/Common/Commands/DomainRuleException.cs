namespace TidySense.Common.Commands;

public sealed class DomainRuleException(string errorCode, string message)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}
