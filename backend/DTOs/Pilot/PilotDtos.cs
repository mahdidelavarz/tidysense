using System.ComponentModel.DataAnnotations;

namespace TidySense.DTOs.Pilot;

/// <summary>
/// The facts the privacy notice states, read from the running configuration so the text cannot
/// drift from what the system does. <c>AiProviderName</c> is null when no provider receives text.
/// </summary>
public sealed record PilotNoticeDto(
    string NoticeVersion,
    string? AiProviderName,
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
