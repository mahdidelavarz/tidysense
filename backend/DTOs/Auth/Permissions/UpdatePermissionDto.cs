namespace TidySense.DTOs.Auth.Permissions;

public class UpdatePermissionDto
{
    public string Resource { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string? Description { get; set; }
}