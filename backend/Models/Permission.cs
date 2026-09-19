namespace TidySense.Models;

public class Permission
{
    public int Id { get; set; }

    public string Resource { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public ICollection<GroupPermission> GroupPermissions { get; set; }
        = new List<GroupPermission>();
}