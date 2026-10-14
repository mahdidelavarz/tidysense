using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Feedback;

/// <summary>Asks whether a satisfaction prompt is shown for one AI response.</summary>
public sealed record RequestAiResponseFeedbackRequest([Required, MaxLength(32)] string Surface, Guid SubjectId);

/// <summary><c>PromptId</c> is null when the rule does not ask about this response.</summary>
public sealed record AiResponseFeedbackPromptDto(Guid? PromptId, int InstrumentVersion);

public sealed record AnswerAiResponseFeedbackRequest(
    [Range(1, int.MaxValue)] int InstrumentVersion,
    [Range(1, 5)] int Rating,
    [MaxLength(500)] string? Reason);
