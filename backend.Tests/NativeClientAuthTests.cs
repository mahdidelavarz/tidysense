using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Data;

namespace TidySense.Backend.Tests;

// ADR-008: the Android app signs in for a bearer token and writes without an origin; the browser path is unchanged.
// Each test signs in its own number, so users are never deleted between tests.
public sealed class NativeClientAuthTests : IClassFixture<PostgresWebApplicationFactory>
{
    private readonly PostgresWebApplicationFactory _factory;

    public NativeClientAuthTests(PostgresWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Native_sign_in_returns_a_token_without_a_cookie_and_records_the_first_native_sign_in_once()
    {
        await ClearChallengesAsync();
        using var client = Client();
        const string phone = "09121230001";
        var before = DateTimeOffset.UtcNow;
        var session = await NativeSignInAsync(client, phone);
        Assert.False(session.Headers.Contains("Set-Cookie"));
        var body = await session.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        var expiresAt = body.GetProperty("expiresAt").GetDateTimeOffset();
        Assert.InRange(expiresAt, before.AddMinutes(20160).AddMinutes(-1), DateTimeOffset.UtcNow.AddMinutes(20160).AddMinutes(1));
        Assert.False(body.GetProperty("user").GetProperty("setupComplete").GetBoolean());
        var first = await FirstNativeSignInAsync(phone);
        Assert.NotNull(first);

        await NativeSignInAsync(client, phone);
        await WebSignInAsync(client, phone);
        Assert.Equal(first, await FirstNativeSignInAsync(phone));
    }

    [Fact]
    public async Task A_web_sign_in_records_no_native_sign_in()
    {
        await ClearChallengesAsync();
        using var client = Client();
        const string phone = "09121230002";
        await WebSignInAsync(client, phone);
        Assert.Null(await FirstNativeSignInAsync(phone));
    }

    [Fact]
    public async Task A_bearer_write_without_an_origin_succeeds()
    {
        await ClearChallengesAsync();
        using var client = Client();
        var token = await TokenAsync(client, "09121230003");
        using var me = NativeRequest(HttpMethod.Get, "/api/v1/users/me", token);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(me)).StatusCode);
        using var capture = NativeRequest(HttpMethod.Post, "/api/v1/captures", token, new { title = "از اپ" });
        capture.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(capture)).StatusCode);
    }

    [Fact]
    public async Task A_bearer_write_without_the_native_header_or_an_origin_is_refused()
    {
        await ClearChallengesAsync();
        using var client = Client();
        var token = await TokenAsync(client, "09121230004");
        using var capture = new HttpRequestMessage(HttpMethod.Post, "/api/v1/captures")
        { Content = JsonContent.Create(new { title = "بی‌سربرگ" }) };
        capture.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        capture.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(capture)).StatusCode);
    }

    [Fact]
    public async Task A_cookie_write_without_an_origin_is_still_refused_even_with_the_native_header()
    {
        await ClearChallengesAsync();
        using var client = Client();
        var cookie = await WebSignInAsync(client, "09121230005");
        foreach (var native in new[] { false, true })
        {
            using var capture = new HttpRequestMessage(HttpMethod.Post, "/api/v1/captures")
            { Content = JsonContent.Create(new { title = "کوکی" }) };
            capture.Headers.Add("Cookie", cookie);
            capture.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
            if (native) capture.Headers.Add("X-TidySense-Client", "native");
            Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(capture)).StatusCode);
        }
    }

    [Fact]
    public async Task Logout_all_ends_a_native_session()
    {
        await ClearChallengesAsync();
        using var client = Client();
        var token = await TokenAsync(client, "09121230006");
        using var logoutAll = NativeRequest(HttpMethod.Post, "/api/v1/auth/logout-all", token, new { });
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(logoutAll)).StatusCode);
        using var me = NativeRequest(HttpMethod.Get, "/api/v1/users/me", token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(me)).StatusCode);
    }

    [Fact]
    public async Task The_cookie_wins_over_a_bearer_token()
    {
        await ClearChallengesAsync();
        using var client = Client();
        var cookie = await WebSignInAsync(client, "09121230007");
        var token = await TokenAsync(client, "09121230008");
        using var me = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users/me");
        me.Headers.Add("Cookie", cookie);
        me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var user = await (await client.SendAsync(me)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("+989121230007", user.GetProperty("phoneNumber").GetString());
    }

    [Fact]
    public async Task Native_verify_needs_the_native_header_and_shares_the_attempt_limit()
    {
        await ClearChallengesAsync();
        using var client = Client();
        const string phone = "09121230009";
        using (var request = NativeRequest(HttpMethod.Post, "/api/v1/auth/otp/request", null,
                   new { phoneNumber = phone, purpose = "LOGIN" }))
            Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(request)).StatusCode);
        var code = await CodeAsync(client, phone);
        using (var plain = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/otp/verify-native")
               { Content = JsonContent.Create(new { phoneNumber = phone, code, purpose = "LOGIN" }) })
        {
            plain.Headers.Add("Origin", "http://localhost");
            Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(plain)).StatusCode);
        }
        for (var i = 0; i < 5; i++)
        {
            using var wrong = NativeRequest(HttpMethod.Post, "/api/v1/auth/otp/verify-native", null,
                new { phoneNumber = phone, code = "0000", purpose = "LOGIN" });
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(wrong)).StatusCode);
        }
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(5, (await db.OtpChallenges.SingleAsync()).AttemptCount);
    }

    private HttpClient Client() => _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
    { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });

    private static HttpRequestMessage NativeRequest(HttpMethod method, string path, string? token, object? body = null)
    {
        var request = new HttpRequestMessage(method, path);
        if (body is not null) request.Content = JsonContent.Create(body);
        request.Headers.Add("X-TidySense-Client", "native");
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private async Task<HttpResponseMessage> NativeSignInAsync(HttpClient client, string phone)
    {
        using (var request = NativeRequest(HttpMethod.Post, "/api/v1/auth/otp/request", null,
                   new { phoneNumber = phone, purpose = "LOGIN" }))
            Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(request)).StatusCode);
        var code = await CodeAsync(client, phone);
        using var verify = NativeRequest(HttpMethod.Post, "/api/v1/auth/otp/verify-native", null,
            new { phoneNumber = phone, code, purpose = "LOGIN" });
        var response = await client.SendAsync(verify);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await ClearChallengesAsync();
        return response;
    }

    private async Task<string> TokenAsync(HttpClient client, string phone) =>
        (await (await NativeSignInAsync(client, phone)).Content.ReadFromJsonAsync<JsonElement>())
        .GetProperty("accessToken").GetString()!;

    private async Task<string> WebSignInAsync(HttpClient client, string phone)
    {
        await PostAsync(client, "/api/v1/auth/otp/request", new { phoneNumber = phone, purpose = "LOGIN" });
        var code = await CodeAsync(client, phone);
        var verify = await PostAsync(client, "/api/v1/auth/otp/verify", new { phoneNumber = phone, code, purpose = "LOGIN" });
        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        await ClearChallengesAsync();
        return verify.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
    }

    // A fresh code for the same number waits out the resend window; clearing the challenges lets a test sign in again.
    private async Task ClearChallengesAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.OtpChallenges.ExecuteDeleteAsync();
        await db.OtpRateEvents.ExecuteDeleteAsync();
    }

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

    private async Task<DateTimeOffset?> FirstNativeSignInAsync(string phone)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = "+98" + phone[1..];
        return await db.Users.Where(x => x.PhoneNumber == normalized)
            .Select(x => x.FirstNativeSignInAt).SingleAsync();
    }

}
