namespace TidySense.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
    public int SessionEpoch { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public ICollection<OtpChallenge> OtpChallenges { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];
}
