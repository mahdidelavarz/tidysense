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
using TidySense.Infrastructure.Ai;
using TidySense.Infrastructure.Sms;
using TidySense.Services;
using TidySense.Services.Ai;
using TidySense.Services.Operations;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);
// Every request body is a small JSON document; nothing legitimate comes near this limit.
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 256 * 1024);
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
foreach (var schema in ParentEventSchemas.All()) builder.Services.AddSingleton(schema);
foreach (var schema in TaskEventSchemas.All()) builder.Services.AddSingleton(schema);
foreach (var schema in RoutineEventSchemas.All()) builder.Services.AddSingleton(schema);
foreach (var schema in ReconcileEventSchemas.All()) builder.Services.AddSingleton(schema);
foreach (var schema in PlanningEventSchemas.All()) builder.Services.AddSingleton(schema);
foreach (var schema in AccountEventSchemas.All()) builder.Services.AddSingleton(schema);
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
builder.Services.AddScoped<GoalService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<RoutineService>();
builder.Services.AddScoped<TodayService>();
builder.Services.AddScoped<CaptureService>();
builder.Services.AddScoped<ReconcileService>();
builder.Services.AddScoped<ReconcileExplanationService>();
builder.Services.AddScoped<ReconcileExplanationRunner>();
builder.Services.AddSingleton<ReconcileExplanationQueue>();
builder.Services.AddScoped<PlanningService>();
builder.Services.AddScoped<PlanningContextBuilder>();
builder.Services.AddScoped<PlanningAttemptRunner>();
builder.Services.AddSingleton<PlanningAttemptQueue>();
builder.Services.AddSingleton<PlanningAttemptCancellation>();
builder.Services.AddOptions<AiOptions>().Bind(builder.Configuration.GetSection(AiOptions.SectionName));
builder.Services.AddSingleton<AiRuntimeState>();
builder.Services.AddSingleton<IAiInvocationLog, AiInvocationStore>();
builder.Services.AddHostedService<AiSwitchAudit>();
// One plain client for the provider: no resilience handler, so the runtime's single retry is the only one.
builder.Services.AddSingleton<IAiCompletionClient>(services =>
{
    var planning = services.GetRequiredService<IOptions<AiOptions>>().Value.Planning;
    return new OpenAiCompatibleChatClient(new HttpClient(new SocketsHttpHandler
    {
        ConnectTimeout = TimeSpan.FromSeconds(planning.ConnectionTimeoutSeconds),
        AllowAutoRedirect = false
    }) { Timeout = Timeout.InfiniteTimeSpan }, services.GetRequiredService<IOptionsMonitor<AiOptions>>());
});
// "mock" keeps the deterministic generator; any other value names a configured provider.
var planningProvider = builder.Configuration[$"{AiOptions.SectionName}:Planning:Provider"];
if (string.IsNullOrWhiteSpace(planningProvider) ||
    planningProvider.Equals(AiPlanningOptions.MockProvider, StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IPlanningGenerator, DeterministicPlanningGenerator>();
else
    builder.Services.AddSingleton<IPlanningGenerator, AiPlanningGenerator>();
builder.Services.AddSingleton<AiConsentPolicy>();
builder.Services.AddScoped<AiConsentService>();
builder.Services.AddHostedService<PlanningAttemptWorker>();
// The Reconcile explanation is selected the same way and independently of planning.
var reconcileProvider = builder.Configuration[$"{AiOptions.SectionName}:Reconcile:Provider"];
if (string.IsNullOrWhiteSpace(reconcileProvider) ||
    reconcileProvider.Equals(AiFamilyOptions.MockProvider, StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IReconcileExplainer, DeterministicReconcileExplainer>();
else
    builder.Services.AddSingleton<IReconcileExplainer, AiReconcileExplainer>();
builder.Services.AddHostedService<ReconcileExplanationWorker>();
builder.Services.AddOptions<OperationsOptions>().Bind(builder.Configuration.GetSection(OperationsOptions.SectionName));
builder.Services.AddSingleton<OperatorAccess>();
builder.Services.AddScoped<OperationsHealthService>();
builder.Services.AddScoped<PilotMetricsService>();
builder.Services.AddScoped<OperationsMaintenance>();
builder.Services.AddScoped<UserErasureService>();
builder.Services.AddOptions<PilotOptions>().Bind(builder.Configuration.GetSection(PilotOptions.SectionName));
builder.Services.AddScoped<PilotFeedbackService>();
builder.Services.AddSingleton<IAlertDigestSender, SmtpAlertDigestSender>();
builder.Services.AddScoped<OperationsAlertDigest>();
// Tests run maintenance and the digest themselves, against a clock they control.
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHostedService<OperationsMaintenanceService>();
    builder.Services.AddHostedService<OperationsAlertDigestService>();
}
builder.Services.AddScoped<ApplicationDateService>();
builder.Services.AddScoped<CommandExecutionService>();
builder.Services.AddSingleton(TimeProvider.System);
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
// An operator procedure runs and exits; it never serves HTTP and starts no background work.
if (OperationsCommandLine.IsCommand(args))
{
    Environment.ExitCode = await OperationsCommandLine.RunAsync(app.Services, args);
    return;
}
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing") &&
    (app.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>()?.Length ?? 0) == 0)
    throw new InvalidOperationException("Security:AllowedOrigins must be configured in production.");
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    // The privacy notice names this channel as the way to ask for erasure; it cannot be empty.
    if (string.IsNullOrWhiteSpace(app.Services.GetRequiredService<IOptions<PilotOptions>>().Value.SupportContact))
        throw new InvalidOperationException("Pilot:SupportContact must be configured in production.");
    // Nobody can sign in without a working SMS configuration: the key, and the approved
    // verification template or, failing that, a sender line.
    var sms = app.Services.GetRequiredService<IOptions<KavenegarOptions>>().Value;
    if (string.IsNullOrWhiteSpace(sms.ApiKey) ||
        (string.IsNullOrWhiteSpace(sms.Template) && string.IsNullOrWhiteSpace(sms.Sender)))
        throw new InvalidOperationException("Kavenegar:ApiKey and Kavenegar:Template (or Sender) must be configured in production.");
    // Alerts leave the application only through the daily digest.
    var digest = app.Services.GetRequiredService<IOptions<OperationsOptions>>().Value.AlertDigest;
    if (!digest.Enabled || string.IsNullOrWhiteSpace(digest.To) || string.IsNullOrWhiteSpace(digest.From) ||
        string.IsNullOrWhiteSpace(digest.SmtpHost))
        throw new InvalidOperationException(
            "Operations:AlertDigest must be enabled with To, From and SmtpHost in production.");
}
{
    var ai = app.Services.GetRequiredService<IOptions<AiOptions>>().Value;
    if (app.Services.GetRequiredService<IPlanningGenerator>() is AiPlanningGenerator)
        RequireProvider(ai.Planning.Provider, "planning");
    if (app.Services.GetRequiredService<IReconcileExplainer>() is AiReconcileExplainer)
        RequireProvider(ai.Reconcile.Provider, "Reconcile explanation");

    // A selected provider must be callable, and outside local work its prices must be known: the budget is computed from them.
    void RequireProvider(string key, string use)
    {
        if (!ai.Providers.TryGetValue(key, out var selected) ||
            string.IsNullOrWhiteSpace(selected.BaseUrl) || string.IsNullOrWhiteSpace(selected.ApiKey) ||
            string.IsNullOrWhiteSpace(selected.Model))
            throw new InvalidOperationException(
                $"Ai:Providers:{key} needs BaseUrl, ApiKey and Model when it is the {use} provider.");
        if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing") &&
            (selected.InputPricePerMillionTokens <= 0 || selected.OutputPricePerMillionTokens <= 0))
            throw new InvalidOperationException(
                $"Ai:Providers:{key} needs its token prices so the daily budget can be enforced.");
    }
}
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
// The API description is a development aid; a deployed backend does not publish it.
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
    app.MapOpenApi("/openapi/{documentName}.json");
app.MapControllers();
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapGet("/api/v1/dev/otp/latest", (HttpContext context, string phoneNumber, DevelopmentSmsSender sender) =>
    {
        // Answered to the backend's own machine only, unless a local rehearsal behind a proxy asks for it
        // explicitly. The endpoint does not exist at all outside Development and Testing.
        if (!IPAddress.IsLoopback(context.Connection.RemoteIpAddress ?? IPAddress.None) &&
            !app.Environment.IsEnvironment("Testing") &&
            !app.Configuration.GetValue<bool>("Development:ShowLoginCode")) return Results.NotFound();
        try
        {
            var code = sender.Latest(UserService.NormalizeIranianMobile(phoneNumber));
            return code is null ? Results.NotFound() : Results.Ok(new { code });
        }
        catch (ArgumentException) { return Results.NotFound(); }
    }).ExcludeFromDescription();
    app.MapPost("/api/v1/dev/test-session", async (HttpContext context, AppDbContext db,
        JwtTokenService tokens, IOptions<JwtOptions> jwtOptions, OperatorAccess operators, AiConsentPolicy consent) =>
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
        return Results.Ok(AuthService.ToDto(user, operators, consent));
    }).ExcludeFromDescription();
}

app.Run();

public partial class Program;
