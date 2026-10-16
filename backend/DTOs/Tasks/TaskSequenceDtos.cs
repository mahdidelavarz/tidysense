namespace TidySense.DTOs.Tasks;

/// <summary>One step of the sequence as it would be: whether its place changes and whether it would wait for an earlier step.</summary>
public sealed record TaskSequenceStepDto(Guid TaskId, string Title, string Status, bool Changed, bool Waits);

/// <summary>
/// What a sequence change would do, built by the server and stored nowhere. <c>Steps</c> is the
/// sequence afterwards, in order (empty when no sequence is left); <c>ExpectedMembers</c> is what the
/// change must find unchanged when it is sent.
/// </summary>
public sealed record TaskSequencePreviewDto(
    string Action,
    Guid TaskId,
    IReadOnlyList<TaskSequenceStepDto> Steps,
    IReadOnlyList<TaskVersionRefDto> ExpectedMembers);
