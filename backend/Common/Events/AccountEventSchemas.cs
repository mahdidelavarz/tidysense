using System.Text.Json;

namespace TidySense.Common.Events;

public static class AccountEventTypes
{
    public const string AiConsentChanged = "AI_CONSENT_CHANGED";
}

/// <summary>Account payloads say what was agreed to (a provider key and a notice version), never who agreed.</summary>
public static class AccountEventSchemas
{
    public static IEnumerable<EventPayloadSchema> All()
    {
        yield return new EventPayloadSchema(AccountEventTypes.AiConsentChanged, 1,
            new EventPayloadFieldPolicy("granted", true,
                value => value.ValueKind is JsonValueKind.True or JsonValueKind.False),
            new EventPayloadFieldPolicy("provider", true, IsKey),
            new EventPayloadFieldPolicy("noticeVersion", true, IsKey));
    }

    private static bool IsKey(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 and <= 64 };
}
