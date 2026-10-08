using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TidySense.Services.Ai;

namespace TidySense.Infrastructure.Ai;

/// <summary>
/// Adapter for a provider that speaks the OpenAI chat-completions protocol (DeepSeek). It sends
/// one non-streamed JSON-mode request without any tool or function definition and maps the
/// provider's answer to provider-neutral results and failure classes.
/// </summary>
public sealed class OpenAiCompatibleChatClient(HttpClient httpClient, IOptionsMonitor<AiOptions> options)
    : IAiCompletionClient
{
    public const string HttpClientName = "ai-provider";
    private const int MaxResponseBytes = 512 * 1024;

    public async Task<AiCompletionResult> CompleteAsync(string providerKey, AiCompletionRequest request,
        CancellationToken cancellationToken)
    {
        if (!options.CurrentValue.Providers.TryGetValue(providerKey, out var provider) ||
            string.IsNullOrWhiteSpace(provider.BaseUrl) || string.IsNullOrWhiteSpace(provider.ApiKey))
            throw new AiProviderException(AiFailureClasses.Configuration, false);

        using var message = new HttpRequestMessage(HttpMethod.Post,
            $"{provider.BaseUrl.TrimEnd('/')}/chat/completions");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", provider.ApiKey);
        var payload = new Dictionary<string, object>
        {
            ["model"] = request.Model,
            ["messages"] = new object[]
            {
                new { role = "system", content = request.SystemPrompt },
                new { role = "user", content = request.UserContent }
            },
            ["response_format"] = new { type = "json_object" },
            ["max_tokens"] = request.MaxOutputTokens,
            ["stream"] = false
        };
        if (provider.DisableThinking) payload["thinking"] = new { type = "disabled" };
        message.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        try
        {
            using var response = await httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            if (!response.IsSuccessStatusCode) throw Failure(response.StatusCode);
            if (response.Content.Headers.ContentLength > MaxResponseBytes)
                throw new AiProviderException(AiFailureClasses.Incomplete, false);
            var body = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (body.Length > MaxResponseBytes) throw new AiProviderException(AiFailureClasses.Incomplete, false);
            return Read(body);
        }
        catch (HttpRequestException)
        {
            throw new AiProviderException(AiFailureClasses.Transport, true);
        }
        catch (IOException)
        {
            throw new AiProviderException(AiFailureClasses.Transport, true);
        }
    }

    private static AiCompletionResult Read(byte[] body)
    {
        try
        {
            using var json = JsonDocument.Parse(body);
            var choice = json.RootElement.GetProperty("choices")[0];
            var message = choice.GetProperty("message");
            // No tool was offered, so a tool call is never an acceptable answer.
            if (message.TryGetProperty("tool_calls", out var tools) && tools.ValueKind == JsonValueKind.Array &&
                tools.GetArrayLength() > 0) throw new AiProviderException(AiFailureClasses.Policy, false);
            var finish = choice.TryGetProperty("finish_reason", out var reason) ? reason.GetString() : null;
            if (finish == "content_filter") throw new AiProviderException(AiFailureClasses.ProviderRefused, false);
            var text = message.TryGetProperty("content", out var content) ? content.GetString() : null;
            int? input = null, output = null;
            if (json.RootElement.TryGetProperty("usage", out var usage) && usage.ValueKind == JsonValueKind.Object)
            {
                if (usage.TryGetProperty("prompt_tokens", out var prompt) && prompt.TryGetInt32(out var p)) input = p;
                if (usage.TryGetProperty("completion_tokens", out var completion) &&
                    completion.TryGetInt32(out var c)) output = c;
            }
            return new AiCompletionResult(text ?? string.Empty, finish ?? string.Empty, input, output);
        }
        catch (Exception exception) when (exception is JsonException or KeyNotFoundException
            or InvalidOperationException or IndexOutOfRangeException)
        {
            // The envelope itself is not what the protocol promises.
            throw new AiProviderException(AiFailureClasses.Incomplete, false);
        }
    }

    private static AiProviderException Failure(HttpStatusCode status) => (int)status switch
    {
        // DeepSeek answers 402 when the prepaid balance is used up: the provider-side hard spend cap.
        402 => new AiProviderException(AiFailureClasses.SpendCap, false),
        429 => new AiProviderException(AiFailureClasses.ProviderRateLimited, true),
        408 or >= 500 => new AiProviderException(AiFailureClasses.ProviderUnavailable, true),
        _ => new AiProviderException(AiFailureClasses.ProviderRejected, false)
    };
}
