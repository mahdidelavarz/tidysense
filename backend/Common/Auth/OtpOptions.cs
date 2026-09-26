using System.ComponentModel.DataAnnotations;

namespace TidySense.Common.Auth;

public sealed class OtpOptions
{
    public const string SectionName = "Otp";
    [Required, MinLength(32)] public string HashingKey { get; init; } = string.Empty;
    [Range(4, 8)] public int CodeLength { get; init; } = 4;
    [Range(1, 30)] public int ExpirationMinutes { get; init; } = 2;
    [Range(1, 600)] public int ResendSeconds { get; init; } = 120;
    [Range(1, 20)] public int MaxAttempts { get; init; } = 5;
    [Range(1, 100)] public int PhoneRequestsPer15Minutes { get; init; } = 3;
    [Range(1, 1000)] public int IpRequestsPerHour { get; init; } = 20;
    [Range(1, 1000)] public int IpVerificationsPer10Minutes { get; init; } = 20;
}
