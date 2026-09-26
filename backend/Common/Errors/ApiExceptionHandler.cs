using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Commands;
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
            OtpRateLimitException => (StatusCodes.Status429TooManyRequests, "RATE_LIMITED", "Too many requests"),
            SmsSendException => (StatusCodes.Status503ServiceUnavailable, "DELIVERY_UNAVAILABLE", "Verification is temporarily unavailable"),
            VersionConflictException => (StatusCodes.Status409Conflict, "CONFLICT_STALE_VERSION", "The resource changed"),
            IdempotencyMismatchException => (StatusCodes.Status409Conflict, "IDEMPOTENCY_MISMATCH", "Idempotency key conflict"),
            CommandRejectedException => (StatusCodes.Status422UnprocessableEntity, "DOMAIN_RULE_VIOLATION", "Command is not valid"),
            ArgumentException => (StatusCodes.Status400BadRequest, "VALIDATION_FAILED", "Invalid request"),
            _ => (StatusCodes.Status500InternalServerError, ErrorCodes.UnexpectedError, "An unexpected error occurred")
        };

        if (status == 500)
            logger.LogError("Unhandled request failure. ExceptionType: {ExceptionType}, TraceId: {TraceId}",
                exception.GetType().Name, context.TraceIdentifier);

        context.Response.StatusCode = status;
        var problem = ApiProblem.Create(context, status, code, title,
            status == 500 ? "The request could not be completed." : exception.Message);
        if (exception is VersionConflictException conflict)
        {
            problem.Extensions["entityId"] = conflict.EntityId;
            problem.Extensions["expectedVersion"] = conflict.ExpectedVersion;
            problem.Extensions["currentVersion"] = conflict.CurrentVersion;
        }
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception
        });
    }
}
