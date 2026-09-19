namespace TidySense.DTOs.Auth.Groups;

public class UpdateGroupDto
{
    public string Name { get; set; } = null!;

    public string? Description { get; set; }
}