using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Feedback;
using TidySense.Models;
using TidySense.Services.Operations;

namespace TidySense.Services;

/// <summary>
/// Decides whether to ask how satisfied the user was with an AI response, and records the
/// prompt, its answer or its closing (Discussion 027 §4, §8, §10).
///
/// A planning draft is asked about only once it ended without being applied (cancelled or
/// replaced): an applied draft gets the H1 pilot question instead, so no plan is asked about
/// twice. During the pilot every such draft is asked, at most once per account and local day;
/// an account's first one is therefore always asked. After the pilot the rule samples instead.
/// It records research evidence, not a product decision, so it writes no domain event.
/// </summary>
public sealed class AiResponseFeedbackService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    IOptionsMonitor<PilotOptions> pilot)
{
    public async Task<AiResponseFeedbackPromptDto> RequestAsync(RequestAiResponseFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Surface != AiResponseFeedbackSurfaces.PlanningDraft)
            throw new ArgumentException("Unknown feedback surface.");
        var owner = currentUser.UserId;
        var status = await db.PlanningDrafts.AsNoTracking()
            .Where(x => x.Id == request.SubjectId && x.UserId == owner)
            .Select(x => x.Status).SingleOrDefaultAsync(cancellationToken)
            ?? throw new ResourceNotFoundException("Planning draft", request.SubjectId);
        if (status is not (PlanningDraftStatuses.Cancelled or PlanningDraftStatuses.Superseded)) return None;

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        // One decision at a time per account, so two drafts ended together cannot both take the day.
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtext({"ai-feedback:" + owner}))", cancellationToken);
        var existing = await db.AiResponseFeedback.AsNoTracking()
            .Where(x => x.UserId == owner && x.Surface == request.Surface && x.SubjectId == request.SubjectId)
            .Select(x => new { x.Id, x.Outcome }).SingleOrDefaultAsync(cancellationToken);
        // Asked once per response: a reload shows the same open prompt, never a second one.
        if (existing is not null)
            return existing.Outcome == AiResponseFeedbackOutcomes.Shown ? Prompt(existing.Id) : None;

        var today = dates.Today;
        var earlier = db.AiResponseFeedback.Where(x => x.UserId == owner && x.Surface == request.Surface);
        var settings = pilot.CurrentValue.AiResponseFeedback;
        if (settings.CoverageFirst)
        {
            if (await earlier.AnyAsync(x => x.ShownOn == today, cancellationToken)) return None;
        }
        else if (await earlier.AnyAsync(cancellationToken) && Random.Shared.NextDouble() >= settings.SampleRate)
        {
            return None;
        }

        var feedback = new AiResponseFeedback
        {
            Id = Guid.NewGuid(), UserId = owner, Surface = request.Surface, SubjectId = request.SubjectId,
            InstrumentVersion = AiResponseFeedbackInstrument.Version, ShownOn = today, ShownAt = dates.UtcNow
        };
        db.AiResponseFeedback.Add(feedback);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Prompt(feedback.Id);
    }

    public async Task AnswerAsync(Guid promptId, AnswerAiResponseFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        // The wording belongs to the version: an answer to another wording is not an answer to this question.
        if (request.InstrumentVersion != AiResponseFeedbackInstrument.Version)
            throw new CommandConflictException("FEEDBACK_INSTRUMENT_CHANGED", "The question changed. Reload the page.");
        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        if (reason is not null && request.Rating > AiResponseFeedbackInstrument.ReasonMaxRating)
            throw new ArgumentException("A reason is asked only for a low rating.");
        await RespondAsync(promptId, AiResponseFeedbackOutcomes.Answered, request.Rating, reason, cancellationToken);
    }

    /// <summary>Closing is a non-response, never a rating.</summary>
    public Task CloseAsync(Guid promptId, CancellationToken cancellationToken) =>
        RespondAsync(promptId, AiResponseFeedbackOutcomes.Closed, null, null, cancellationToken);

    private async Task RespondAsync(Guid promptId, string outcome, int? rating, string? reason,
        CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var now = dates.UtcNow;
        var changed = await db.AiResponseFeedback
            .Where(x => x.Id == promptId && x.UserId == owner && x.Outcome == AiResponseFeedbackOutcomes.Shown)
            .ExecuteUpdateAsync(x => x
                .SetProperty(f => f.Outcome, outcome)
                .SetProperty(f => f.Rating, rating)
                .SetProperty(f => f.Reason, reason)
                .SetProperty(f => f.RespondedAt, now), cancellationToken);
        if (changed == 1) return;
        if (!await db.AiResponseFeedback.AnyAsync(x => x.Id == promptId && x.UserId == owner, cancellationToken))
            throw new ResourceNotFoundException("Feedback prompt", promptId);
        throw new CommandConflictException("FEEDBACK_ALREADY_GIVEN", "This prompt was already answered or closed.");
    }

    private static readonly AiResponseFeedbackPromptDto None = new(null, AiResponseFeedbackInstrument.Version);

    private static AiResponseFeedbackPromptDto Prompt(Guid id) => new(id, AiResponseFeedbackInstrument.Version);
}
