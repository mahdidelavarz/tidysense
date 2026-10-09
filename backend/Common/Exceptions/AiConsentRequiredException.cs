namespace TidySense.Common.Exceptions;

/// <summary>The user has not agreed to send their text to the configured AI provider. Manual work is unaffected.</summary>
public sealed class AiConsentRequiredException()
    : Exception("Consent to send text to the AI provider is required. Nothing was sent or changed.")
{
    public const string ErrorCode = "AI_CONSENT_REQUIRED";
}
