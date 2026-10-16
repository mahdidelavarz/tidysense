using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

/// <summary>When the next week is offered and which days it and its evidence cover (029 §3).</summary>
public sealed class PlanningContinuationRulesTests
{
    private static readonly DateOnly Start = new(2026, 10, 17);

    private static PlanningWindow Week(string? decision = null) =>
        new() { StartDate = Start, EndDate = Start.AddDays(6), Decision = decision };

    [Fact]
    public void The_next_week_is_offered_from_the_second_to_last_day_until_a_week_after_the_end()
    {
        var end = Start.AddDays(6);
        Assert.False(PlanningContinuationRules.IsOffered(Week(), end.AddDays(-2)));
        Assert.True(PlanningContinuationRules.IsOffered(Week(), end.AddDays(-1)));
        Assert.True(PlanningContinuationRules.IsOffered(Week(), end.AddDays(7)));
        Assert.False(PlanningContinuationRules.IsOffered(Week(), end.AddDays(8)));
        // Decided weeks are never offered again.
        Assert.False(PlanningContinuationRules.IsOffered(Week(PlanningWindowDecisions.PauseOrStop), end));
    }

    [Fact]
    public void The_next_week_follows_the_planned_one_or_starts_today_once_it_has_passed()
    {
        var end = Start.AddDays(6);
        Assert.Equal((end.AddDays(1), end.AddDays(7)), PlanningContinuationRules.NextWindow(Week(), end.AddDays(-1)));
        Assert.Equal((end.AddDays(1), end.AddDays(7)), PlanningContinuationRules.NextWindow(Week(), end));
        Assert.Equal((end.AddDays(3), end.AddDays(9)), PlanningContinuationRules.NextWindow(Week(), end.AddDays(3)));
        // The evidence is the planned week through today, today's work included.
        Assert.Equal((Start, end.AddDays(2)), PlanningContinuationRules.EvidenceWindow(Week(), end.AddDays(2)));
    }

    [Fact]
    public void A_week_belongs_to_the_scope_it_was_planned_in_else_the_created_goal_else_one_standalone_project()
    {
        var goal = Guid.NewGuid();
        var project = Guid.NewGuid();
        var context = new PlanningScope(PlanningContextTypes.Project, project, "پروژه", 1, PlanningContextTypes.Project, project);
        Assert.Equal(((Guid?)null, (Guid?)project), PlanningContinuationRules.WindowScope(context, []));
        Assert.Equal(((Guid?)goal, (Guid?)null), PlanningContinuationRules.WindowScope(null,
            [(PlanningEntityTypes.Goal, true, goal), (PlanningEntityTypes.Project, false, project)]));
        Assert.Equal(((Guid?)null, (Guid?)project), PlanningContinuationRules.WindowScope(null,
            [(PlanningEntityTypes.Project, true, project), (PlanningEntityTypes.Task, false, Guid.NewGuid())]));
        // Two standalone Projects, or only Tasks: no single plan whose week could continue.
        Assert.Null(PlanningContinuationRules.WindowScope(null,
            [(PlanningEntityTypes.Project, true, project), (PlanningEntityTypes.Project, true, Guid.NewGuid())]));
        Assert.Null(PlanningContinuationRules.WindowScope(null, [(PlanningEntityTypes.Task, true, Guid.NewGuid())]));
    }
}
