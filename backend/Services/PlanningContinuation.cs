using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Planning;
using TidySense.Models;

namespace TidySense.Services;

/// <summary>
/// When the next week of a planned Goal or Project is offered, and which days it and its evidence
/// cover (029 §3, 014 §4.5). Pure: every rule about a window's dates lives here.
/// </summary>
public static class PlanningContinuationRules
{
    /// <summary>The offer opens on the window's second-to-last day: "near the end", with a day to plan before it ends.</summary>
    public const int OfferDaysBeforeEnd = 1;

    /// <summary>
    /// A week left unanswered this long after its end is no longer offered. The Goal stays; planning
    /// it again is one tap away on its page. Offering forever would become the weekly nag 014 §4.5 rules out.
    /// </summary>
    public const int OfferDaysAfterEnd = 7;

    public static bool IsOffered(PlanningWindow window, DateOnly today) =>
        window.Decision is null &&
        today >= window.EndDate.AddDays(-OfferDaysBeforeEnd) &&
        today <= window.EndDate.AddDays(OfferDaysAfterEnd);

    /// <summary>The next detailed week: from the day after this one ends, or from today once that has passed.</summary>
    public static (DateOnly Start, DateOnly End) NextWindow(PlanningWindow window, DateOnly today)
    {
        var start = today > window.EndDate ? today : window.EndDate.AddDays(1);
        return (start, start.AddDays(PlanningLimits.HorizonDays - 1));
    }

    /// <summary>The evidence of how the week went: from its first day through today, today's work included.</summary>
    public static (DateOnly Start, DateOnly End) EvidenceWindow(PlanningWindow window, DateOnly today) =>
        (window.StartDate, today < window.StartDate ? window.StartDate : today);

    /// <summary>
    /// The Goal or standalone Project an applied draft planned a week for: the scope it was asked
    /// in, else the Goal it created, else its one standalone Project. Anything else has no week to continue.
    /// </summary>
    public static (Guid? GoalId, Guid? ProjectId)? WindowScope(PlanningScope? context,
        IReadOnlyList<(string EntityType, bool Root, Guid Id)> created)
    {
        if (context is not null)
            return context.Type == PlanningContextTypes.Goal ? (context.Id, null) : (null, context.Id);
        var goal = created.Where(x => x.EntityType == PlanningEntityTypes.Goal).Select(x => (Guid?)x.Id).FirstOrDefault();
        if (goal is { } goalId) return (goalId, null);
        var projects = created.Where(x => x.EntityType == PlanningEntityTypes.Project && x.Root).ToArray();
        return projects.Length == 1 ? (null, projects[0].Id) : null;
    }
}

