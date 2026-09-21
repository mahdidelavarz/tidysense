using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth;

public sealed record RequestOtpDto([Required, MaxLength(16)] string PhoneNumber);
