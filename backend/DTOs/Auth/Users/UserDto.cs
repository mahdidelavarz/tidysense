namespace TidySense.DTOs.Auth.Users;

public class UserDto
{
    public int Id { get; set; }

    public string PhoneNumber { get; set; } = null!;

    public string? DisplayName { get; set; }

    public bool IsActive { get; set; }

}