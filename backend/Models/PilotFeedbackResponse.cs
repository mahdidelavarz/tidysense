namespace TidySense.Models;

/// <summary>
/// One answer to a pilot research question, given once about one applied planning draft or one
/// completed Reconcile session. It holds a number from a fixed scale; never text.
/// </summary>
public sealed class PilotFeedbackResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Instrument { get; set; } = string.Empty;
    public int InstrumentVersion { get; set; }
    public Guid SubjectId { get; set; }
    public int Answer { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string RetentionClass { get; set; } = "R2";
}

/// <summary>
/// The in-app pilot questions. The wording shown to the user belongs to the version: changing
/// either changes <see cref="Version"/> here and in the client, and the metric dictionary.
/// </summary>
public static class PilotInstruments
{
    /// <summary>Asked once after a planning draft was applied; the subject is the draft.</summary>
    public const string PlanUsefulness = "H1_USEFULNESS";

    /// <summary>Asked once after a Reconcile session was completed; the subject is the session.</summary>
    public const string ReconcileUnderstanding = "H2_UNDERSTANDING";

    public const int Version = 1;
    public const int MinAnswer = 1;
    public const int MaxAnswer = 5;
}
