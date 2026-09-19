namespace TidySense.Models;

public class GroupPermission
{
    public int GroupId { get; set; }

    public int PermissionId { get; set; }

    public Group Group { get; set; } = null!;

    public Permission Permission { get; set; } = null!;
}