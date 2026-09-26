using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth;

public sealed record VerifyOtpDto(
    [Required, MaxLength(24)] string PhoneNumber,
    [Required, RegularExpression("^[0-9]{4}$")] string Code,
    [Required, RegularExpression("LOGIN")] string Purpose);
