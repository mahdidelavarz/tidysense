namespace TidySense.Common.Exceptions;

public sealed class ResourceNotFoundException(string resourceName, object resourceId)
    : Exception($"{resourceName} with id '{resourceId}' was not found.");
