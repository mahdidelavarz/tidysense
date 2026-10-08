using System.Text.Json;
using System.Text.Json.Nodes;

namespace TidySense.Services.Ai;

/// <summary>
/// The syntax every output gate shares: the allowlisted wrapper removal (a byte-order mark,
/// surrounding whitespace, one enclosing code fence) and strict parsing into one JSON object
/// without duplicated property names. Nothing else is repaired.
/// </summary>
public static class AiOutputText
{
    public const string RemoveBom = "REMOVE_UTF8_BOM";
    public const string TrimWhitespace = "TRIM_SURROUNDING_WHITESPACE";
    public const string RemoveCodeFence = "REMOVE_SINGLE_JSON_CODE_FENCE";

    /// <summary>Null when the text is not exactly one JSON object. Applied repairs are added to <paramref name="rules"/>.</summary>
    public static JsonObject? ParseObject(string text, List<string> rules)
    {
        if (Unwrap(text, rules) is not { } unwrapped) return null;
        try
        {
            using var document = JsonDocument.Parse(unwrapped);
            if (document.RootElement.ValueKind != JsonValueKind.Object || HasDuplicateNames(document.RootElement))
                return null;
            return JsonObject.Create(document.RootElement.Clone());
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? Unwrap(string text, List<string> rules)
    {
        if (text[0] == '﻿')
        {
            text = text[1..];
            rules.Add(RemoveBom);
        }
        var trimmed = text.Trim();
        if (trimmed.Length != text.Length) rules.Add(TrimWhitespace);
        if (!trimmed.StartsWith("```", StringComparison.Ordinal)) return trimmed;
        var firstBreak = trimmed.IndexOf('\n');
        var opening = firstBreak < 0 ? string.Empty : trimmed[3..firstBreak].Trim();
        if (firstBreak < 0 || !trimmed.EndsWith("```", StringComparison.Ordinal) || trimmed.Length < firstBreak + 4 ||
            opening is not ("" or "json" or "JSON")) return null;
        rules.Add(RemoveCodeFence);
        return trimmed[(firstBreak + 1)..^3].Trim();
    }

    private static bool HasDuplicateNames(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().Select(x => x.Name).Distinct(StringComparer.Ordinal).Count()
                != element.EnumerateObject().Count() ||
            element.EnumerateObject().Any(x => HasDuplicateNames(x.Value)),
        JsonValueKind.Array => element.EnumerateArray().Any(HasDuplicateNames),
        _ => false
    };
}
