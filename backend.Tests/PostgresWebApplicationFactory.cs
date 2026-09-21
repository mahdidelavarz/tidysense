using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Npgsql;
using TidySense.Data;

namespace TidySense.Backend.Tests;

public sealed class PostgresWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _databaseName = $"tidysense_tests_{Guid.NewGuid():N}";
    private HttpClient? _client;

    public string ConnectionString
    {
        get
        {
            var configured = Environment.GetEnvironmentVariable("TIDYSENSE_TEST_POSTGRES");
            if (string.IsNullOrWhiteSpace(configured))
                throw new InvalidOperationException(
                    "TIDYSENSE_TEST_POSTGRES must contain a PostgreSQL connection string with database-creation permission.");

            return new NpgsqlConnectionStringBuilder(configured)
            {
                Database = _databaseName,
                IncludeErrorDetail = false
            }.ConnectionString;
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                ["Jwt:Issuer"] = "TidySense.Tests",
                ["Jwt:Audience"] = "TidySense.Tests.Client",
                ["Jwt:SigningKey"] = "tests-only-signing-key-that-is-at-least-32-characters",
                ["Jwt:CookieName"] = "TidySense.Auth",
                ["Otp:HashingKey"] = "tests-only-otp-key-that-is-at-least-32-characters",
                ["ApplicationTime:TimeZoneId"] = "Asia/Tehran"
            }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(ConnectionString));
        });
    }

    public async ValueTask InitializeAsync()
    {
        _client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public new async ValueTask DisposeAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        _client?.Dispose();
        await base.DisposeAsync();
    }
}
