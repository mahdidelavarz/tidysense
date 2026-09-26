using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace TidySense.Common.Errors;

public static class ApiProblem
{
    public static ProblemDetails Create(HttpContext context, int status, string code, string title,
        string? detail = null)
    {
        var problem = new ProblemDetails
        {
            Type = $"https://tidysense.local/problems/{code.ToLowerInvariant().Replace('_', '-')}",
            Title = title,
            Status = status,
            Detail = detail
        };
        problem.Extensions["code"] = code;
        problem.Extensions["messageKey"] = code;
        problem.Extensions["retryable"] = status is 429 or 503;
        problem.Extensions["traceId"] = context.TraceIdentifier;
        problem.Extensions["correlationId"] = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
        return problem;
    }

    public static Task WriteAsync(HttpContext context, int status, string code, string title,
        string? detail = null)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(
            Create(context, status, code, title, detail), new JsonSerializerOptions(JsonSerializerDefaults.Web)));
    }
}
