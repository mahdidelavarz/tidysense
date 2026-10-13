using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Pilot;

/// <summary>
/// The facts the privacy notice states, read from the running configuration so the text cannot
/// drift from what the system does. <c>AiReceivesPlanningText</c> says planning text is sent to an
/// AI model; which model or provider is never told to users (Discussion 027 §3).
/// </summary>
public sealed record PilotNoticeDto(
    string NoticeVersion,
    bool AiReceivesPlanningText,
    int SessionHistoryDays,
    int DraftDays,
    int DiagnosticsDays,
    int ErasureCompletionDays,
    string? SupportContact,
    int FeedbackInstrumentVersion);

public sealed record SubmitPilotFeedbackRequest(
    [Required, MaxLength(24)] string Instrument,
    [Range(1, int.MaxValue)] int InstrumentVersion,
    Guid SubjectId,
    [Range(1, 5)] int Answer);
