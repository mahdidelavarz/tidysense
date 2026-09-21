using System.ComponentModel.DataAnnotations;

namespace TidySense.Common.Auth;

public sealed class ApplicationTimeOptions
{
    public const string SectionName = "ApplicationTime";
    [Required] public string TimeZoneId { get; init; } = "Asia/Tehran";
}
