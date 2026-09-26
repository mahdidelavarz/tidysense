using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using TidySense.Common.Auth;
using TidySense.Common.Errors;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.Infrastructure.Health;
using TidySense.Infrastructure.Sms;
using TidySense.Services;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var value in builder.Configuration.GetSection("Security:KnownProxies").Get<string[]>() ?? [])
        options.KnownProxies.Add(IPAddress.Parse(value));
});

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var problem = ApiProblem.Create(context.HttpContext, 400, "VALIDATION_FAILED", "Invalid request");
        problem.Extensions["errors"] = context.ModelState.Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
        return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
    };
});
builder.Services.AddCors(options => options.AddPolicy("Browser", policy =>
{
    var origins = builder.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>() ?? [];
    policy.WithOrigins(origins).WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
        .AllowAnyHeader().AllowCredentials();
}));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<EventPayloadValidator>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgresql");

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<KavenegarOptions>()
    .Bind(builder.Configuration.GetSection(KavenegarOptions.SectionName));
builder.Services.AddOptions<ApplicationTimeOptions>()
    .Bind(builder.Configuration.GetSection(ApplicationTimeOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<OtpOptions>()
    .Bind(builder.Configuration.GetSection(OtpOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((options, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        options.Events = JwtCookieEvents.Create();
    });

builder.Services.AddAuthorization();
builder.Services.AddOpenApi("v1", options =>
{
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_0;
});

builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddHostedService<OtpRateCleanupService>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<CommandExecutionService>();
if (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddSingleton<DevelopmentSmsSender>();
    builder.Services.AddSingleton<ISmsSender>(sp => sp.GetRequiredService<DevelopmentSmsSender>());
}
else
{
    builder.Services.AddSingleton<HttpClient>();
    builder.Services.AddSingleton<ISmsSender, KavenegarSmsSender>();
}

var app = builder.Build();
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing") &&
    (app.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>()?.Length ?? 0) == 0)
    throw new InvalidOperationException("Security:AllowedOrigins must be configured in production.");
if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("Database:MigrateOnStart"))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseExceptionHandler();
app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseCors("Browser");
app.UseMiddleware<ApiRequestSecurityMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health/ready").AllowAnonymous();
app.MapGet("/health/live", () => Results.Ok(new { status = "Healthy" })).AllowAnonymous();
app.MapOpenApi("/openapi/{documentName}.json");
app.MapControllers();
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapGet("/api/v1/dev/otp/latest", (HttpContext context, string phoneNumber, DevelopmentSmsSender sender) =>
    {
        if (!IPAddress.IsLoopback(context.Connection.RemoteIpAddress ?? IPAddress.None) &&
            !app.Environment.IsEnvironment("Testing")) return Results.NotFound();
        try
        {
            var code = sender.Latest(UserService.NormalizeIranianMobile(phoneNumber));
            return code is null ? Results.NotFound() : Results.Ok(new { code });
        }
        catch (ArgumentException) { return Results.NotFound(); }
    }).ExcludeFromDescription();
    app.MapPost("/api/v1/dev/test-session", async (HttpContext context, AppDbContext db,
        JwtTokenService tokens, IOptions<JwtOptions> jwtOptions) =>
    {
        if (!IPAddress.IsLoopback(context.Connection.RemoteIpAddress ?? IPAddress.None) &&
            !app.Environment.IsEnvironment("Testing")) return Results.NotFound();
        const string phone = "+989120000000";
        var user = await db.Users.SingleOrDefaultAsync(x => x.PhoneNumber == phone);
        if (user is null)
        {
            user = new TidySense.Models.User
            {
                Id = Guid.NewGuid(), PhoneNumber = phone, IsActive = true,
                SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        context.Response.Cookies.Append(jwtOptions.Value.CookieName, tokens.Create(user), new CookieOptions
        {
            HttpOnly = true, Secure = !app.Environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax, Path = "/", IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddMinutes(jwtOptions.Value.LifetimeMinutes)
        });
        return Results.Ok(AuthService.ToDto(user));
    }).ExcludeFromDescription();
}

app.Run();

public partial class Program;
