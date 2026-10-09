using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Pilot;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// Stores the answer to a pilot question. An answer is about something the user finished (a
/// planning draft they applied, a Reconcile session they completed) and is given once: a second
/// answer about the same subject changes nothing. It is research evidence, not a product
/// decision, so it writes no domain event.
/// </summary>
public sealed class PilotFeedbackService(AppDbContext db, ICurrentUser currentUser, ApplicationDateService dates)
{
    public async Task SubmitAsync(SubmitPilotFeedbackRequest request, CancellationToken cancellationToken)
    {
        // The wording belongs to the version: an answer to another wording is not an answer to this question.
        if (request.InstrumentVersion != PilotInstruments.Version)
            throw new CommandConflictException("FEEDBACK_INSTRUMENT_CHANGED", "The question changed. Reload the page.");
        var owner = currentUser.UserId;
        var exists = request.Instrument switch
        {
            PilotInstruments.PlanUsefulness => await db.DomainEvents.AsNoTracking().AnyAsync(x =>
                x.UserId == owner && x.AggregateType == "PlanningDraft" && x.AggregateId == request.SubjectId &&
                x.EventType == PlanningEventTypes.DraftApplied, cancellationToken),
            PilotInstruments.ReconcileUnderstanding => await db.ReconcileSessions.AsNoTracking().AnyAsync(x =>
                x.UserId == owner && x.Id == request.SubjectId &&
                x.Status == ReconcileSessionStatuses.Completed, cancellationToken),
            _ => throw new ArgumentException("Unknown feedback instrument.")
        };
        if (!exists) throw new ResourceNotFoundException("Feedback subject", request.SubjectId);

        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "PilotFeedbackResponses"
                ("Id", "UserId", "Instrument", "InstrumentVersion", "SubjectId", "Answer", "CreatedAt", "RetentionClass")
            VALUES ({Guid.NewGuid()}, {owner}, {request.Instrument}, {request.InstrumentVersion},
                    {request.SubjectId}, {request.Answer}, {dates.UtcNow}, {"R2"})
            ON CONFLICT ("UserId", "Instrument", "SubjectId") DO NOTHING
            """, cancellationToken);
    }
}
