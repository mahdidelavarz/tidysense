namespace TidySense.Common.Commands;

public sealed class CommandRejectedException()
    : Exception("The command is not valid for the current resource state.");
