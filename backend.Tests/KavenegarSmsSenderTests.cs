using System.Net;
using Microsoft.Extensions.Options;
using TidySense.Common.Exceptions;
using TidySense.Infrastructure.Sms;

namespace TidySense.Backend.Tests;

public sealed class KavenegarSmsSenderTests
{
    [Fact]
    public async Task Provider_status_inside_successful_http_response_must_be_successful()
    {
        using var client = new HttpClient(new StubHandler("""{"return":{"status":401}}"""));
        var sender = new KavenegarSmsSender(client, Options.Create(new KavenegarOptions
        {
            ApiKey = "test-key", Sender = "test-sender"
        }));
        await Assert.ThrowsAsync<SmsSendException>(() => sender.SendAsync("+989121234567", "1234"));
    }

    [Fact]
    public async Task Successful_provider_reply_uses_local_iranian_receptor()
    {
        var handler = new StubHandler("""{"return":{"status":200}}""");
        using var client = new HttpClient(handler);
        var sender = new KavenegarSmsSender(client, Options.Create(new KavenegarOptions
        {
            ApiKey = "test-key", Sender = "test-sender"
        }));
        await sender.SendAsync("+989121234567", "1234");
        Assert.Contains("receptor=09121234567", handler.Body);
    }

    [Fact]
    public async Task A_configured_template_sends_the_code_as_the_token_of_a_verify_lookup()
    {
        var handler = new StubHandler("""{"return":{"status":200}}""");
        using var client = new HttpClient(handler);
        // No sender line is needed: the provider owns the approved text and the line it goes out on.
        var sender = new KavenegarSmsSender(client, Options.Create(new KavenegarOptions
        {
            ApiKey = "test-key", Template = " login-code "
        }));
        await sender.SendAsync("+989121234567", "1234");
        Assert.Equal("https://api.kavenegar.com/v1/test-key/verify/lookup.json", handler.Uri);
        Assert.Equal("receptor=09121234567&token=1234&template=login-code", handler.Body);
    }

    [Fact]
    public async Task Without_a_template_a_plain_message_goes_out_from_the_sender_line_and_one_of_the_two_is_required()
    {
        var handler = new StubHandler("""{"return":{"status":200}}""");
        using var client = new HttpClient(handler);
        await new KavenegarSmsSender(client, Options.Create(new KavenegarOptions
        {
            ApiKey = "test-key", Sender = "test-sender"
        })).SendAsync("+989121234567", "1234");
        Assert.Equal("https://api.kavenegar.com/v1/test-key/sms/send.json", handler.Uri);
        await Assert.ThrowsAsync<InvalidOperationException>(() => new KavenegarSmsSender(client,
            Options.Create(new KavenegarOptions { ApiKey = "test-key" })).SendAsync("+989121234567", "1234"));
    }

    private sealed class StubHandler(string body) : HttpMessageHandler
    {
        public string Body { get; private set; } = string.Empty;

        public string Uri { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Uri = request.RequestUri!.ToString();
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) };
        }
    }
}
