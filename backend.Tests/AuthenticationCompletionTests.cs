using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;
using TidySense.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.IdentityModel.Tokens.Jwt;

namespace TidySense.Backend.Tests;

public sealed class AuthenticationCompletionTests : IClassFixture<PostgresWebApplicationFactory>
{
    private readonly PostgresWebApplicationFactory _factory;

    public AuthenticationCompletionTests(PostgresWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task New_user_is_created_only_after_successful_verification()
    {
        await ResetAsync();
        using var client = Client();
        var phone = "09121234567";
        var request = await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" });
        Assert.Equal(HttpStatusCode.Accepted, request.StatusCode);
        Assert.Equal(120, (await request.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("retryAfterSeconds").GetInt32());
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Empty(await db.Users.ToListAsync());
            var challenge = await db.OtpChallenges.SingleAsync();
            Assert.Equal("+989121234567", challenge.NormalizedPhone);
            Assert.Equal("LOGIN", challenge.Purpose);
            Assert.Equal(64, challenge.CodeDigest.Length);
        }
        var code = await CodeAsync(client, phone);
        var verify = await PostAsync(client, "/api/v1/auth/otp/verify", new { phoneNumber = phone, code, purpose = "LOGIN" });
        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        Assert.Contains("TidySense.Auth=", verify.Headers.GetValues("Set-Cookie").Single());
        var setCookie = verify.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", setCookie, StringComparison.OrdinalIgnoreCase);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(setCookie.Split(';')[0].Split('=')[1]);
        Assert.Contains(jwt.Claims, claim => claim.Type == "jti");
        Assert.Contains(jwt.Claims, claim => claim.Type == "iat");
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == "phoneNumber");
        Assert.DoesNotContain("isNewUser", await verify.Content.ReadAsStringAsync());
        var user = await verify.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(user.GetProperty("setupComplete").GetBoolean());
        var cookie = verify.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", cookie);
        var me = await client.GetAsync("/api/v1/users/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/auth/current-user")).StatusCode);
    }

    [Fact]
    public async Task Logout_allows_a_fresh_code_immediately_after_successful_login()
    {
        await ResetAsync();
        using var client = Client();
        const string phone = "09121234572";
        Assert.Equal(HttpStatusCode.Accepted,
            (await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" })).StatusCode);
        var firstCode = await CodeAsync(client, phone);
        var verified = await PostAsync(client, "/api/v1/auth/otp/verify",
            new { phoneNumber = phone, code = firstCode, purpose = "LOGIN" });
        Assert.Equal(HttpStatusCode.OK, verified.StatusCode);
        client.DefaultRequestHeaders.Add("Cookie", verified.Headers.GetValues("Set-Cookie").Single().Split(';')[0]);
        Assert.Equal(HttpStatusCode.NoContent,
            (await PostAsync(client, "/api/v1/auth/logout", new { })).StatusCode);

        using var afterLogout = Client();
        Assert.Equal(HttpStatusCode.Accepted,
            (await PostAsync(afterLogout, "/api/v1/auth/otp/request",
                new { phoneNumber = phone, purpose = "LOGIN" })).StatusCode);
        var nextCode = await CodeAsync(afterLogout, phone);
        Assert.Equal(HttpStatusCode.OK,
            (await PostAsync(afterLogout, "/api/v1/auth/otp/verify",
                new { phoneNumber = phone, code = nextCode, purpose = "LOGIN" })).StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await db.OtpChallenges.CountAsync());
        Assert.Equal(2, await db.OtpChallenges.CountAsync(x => x.UsedAt != null));
    }

    [Fact]
    public async Task One_challenge_cannot_be_consumed_twice()
    {
        await ResetAsync();
        using var client = Client();
        const string phone = "09121234568";
        Assert.Equal(HttpStatusCode.Accepted,
            (await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" })).StatusCode);
        var code = await CodeAsync(client, phone);
        var results = await Task.WhenAll(
            PostAsync(Client(), "/api/v1/auth/otp/verify", new { phoneNumber = phone, code, purpose = "LOGIN" }),
            PostAsync(Client(), "/api/v1/auth/otp/verify", new { phoneNumber = phone, code, purpose = "LOGIN" }));
        Assert.Single(results.Where(x => x.StatusCode == HttpStatusCode.OK));
        Assert.Single(results.Where(x => x.StatusCode == HttpStatusCode.Unauthorized));
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Users.CountAsync());
        Assert.NotNull((await db.OtpChallenges.SingleAsync()).UsedAt);
    }

    [Fact]
    public async Task Existing_user_wins_creation_race_without_error()
    {
        await ResetAsync();
        using var client = Client();
        const string phone = "09121234569";
        await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" });
        var code = await CodeAsync(client, phone);
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(), PhoneNumber = "+989121234569",
                IsActive = true, SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }
        var response = await PostAsync(client, "/api/v1/auth/otp/verify",
            new { phoneNumber = phone, code, purpose = "LOGIN" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("setupComplete").GetBoolean());
        await using var checkScope = _factory.Services.CreateAsyncScope();
        Assert.Equal(1, await checkScope.ServiceProvider.GetRequiredService<AppDbContext>().Users.CountAsync());
    }

    [Fact]
    public async Task Unsafe_request_requires_json_and_approved_origin()
    {
        using var client = Client();
        var body = new { phoneNumber = "09121234567", purpose = "LOGIN" };
        using var missingOrigin = await client.PostAsJsonAsync("/api/v1/auth/otp/request", body);
        Assert.Equal(HttpStatusCode.Forbidden, missingOrigin.StatusCode);
        using var crossOrigin = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/otp/request")
        { Content = JsonContent.Create(body) };
        crossOrigin.Headers.Add("Origin", "https://evil.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(crossOrigin)).StatusCode);
        using var wrongType = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/otp/request")
        { Content = new StringContent("phoneNumber=09121234567") };
        wrongType.Headers.Add("Origin", "http://localhost");
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await client.SendAsync(wrongType)).StatusCode);
    }

    [Fact]
    public async Task Logout_all_revokes_old_cookie_and_logout_clears_current_cookie()
    {
        await ResetAsync();
        using var client = Client();
        const string phone = "09121234570";
        await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" });
        var code = await CodeAsync(client, phone);
        var verified = await PostAsync(client, "/api/v1/auth/otp/verify", new { phoneNumber = phone, code, purpose = "LOGIN" });
        var cookie = verified.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
        var logoutAll = await PostAsync(client, "/api/v1/auth/logout-all", new { });
        Assert.Equal(HttpStatusCode.NoContent, logoutAll.StatusCode);
        Assert.Contains("TidySense.Auth=", logoutAll.Headers.GetValues("Set-Cookie").Single());
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task Failed_attempts_are_committed_and_request_rate_is_persistent()
    {
        await ResetAsync();
        using var client = Client();
        const string phone = "09121234571";
        await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" });
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await PostAsync(client, "/api/v1/auth/otp/verify", new { phoneNumber = phone, code = "0000", purpose = "LOGIN" })).StatusCode);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(5, (await db.OtpChallenges.SingleAsync()).AttemptCount);
        Assert.Equal(HttpStatusCode.Accepted,
            (await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" })).StatusCode);
        Assert.Single(await db.OtpChallenges.ToListAsync());
    }

    [Fact]
    public async Task Production_profile_has_no_development_auth_routes()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unused;Username=unused;Password=unused",
                    ["Jwt:SigningKey"] = "production-profile-test-signing-key-32-chars",
                    ["Otp:HashingKey"] = "production-profile-test-hashing-key-32-chars",
                    ["Security:AllowedOrigins:0"] = "https://app.example"
                }));
        });
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/dev/otp/latest?phoneNumber=09121234567")).StatusCode);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/dev/test-session")
        { Content = JsonContent.Create(new { }) };
        request.Headers.Add("Origin", "https://app.example");
        Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(request)).StatusCode);
        using var testCommand = new HttpRequestMessage(HttpMethod.Post,
            $"/api/v1/test-delivery-contract/version/{Guid.NewGuid()}")
        { Content = JsonContent.Create(new { expectedVersion = 1 }) };
        testCommand.Headers.Add("Origin", "https://app.example");
        Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(testCommand)).StatusCode);
    }

    private HttpClient Client() => _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
    { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });

    private static async Task<HttpResponseMessage> PostAsync(HttpClient client, string path, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        return await client.SendAsync(request);
    }

    private static async Task<string> CodeAsync(HttpClient client, string phone)
    {
        var response = await client.GetAsync($"/api/v1/dev/otp/latest?phoneNumber={phone}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString()!;
    }

    private async Task ResetAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Projects.ExecuteDeleteAsync();
        await db.Users.ExecuteDeleteAsync();
        await db.OtpChallenges.ExecuteDeleteAsync();
        await db.OtpRateEvents.ExecuteDeleteAsync();
    }
}
