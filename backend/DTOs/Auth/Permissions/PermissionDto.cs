namespace TidySense.DTOs.Auth.Permissions;

public class PermissionDto
{
    public int Id { get; set; }
    public string Resource { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string? Description { get; set; }
}