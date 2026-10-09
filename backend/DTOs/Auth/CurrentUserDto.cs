using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth;

/// <summary>
/// <c>AiConsentRequired</c> says planning text would be sent to an AI provider;
/// <c>AiConsentGranted</c> says the user agreed to the current provider and notice.
/// </summary>
public sealed record CurrentUserDto(Guid Id, string PhoneNumber, string? DisplayName, bool SetupComplete,
    bool IsOperator, bool AiConsentRequired, bool AiConsentGranted);

/// <summary>The notice version is the one the user was shown when agreeing; it is ignored when withdrawing.</summary>
public sealed record SetAiConsentRequest(bool Granted, [MaxLength(16)] string? NoticeVersion);
