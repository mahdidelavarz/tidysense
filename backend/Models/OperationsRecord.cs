namespace TidySense.Models;

/// <summary>
/// What an operational procedure did: a maintenance run or the erasure of one account. It holds
/// counts and codes only; never a phone number, a title or any other user text.
/// </summary>
public sealed class OperationsRecord
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Operator { get; set; } = OperationsRecordOperators.System;
    public string? ReasonCode { get; set; }
    public string Outcome { get; set; } = OperationsRecordOutcomes.Succeeded;
    public string DetailsJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public string RetentionClass { get; set; } = "R4";
}

public static class OperationsRecordKinds
{
    public const string MaintenanceRun = "MAINTENANCE_RUN";
    public const string UserErasure = "USER_ERASURE";
}

public static class OperationsRecordOutcomes
{
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
}

public static class OperationsRecordOperators
{
    public const string System = "SYSTEM";
}
