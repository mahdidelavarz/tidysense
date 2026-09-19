using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Auth.Users;

public class CreateUserDto
{
    [Required]
    public string PhoneNumber { get; set; } = null!;

    [Required]
    public string? DisplayName { get; set; }
}