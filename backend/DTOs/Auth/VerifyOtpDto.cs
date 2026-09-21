using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth;

public sealed record VerifyOtpDto(
    [Required, MaxLength(16)] string PhoneNumber,
    [Required, StringLength(6, MinimumLength = 6)] string Code);
