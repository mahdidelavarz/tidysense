namespace TidySense.DTOs.Auth.Groups;

public class CreateGroupDto
{
    public string Name { get; set; } = null!;

    public string? Description { get; set; }
}