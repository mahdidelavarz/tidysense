using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using TidySense.Common;
using TidySense.Common.Auth;
using TidySense.Data;
using TidySense.Mappings;
using TidySense.Services;
using TidySense.Services.Sms;

var builder = WebApplication.CreateBuilder(args);

// --------------------------------------------------
// Services
// --------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

// --------------------------------------------------
// AutoMapper
// --------------------------------------------------

builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<MappingProfile>();
});

// --------------------------------------------------
// IPPANEL
// --------------------------------------------------

builder.Services.Configure<IppanelProperties>(
    builder.Configuration.GetSection(
        IppanelProperties.SectionName));

builder.Services.AddHttpClient<ISmsSender, IppanelSmsSender>();

// --------------------------------------------------
// Application services
// --------------------------------------------------

builder.Services.AddScoped<ProjectService>();

// --------------------------------------------------
// IAM services
// --------------------------------------------------

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<GroupService>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<UserGroupService>();
builder.Services.AddScoped<GroupPermissionService>();
builder.Services.AddScoped<AuthorizationService>();

// --------------------------------------------------
// Authentication events
// --------------------------------------------------

builder.Services.AddScoped<SessionCookieEvents>();

// --------------------------------------------------
// Authentication
// --------------------------------------------------

builder.Services
    .AddAuthentication(
        AuthConstants.AuthenticationScheme)
    .AddCookie(
        AuthConstants.AuthenticationScheme,
        options =>
        {
            options.Cookie.Name =
                AuthConstants.SessionCookieName;

            options.Cookie.HttpOnly = true;

            options.Cookie.SecurePolicy =
                CookieSecurePolicy.Always;

            options.Cookie.SameSite =
                SameSiteMode.Lax;

            options.ExpireTimeSpan =
                TimeSpan.FromHours(
                    AuthConstants.SessionExpirationHours);

            options.SlidingExpiration = false;

            options.EventsType =
                typeof(SessionCookieEvents);
        });

// --------------------------------------------------
// Authorization
// --------------------------------------------------

builder.Services.AddAuthorization();

// --------------------------------------------------
// OpenAPI
// --------------------------------------------------

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --------------------------------------------------
// Build
// --------------------------------------------------

var app = builder.Build();

// --------------------------------------------------
// HTTP pipeline
// --------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();