using System.ComponentModel.DataAnnotations;

namespace TidySense.Common.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required] public string Issuer { get; init; } = string.Empty;
    [Required] public string Audience { get; init; } = string.Empty;
    [Required, MinLength(32)] public string SigningKey { get; init; } = string.Empty;
    [Range(5, 1440)] public int LifetimeMinutes { get; init; } = 480;
    [Required] public string CookieName { get; init; } = "TidySense.Auth";
}
