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

    private sealed class StubHandler(string body) : HttpMessageHandler
    {
        public string Body { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) };
        }
    }
}