/// <summary>
/// Opens a planned week when a draft is applied and records what became of it (014 §4.5): a
/// continuation approved as proposed or after edits, «فعلاً نه», or a new plan for the same scope.
/// Runs inside the apply command, so the week and the work are recorded together.
/// </summary>
public static class PlanningWindows
{
    public static async Task<IReadOnlyList<CascadeEvent>> OpenAsync(AppDbContext context, Guid owner,
        (Guid? GoalId, Guid? ProjectId) scope, DateOnly start, DateOnly end, Guid draftId,
        Guid? continuing, bool edited, DateOnly today, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var events = new List<CascadeEvent>();
        PlanningWindow? previous = null;
        if (continuing is { } previousId)
        {
            previous = await context.PlanningWindows.FromSqlInterpolated(
                    $"SELECT * FROM \"PlanningWindows\" WHERE \"Id\" = {previousId} AND \"UserId\" = {owner} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("PlanningWindow", previousId);
            // «فعلاً نه» can be changed by approving the next week after all; anything else already decided it.
            if (previous.Decision is not (null or PlanningWindowDecisions.PauseOrStop))
                throw new CommandRejectedException("CONTINUATION_ALREADY_DECIDED");
            events.Add(Decide(previous, edited ? PlanningWindowDecisions.Adjust : PlanningWindowDecisions.ContinueAsIs,
                today, now));
        }

        // A new plan for a scope ends the weeks still open for it.
        var open = await context.PlanningWindows
            .Where(x => x.UserId == owner && x.Decision == null && x.Id != continuing &&
                (scope.GoalId != null ? x.GoalId == scope.GoalId : x.ProjectId == scope.ProjectId))
            .ToListAsync(cancellationToken);
        events.AddRange(open.Select(x => Decide(x, PlanningWindowDecisions.Replanned, today, now)));

        var window = new PlanningWindow
        {
            Id = Guid.NewGuid(), UserId = owner, GoalId = scope.GoalId, ProjectId = scope.ProjectId,
            StartDate = start, EndDate = end, Week = previous is null ? 1 : previous.Week + 1,
            PreviousWindowId = previous?.Id, SourceDraftId = draftId, CreatedAt = now, UpdatedAt = now
        };
        context.PlanningWindows.Add(window);
        events.Add(new CascadeEvent("PlanningWindow", window.Id, 1, PlanningEventTypes.WindowOpened, 1,
            JsonSerializer.Serialize(new { scope = Scope(window), week = window.Week }), EventActors.User));
        return events;
    }

    internal static CascadeEvent Decide(PlanningWindow window, string decision, DateOnly today, DateTimeOffset now)
    {
        window.Decision = decision;
        window.DecidedAt = now;
        window.UpdatedAt = now;
        window.Version++;
        return new CascadeEvent("PlanningWindow", window.Id, window.Version, PlanningEventTypes.ContinuationDecided, 1,
            JsonSerializer.Serialize(new
            {
                decision, week = window.Week,
                daysAfterEnd = Math.Max(0, today.DayNumber - window.EndDate.DayNumber)
            }), EventActors.User);
    }

    internal static string Scope(PlanningWindow window) => window.GoalId is null ? "PROJECT" : "GOAL";
}

/// <summary>The weeks that may be continued now, and «فعلاً نه» (029 §3).</summary>
public sealed class PlanningContinuationService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands,
    PlanningContextBuilder contexts)
{
    /// <summary>Every week offered for continuation now, with what happened in it. Nothing is generated.</summary>
    public async Task<IReadOnlyList<PlanningContinuationDto>> ListAsync(CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var today = dates.Today;
        var earliest = today.AddDays(-PlanningContinuationRules.OfferDaysAfterEnd);
        var latest = today.AddDays(PlanningContinuationRules.OfferDaysBeforeEnd);
        var windows = await db.PlanningWindows.AsNoTracking()
            .Where(x => x.UserId == owner && x.Decision == null && x.EndDate >= earliest && x.EndDate <= latest)
            .OrderBy(x => x.EndDate).ThenBy(x => x.Id).ToListAsync(cancellationToken);
        var offers = new List<PlanningContinuationDto>();
        foreach (var window in windows.Where(x => PlanningContinuationRules.IsOffered(x, today)))
            if (await OfferAsync(window, today, cancellationToken) is { } offer) offers.Add(offer);
        return offers;
    }

    /// <summary>«فعلاً نه»: no next week now. The Goal or Project and all its work stay as they are.</summary>
    public async Task<PlanningContinuationDecisionDto> DeclineAsync(Guid id, DeclinePlanningContinuationRequest request,
        string idempotencyKey, CancellationToken cancellationToken)
    {
        var now = dates.UtcNow;
        var today = dates.Today;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "DECLINE_PLANNING_CONTINUATION",
            new { id, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var window = await context.PlanningWindows.FromSqlInterpolated(
                    $"SELECT * FROM \"PlanningWindows\" WHERE \"Id\" = {id} AND \"UserId\" = {owner} FOR UPDATE")
                .SingleOrDefaultAsync(ct) ?? throw new ResourceNotFoundException("PlanningWindow", id);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, window.Version);
            if (window.Decision is not null) throw new CommandRejectedException("CONTINUATION_ALREADY_DECIDED");
            var decided = PlanningWindows.Decide(window, PlanningWindowDecisions.PauseOrStop, today, now);
            return new CommandMutation("PlanningWindow", id, window.Version, decided.EventType, 1, decided.PayloadJson, now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        var window = await db.PlanningWindows.AsNoTracking().SingleAsync(x => x.Id == id, cancellationToken);
        return new PlanningContinuationDecisionDto(window.Id, window.Decision!, window.Version);
    }

    private async Task<PlanningContinuationDto?> OfferAsync(PlanningWindow window, DateOnly today,
        CancellationToken cancellationToken)
    {
        var owner = currentUser.UserId;
        var (title, active) = window.GoalId is { } goalId
            ? await db.Goals.AsNoTracking().Where(x => x.Id == goalId && x.UserId == owner)
                .Select(x => new ValueTuple<string, bool>(x.Title, x.Status == ParentStatuses.Active)).SingleAsync(cancellationToken)
            : await db.Projects.AsNoTracking().Where(x => x.Id == window.ProjectId && x.UserId == owner)
                .Select(x => new ValueTuple<string, bool>(x.Title, x.Status == ParentStatuses.Active)).SingleAsync(cancellationToken);
        // A Goal or Project that has ended has no next week.
        if (!active) return null;
        var context = await contexts.BuildAsync(owner, window.GoalId, window.ProjectId, cancellationToken, window);
        var evidence = context.PreviousWindow!;
        return new PlanningContinuationDto(window.Id, window.Week, PlanningWindows.Scope(window),
            window.GoalId ?? window.ProjectId!.Value, title, window.StartDate, window.EndDate,
            context.WindowStart, context.WindowEnd,
            new PlanningContinuationEvidenceDto(evidence.CompletedTaskCount, evidence.CarriedTaskCount,
                evidence.DroppedTaskCount, evidence.LeftTaskCount, evidence.RoutineDoneCount, evidence.RoutineMissedCount),
            window.Version);
    }
}
