using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Auth;
using TidySense.Models;
using TidySense.Services.Ai;

namespace TidySense.Services;

/// <summary>
/// Whether planning text may leave for an AI provider. Consent is needed only when planning is
/// model-backed, and it names one provider and one version of the notice: a different provider
/// or a changed notice asks again. The Reconcile explanation sends codes and counts only (no
/// user text), so it is not gated.
/// </summary>
public sealed class AiConsentPolicy(IPlanningGenerator generator, IOptionsMonitor<AiOptions> ai)
{
    /// <summary>The version of the notice the user reads before agreeing. Changing the notice changes it.</summary>
    public const string NoticeVersion = "2026-10-09.1";

    public bool Required => generator is AiPlanningGenerator;

    /// <summary>The key of the provider planning text is sent to; null when planning is not model-backed.</summary>
    public string? Provider => Required ? ai.CurrentValue.Planning.Provider : null;

    /// <summary>The name shown to the user: the configured display name, or the key.</summary>
    public string? ProviderName => Provider is { } key
        ? ai.CurrentValue.Providers.TryGetValue(key, out var configured) &&
          !string.IsNullOrWhiteSpace(configured.DisplayName) ? configured.DisplayName : key
        : null;

    public bool IsGranted(string? consentProvider, string? consentNoticeVersion) =>
        Provider is not { } provider ||
        (string.Equals(consentProvider, provider, StringComparison.OrdinalIgnoreCase) &&
         consentNoticeVersion == NoticeVersion);

    public bool IsGranted(User user) => IsGranted(user.AiConsentProvider, user.AiConsentNoticeVersion);
}

/// <summary>Records the user's decision. The decision itself is an R1 event; the account row holds the current state.</summary>
public sealed class AiConsentService(
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands,
    AiConsentPolicy policy,
    AuthService auth)
{
    public async Task<CurrentUserDto> SetAsync(SetAiConsentRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (policy.Provider is not { } provider)
            throw new DomainRuleException("AI_CONSENT_NOT_REQUIRED", "No AI provider receives planning text.");
        // Agreement is to the notice the user was shown; an older one is not agreement to this one.
        if (request.Granted && request.NoticeVersion != AiConsentPolicy.NoticeVersion)
            throw new CommandConflictException("AI_CONSENT_NOTICE_CHANGED", "The notice changed. Read it again.");

        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "SET_AI_CONSENT",
            new { request.Granted, provider, AiConsentPolicy.NoticeVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var user = await context.Users.FromSqlInterpolated(
                $"SELECT * FROM \"Users\" WHERE \"Id\" = {owner} FOR UPDATE").SingleAsync(ct);
            user.AiConsentProvider = request.Granted ? provider : null;
            user.AiConsentNoticeVersion = request.Granted ? AiConsentPolicy.NoticeVersion : null;
            user.AiConsentAt = request.Granted ? now : null;
            user.AiConsentRevision++;
            user.UpdatedAt = now;
            return new CommandMutation("User", user.Id, user.AiConsentRevision, AccountEventTypes.AiConsentChanged, 1,
                JsonSerializer.Serialize(new
                {
                    granted = request.Granted, provider, noticeVersion = AiConsentPolicy.NoticeVersion
                }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await auth.GetCurrentAsync(cancellationToken);
    }

    /// <summary>Refuses when planning is model-backed and the user has not agreed to the current provider and notice.</summary>
    public static async Task RequireAsync(AppDbContext db, AiConsentPolicy policy, Guid userId,
        CancellationToken cancellationToken)
    {
        if (!policy.Required) return;
        var consent = await db.Users.AsNoTracking().Where(x => x.Id == userId)
            .Select(x => new { x.AiConsentProvider, x.AiConsentNoticeVersion }).SingleOrDefaultAsync(cancellationToken);
        if (consent is null || !policy.IsGranted(consent.AiConsentProvider, consent.AiConsentNoticeVersion))
            throw new AiConsentRequiredException();
    }
}
