using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Common;

public sealed record TerminalPreviewRequest(
    [Required, RegularExpression("^[A-Z_]+$")] string TargetStatus,
    [Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record TerminalCommandRequest(
    [Required, RegularExpression("^[A-Z_]+$")] string TargetStatus,
    [Range(1, long.MaxValue)] long ExpectedVersion,
    [Required, RegularExpression("^[0-9A-Fa-f]{64}$")] string PreviewHash);

/// <summary>Goal Continuation Check. Abandoning uses the terminal flow instead.</summary>
public sealed record ReviewGoalRequest(
    [Required, RegularExpression("^(CONTINUE|REVIEW_LATER)$")] string Decision,
    DateOnly? ReviewDate,
    [Range(1, long.MaxValue)] long ExpectedVersion);

/// <summary>Keeps the Project active with a new review date. Completing or stopping uses the terminal flow.</summary>
public sealed record ReviewProjectRequest(
    DateOnly? ReviewDate,
    [Range(1, long.MaxValue)] long ExpectedVersion);

public sealed record TerminalPreviewDto(
    Guid EntityId,
    string EntityType,
    string CurrentStatus,
    string TargetStatus,
    long ExpectedVersion,
    bool CanApply,
    IReadOnlyList<TerminalBlockerDto> Blockers,
    IReadOnlyList<TerminalCascadeDto> Cascades,
    string PreviewHash);

public sealed record TerminalBlockerDto(string ResourceType, Guid ResourceId, string Status, long Version);

/// <summary>A child the confirmed terminal transition will change by itself, shown before confirmation.</summary>
public sealed record TerminalCascadeDto(string ResourceType, Guid ResourceId, string ResultingStatus, long Version);
