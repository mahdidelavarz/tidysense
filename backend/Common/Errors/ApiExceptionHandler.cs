using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Exceptions;

namespace TidySense.Common.Errors;

public sealed class ApiExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (status, code, title) = exception switch
        {
            ResourceNotFoundException => (StatusCodes.Status404NotFound, ErrorCodes.ResourceNotFound, "Resource not found"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, ErrorCodes.AuthenticationRequired, "Authentication required"),
            _ => (StatusCodes.Status500InternalServerError, ErrorCodes.UnexpectedError, "An unexpected error occurred")
        };

        if (status == 500) logger.LogError(exception, "Unhandled request failure. TraceId: {TraceId}", context.TraceIdentifier);

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails
            {
                Type = $"https://tidysense.local/problems/{code.ToLowerInvariant().Replace('_', '-')}",
                Title = title,
                Status = status,
                Detail = status == 500 ? "The request could not be completed." : exception.Message,
                Extensions = { ["code"] = code, ["traceId"] = context.TraceIdentifier }
            },
            Exception = exception
        });
    }
}
