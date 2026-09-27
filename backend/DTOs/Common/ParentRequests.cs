using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Common;

public sealed record TerminalPreviewRequest(
    [Required, RegularExpression("^[A-Z_]+$")] string TargetStatus,
    [Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record TerminalCommandRequest(
    [Required, RegularExpression("^[A-Z_]+$")] string TargetStatus,
    [Range(1, long.MaxValue)] long ExpectedVersion,
    [Required, RegularExpression("^[0-9A-Fa-f]{64}$")] string PreviewHash);

public sealed record TerminalPreviewDto(
    Guid EntityId,
    string EntityType,
    string CurrentStatus,
    string TargetStatus,
    long ExpectedVersion,
    bool CanApply,
    IReadOnlyList<TerminalBlockerDto> Blockers,
    string PreviewHash);

public sealed record TerminalBlockerDto(string ResourceType, Guid ResourceId, string Status, long Version);
