namespace TidySense.Models;

/// <summary>
/// One satisfaction prompt about one AI response (Discussion 027 §4, as resolved on 2026-10-14):
/// shown, then answered or closed. Shown and closed are not ratings; only an answer has one.
/// The optional reason is the only user-written text the operator can read, shown without
/// identity; the account link exists so erasure removes the record.
/// </summary>
public sealed class AiResponseFeedback
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Surface { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public int InstrumentVersion { get; set; }
    public string Outcome { get; set; } = AiResponseFeedbackOutcomes.Shown;
    public int? Rating { get; set; }
    public string? Reason { get; set; }
    public DateOnly ShownOn { get; set; }
    public DateTimeOffset ShownAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public string RetentionClass { get; set; } = "R2";
}

public static class AiResponseFeedbackSurfaces
{
    /// <summary>A planning draft the user cancelled or replaced without applying it.</summary>
    public const string PlanningDraft = "PLANNING_DRAFT";
}

public static class AiResponseFeedbackOutcomes
{
    public const string Shown = "SHOWN";
    public const string Answered = "ANSWERED";
    public const string Closed = "CLOSED";
}

/// <summary>
/// The satisfaction instrument. The wording shown to the user belongs to the version: changing
/// the question, the scale labels or the sampling rule changes <see cref="Version"/> here and in
/// the client, and the metric dictionary, so answers are never merged across wordings.
/// </summary>
public static class AiResponseFeedbackInstrument
{
    public const int Version = 1;
    public const int MinRating = 1;
    public const int MaxRating = 5;

    /// <summary>A rating at or below this may carry a reason.</summary>
    public const int ReasonMaxRating = 2;
    public const int ReasonMaxLength = 500;
}
