using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth;

public sealed record RequestOtpDto(
    [Required, MaxLength(24)] string PhoneNumber,
    [Required, RegularExpression("LOGIN")] string Purpose);
