namespace TidySense.Models;

public class Group
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public ICollection<UserGroup> UserGroups { get; set; }
        = new List<UserGroup>();

    public ICollection<GroupPermission> GroupPermissions { get; set; }
        = new List<GroupPermission>();
}