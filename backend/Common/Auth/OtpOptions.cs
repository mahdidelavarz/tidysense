using System.ComponentModel.DataAnnotations;

namespace TidySense.Common.Auth;

public sealed class OtpOptions
{
    public const string SectionName = "Otp";
    [Required, MinLength(32)] public string HashingKey { get; init; } = string.Empty;
}
