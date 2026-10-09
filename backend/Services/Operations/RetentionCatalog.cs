using TidySense.Models;

namespace TidySense.Services.Operations;

/// <summary>The retention class of one persisted record type and what removes it.</summary>
public sealed record RetentionEntry(Type Entity, string Class, string Rule);

/// <summary>
/// Every persisted record type with its Discussion 019C class. A type that is missing here fails
/// the test suite: no record may exist without an assigned class. Durations are configuration
/// (<see cref="RetentionOptions"/>) and provisional until legal and security review.
/// </summary>
public static class RetentionCatalog
{
    public const string Canonical = "CANONICAL";
    public const string R1 = "R1";
    public const string R2 = "R2";
    public const string R3 = "R3";
    public const string R4 = "R4";

    private const string UntilErasure = "Kept until the account is erased.";
    private const string WithSession = "Removed with its Reconcile session.";

    public static readonly IReadOnlyList<RetentionEntry> Entries =
    [
        new(typeof(User), Canonical, "Removed by account erasure."),
        new(typeof(Goal), Canonical, UntilErasure),
        new(typeof(Project), Canonical, UntilErasure),
        new(typeof(TaskItem), Canonical, UntilErasure),
        new(typeof(Routine), Canonical, UntilErasure),
        new(typeof(RoutineOccurrence), Canonical, UntilErasure),
        new(typeof(CaptureItem), Canonical, UntilErasure),
        new(typeof(PlanningFact), R1, UntilErasure),
        new(typeof(DomainEvent), R1, "Never purged. On erasure the user id is replaced by a tombstone."),
        new(typeof(CommandResult), R1, "Never purged. On erasure the user id is replaced by a tombstone."),
        new(typeof(ReconcileSession), R2, "A closed session is removed R2 days after it closed."),
        new(typeof(ReconcileFact), R2, WithSession),
        new(typeof(RuleMatch), R2, WithSession),
        new(typeof(ReconcileExplanation), R2, WithSession),
        new(typeof(ReconcileRecommendation), R2, WithSession),
        new(typeof(ReconcilePrompt), R2, "Removed R2 days after its local date."),
        new(typeof(ReconcileExposure), R2, "Removed R2 days after it was first seen."),
        // 019C lists the confirmation as R1; here the durable decision evidence is the R1 event and command result.
        new(typeof(ActionConfirmation), R2, "Removed with its Reconcile session or its planning draft."),
        new(typeof(PlanningDraft), R3, "A draft that is no longer reviewable is removed R3 days after it ended."),
        new(typeof(PlanningDraftRevision), R3, "Removed with its draft."),
        new(typeof(PlanningAttempt), R3, "A finished attempt without a remaining draft is removed R3 days after it finished."),
        new(typeof(AiInvocation), R4, "Removed R4 days after the call started."),
        new(typeof(IdempotencyRecord), R4, "A finished, expired record is removed R4 days after it was created."),
        new(typeof(OutboxMessage), R4, "Removed R4 days after it was created. No publisher exists."),
        new(typeof(OtpChallenge), R4, "Removed R4 days after it was created."),
        new(typeof(OtpRateEvent), R4, "Removed after one day by the OTP rate cleanup."),
        new(typeof(OperationsRecord), R4, "A maintenance run is removed R4 days after it ran. An erasure record is kept.")
    ];
}
