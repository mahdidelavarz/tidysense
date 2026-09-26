using TidySense.Common.Errors;

namespace TidySense.Common.Auth;

public sealed class ApiRequestSecurityMiddleware(RequestDelegate next, IConfiguration configuration, IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (!request.Path.StartsWithSegments("/api/v1") ||
            request.Method is "GET" or "HEAD" or "OPTIONS")
        {
            await next(context);
            return;
        }

        if (!string.Equals(request.ContentType?.Split(';')[0].Trim(), "application/json",
                StringComparison.OrdinalIgnoreCase))
        {
            await RejectAsync(context, 415, "UNSUPPORTED_MEDIA_TYPE");
            return;
        }

        var allowed = configuration.GetSection("Security:AllowedOrigins").Get<string[]>() ?? [];
        var sameOrigin = $"{request.Scheme}://{request.Host}";
        var origin = request.Headers.Origin.ToString();
        var referer = request.Headers.Referer.ToString();
        var originValid = string.IsNullOrEmpty(origin) || IsAllowed(origin);
        var refererValid = string.IsNullOrEmpty(referer) ||
            (Uri.TryCreate(referer, UriKind.Absolute, out var uri) && IsAllowed(uri.GetLeftPart(UriPartial.Authority)));
        if ((!originValid || !refererValid) || (string.IsNullOrEmpty(origin) && string.IsNullOrEmpty(referer)))
        {
            await RejectAsync(context, 403, "FORBIDDEN");
            return;
        }
        await next(context);

        bool IsAllowed(string value) =>
            ((environment.IsDevelopment() || environment.IsEnvironment("Testing")) &&
                string.Equals(value, sameOrigin, StringComparison.OrdinalIgnoreCase)) ||
            allowed.Any(x => string.Equals(x.TrimEnd('/'), value, StringComparison.OrdinalIgnoreCase));
    }

    private static Task RejectAsync(HttpContext context, int status, string code)
    {
        return ApiProblem.WriteAsync(context, status, code,
            status == 415 ? "JSON content required" : "Request origin is not allowed");
    }
}
