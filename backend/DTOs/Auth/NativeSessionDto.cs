namespace TidySense.DTOs.Auth;

/// <summary>A native sign-in: the user and the token the app sends as <c>Authorization: Bearer</c> (ADR-008).</summary>
public sealed record NativeSessionDto(CurrentUserDto User, string AccessToken, DateTimeOffset ExpiresAt);
