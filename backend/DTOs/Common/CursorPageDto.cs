namespace TidySense.DTOs.Common;

public sealed record CursorPageDto<T>(IReadOnlyList<T> Items, PageInfoDto Page);

public sealed record PageInfoDto(string? NextCursor, bool HasMore);
