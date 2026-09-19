namespace TidySense.Models;

public class User
{
    public int Id { get; set; }

    public string PhoneNumber { get; set; } = null!;

    public string? DisplayName { get; set; }

    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public ICollection<UserGroup> UserGroups { get; set; }
        = new List<UserGroup>();

    public ICollection<OtpChallenge> OtpChallenges { get; set; }
        = new List<OtpChallenge>();
}