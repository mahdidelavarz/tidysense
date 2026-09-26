using System.Text;
using System.Text.Json;

namespace TidySense.Common.Events;

public sealed record EventPayloadFieldPolicy(
    string Name,
    bool Required,
    Func<JsonElement, bool> IsValid);

public sealed class EventPayloadSchema
{
    public EventPayloadSchema(string eventType, int eventVersion,
        params EventPayloadFieldPolicy[] fields)
    {
        if (string.IsNullOrWhiteSpace(eventType) || eventVersion < 1)
            throw new ArgumentException("An event payload schema needs a type and positive version.");
        if (fields.Any(x => string.IsNullOrWhiteSpace(x.Name) || x.IsValid is null ||
                            EventPayloadValidator.IsForbiddenFieldName(x.Name)))
            throw new ArgumentException("Event payload schema contains an invalid or prohibited field.");
        if (fields.Select(x => x.Name).Distinct(StringComparer.Ordinal).Count() != fields.Length)
            throw new ArgumentException("Event payload schema fields must be unique.");

        EventType = eventType;
        EventVersion = eventVersion;
        Fields = fields.ToDictionary(x => x.Name, StringComparer.Ordinal);
    }

    public string EventType { get; }
    public int EventVersion { get; }
    public IReadOnlyDictionary<string, EventPayloadFieldPolicy> Fields { get; }
}

public sealed class EventPayloadValidator(IEnumerable<EventPayloadSchema> schemas)
{
    public const int MaxPayloadUtf8Bytes = 4096;

    private static readonly HashSet<string> ForbiddenFieldNames = new(StringComparer.Ordinal)
    {
        "accesstoken", "apikey", "authorization", "cookie", "credential", "credentials", "email",
        "jwt", "mobile", "otp", "otpcode", "otpdigest", "password", "passcode",
        "phone", "phonenumber", "refreshtoken", "secret", "sessiontoken", "token"
    };

    private readonly IReadOnlyDictionary<(string Type, int Version), EventPayloadSchema> _schemas =
        BuildCatalog(schemas);

    public void Validate(string eventType, int eventVersion, string payloadJson)
    {
        if (Encoding.UTF8.GetByteCount(payloadJson) > MaxPayloadUtf8Bytes)
            throw new ArgumentException($"Event payload exceeds {MaxPayloadUtf8Bytes} UTF-8 bytes.");
        if (!_schemas.TryGetValue((eventType, eventVersion), out var schema))
            throw new ArgumentException("Event payload schema is not registered.");

        using var document = JsonDocument.Parse(payloadJson);
        var payload = document.RootElement;
        if (payload.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Event payload must be an object.");

        var present = new HashSet<string>(StringComparer.Ordinal);
        foreach (var property in payload.EnumerateObject())
        {
            if (!present.Add(property.Name))
                throw new ArgumentException("Event payload contains a duplicate field.");
            if (!schema.Fields.TryGetValue(property.Name, out var policy))
                throw new ArgumentException("Event payload contains a field that is not approved by its schema.");
            if (IsForbiddenFieldName(property.Name))
                throw new ArgumentException("Event payload contains prohibited authentication or personal data.");
            EnsureNoForbiddenFields(property.Value);
            if (!policy.IsValid(property.Value))
                throw new ArgumentException("Event payload field does not match its approved schema.");
        }

        if (schema.Fields.Values.Any(x => x.Required && !present.Contains(x.Name)))
            throw new ArgumentException("Event payload is missing a required field.");
    }

    private static IReadOnlyDictionary<(string Type, int Version), EventPayloadSchema> BuildCatalog(
        IEnumerable<EventPayloadSchema> schemas)
    {
        var catalog = new Dictionary<(string Type, int Version), EventPayloadSchema>();
        foreach (var schema in schemas)
            if (!catalog.TryAdd((schema.EventType, schema.EventVersion), schema))
                throw new InvalidOperationException("Event payload schema registrations must be unique.");
        return catalog;
    }

    private static void EnsureNoForbiddenFields(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in value.EnumerateObject())
            {
                if (IsForbiddenFieldName(property.Name))
                    throw new ArgumentException("Event payload contains prohibited authentication or personal data.");
                EnsureNoForbiddenFields(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in value.EnumerateArray()) EnsureNoForbiddenFields(item);
        }
    }

    internal static bool IsForbiddenFieldName(string name)
    {
        var normalized = new string(name.Where(char.IsLetterOrDigit)
            .Select(char.ToLowerInvariant).ToArray());
        return ForbiddenFieldNames.Contains(normalized);
    }
}
