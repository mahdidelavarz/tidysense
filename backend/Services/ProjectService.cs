using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Events;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Common;
using TidySense.DTOs.Projects;
using TidySense.Models;

namespace TidySense.Services;

public sealed class ProjectService(
    AppDbContext db,
    ICurrentUser currentUser,
    ApplicationDateService dates,
    CommandExecutionService commands)
{
    public async Task<CursorPageDto<ProjectDto>> ListAsync(string? status, string? cursor, int limit,
        CancellationToken cancellationToken)
    {
        if (status is not null && status is not (ParentStatuses.Active or ParentStatuses.Completed or ParentStatuses.Stopped))
            throw new ArgumentException("status is invalid.");
        var after = ParentCommandSupport.DecodeCursor(cursor);
        var query = db.Projects.AsNoTracking().Where(x => x.UserId == currentUser.UserId);
        if (status is not null) query = query.Where(x => x.Status == status);
        if (after is { } point)
            query = query.Where(x => x.CreatedAt < point.CreatedAt ||
                (x.CreatedAt == point.CreatedAt && x.Id.CompareTo(point.Id) < 0));
        var rows = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Take(limit + 1).ToListAsync(cancellationToken);
        var hasMore = rows.Count > limit;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        var next = hasMore && rows.Count > 0
            ? ParentCommandSupport.EncodeCursor(rows[^1].CreatedAt, rows[^1].Id) : null;
        return new CursorPageDto<ProjectDto>(rows.Select(ToDto).ToArray(), new PageInfoDto(next, hasMore));
    }

    public async Task<ProjectDto> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        ToDto(await OwnedAsync(id, cancellationToken));

    public async Task<ProjectDto> CreateAsync(CreateProjectRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var meaning = ParentCommandSupport.OptionalText(request.CompletionMeaning, 2000, "completionMeaning");
        var now = dates.UtcNow;
        var review = dates.InitialReview(request.TargetDate, request.ReviewDate, 30);
        var id = Guid.NewGuid();
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "CREATE_PROJECT",
            new { title, completionMeaning = meaning, request.GoalId, request.TargetDate, request.ReviewDate }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            if (request.GoalId is { } goalId)
            {
                var goal = await GoalService.LockOwnedAsync(context, goalId, owner, ct);
                if (goal.Status != ParentStatuses.Active)
                    throw new CommandRejectedException("PARENT_NOT_ACTIVE");
            }
            context.Projects.Add(new Project
            {
                Id = id, UserId = owner, GoalId = request.GoalId, Title = title,
                CompletionMeaning = meaning, TargetDate = request.TargetDate,
                ReviewDate = review.Date, ReviewDateSource = review.Source,
                CreatedAt = now, UpdatedAt = now
            });
            var payload = JsonSerializer.Serialize(new
            {
                source = CreationSources.Manual,
                reviewDateSource = review.Source,
                parentScope = request.GoalId is null ? "STANDALONE" : "GOAL"
            });
            return new CommandMutation("Project", id, 1, ParentEventTypes.ProjectCreated, 1,
                payload, now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(result.AggregateId!.Value, cancellationToken);
    }

    public async Task<ProjectDto> UpdateAsync(Guid id, UpdateProjectRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var title = ParentCommandSupport.RequiredText(request.Title, 200, "title");
        var meaning = ParentCommandSupport.OptionalText(request.CompletionMeaning, 2000, "completionMeaning");
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "UPDATE_PROJECT",
            new { id, title, completionMeaning = meaning, request.GoalId, request.TargetDate, request.ReviewDate, request.ExpectedVersion }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Projects.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Project", id);
            foreach (var goalId in new[] { snapshot.GoalId, request.GoalId }.OfType<Guid>().Distinct().Order())
            {
                var goal = await GoalService.LockOwnedAsync(context, goalId, owner, ct);
                if (goalId == request.GoalId && goal.Status != ParentStatuses.Active)
                    throw new CommandRejectedException("PARENT_NOT_ACTIVE");
            }
            var project = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, project.Version);
            if (project.Status != ParentStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            var changed = new List<string>();
            if (project.Title != title) { project.Title = title; changed.Add("title"); }
            if (project.CompletionMeaning != meaning) { project.CompletionMeaning = meaning; changed.Add("completionMeaning"); }
            if (project.GoalId != request.GoalId) { project.GoalId = request.GoalId; changed.Add("goalId"); }
            if (project.TargetDate != request.TargetDate) { project.TargetDate = request.TargetDate; changed.Add("targetDate"); }
            if (request.ReviewDate is { } reviewDate && project.ReviewDate != reviewDate)
            {
                project.ReviewDate = reviewDate;
                project.ReviewDateSource = ReviewDateSources.User;
                changed.Add("reviewDate");
            }
            if (changed.Count == 0) throw new CommandRejectedException("NO_CHANGES");
            project.Version++;
            project.UpdatedAt = now;
            return new CommandMutation("Project", id, project.Version, ParentEventTypes.ProjectUpdated, 1,
                JsonSerializer.Serialize(new { changedFields = changed }), now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<TerminalPreviewDto> PreviewTerminalAsync(Guid id, TerminalPreviewRequest request,
        CancellationToken cancellationToken)
    {
        RequireProjectTerminal(request.TargetStatus);
        var project = await OwnedAsync(id, cancellationToken);
        VersionGuard.RequireMatch(id, request.ExpectedVersion, project.Version);
        if (project.Status != ParentStatuses.Active)
            throw new DomainRuleException("RESOURCE_NOT_ACTIVE", "Project is not active.");
        var blockers = await ProjectBlockersAsync(db, id, currentUser.UserId, cancellationToken);
        return Preview(project, request.TargetStatus, blockers);
    }

    public async Task<ProjectDto> TerminalAsync(Guid id, TerminalCommandRequest request, string idempotencyKey,
        CancellationToken cancellationToken)
    {
        RequireProjectTerminal(request.TargetStatus);
        var now = dates.UtcNow;
        var identity = ParentCommandSupport.Command(currentUser.UserId, idempotencyKey, "TERMINATE_PROJECT",
            new { id, request.TargetStatus, request.ExpectedVersion, request.PreviewHash }, now);
        var result = await commands.ExecuteAsync(identity, async (context, owner, ct) =>
        {
            var snapshot = await context.Projects.AsNoTracking().SingleOrDefaultAsync(
                x => x.Id == id && x.UserId == owner, ct)
                ?? throw new ResourceNotFoundException("Project", id);
            if (snapshot.GoalId is { } goalId)
                await GoalService.LockOwnedAsync(context, goalId, owner, ct);
            var project = await LockOwnedAsync(context, id, owner, ct);
            VersionGuard.RequireMatch(id, request.ExpectedVersion, project.Version);
            if (project.Status != ParentStatuses.Active)
                throw new CommandRejectedException("RESOURCE_NOT_ACTIVE");
            var blockers = await ProjectBlockersAsync(context, id, owner, ct);
            var currentPreview = Preview(project, request.TargetStatus, blockers);
            if (!CryptographicOperations.FixedTimeEquals(
                    Convert.FromHexString(currentPreview.PreviewHash), Convert.FromHexString(request.PreviewHash)))
                throw new CommandConflictException("CONFIRMATION_STALE", "The terminal preview changed.");
            if (blockers.Count > 0)
                throw new CommandRejectedException("PARENT_HAS_ACTIVE_CHILDREN");
            project.Status = request.TargetStatus;
            project.TerminalAt = now;
            project.UpdatedAt = now;
            project.Version++;
            var eventType = request.TargetStatus == ParentStatuses.Completed
                ? ParentEventTypes.ProjectCompleted : ParentEventTypes.ProjectStopped;
            return new CommandMutation("Project", id, project.Version, eventType, 1, "{}", now);
        }, cancellationToken);
        ParentCommandSupport.RequireSuccess(result);
        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<Project> OwnedAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Projects.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken)
        ?? throw new ResourceNotFoundException("Project", id);

    internal static async Task<Project> LockOwnedAsync(AppDbContext context, Guid id, Guid userId,
        CancellationToken cancellationToken) =>
        await context.Projects.FromSqlInterpolated($"SELECT * FROM \"Projects\" WHERE \"Id\" = {id} AND \"UserId\" = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new ResourceNotFoundException("Project", id);

    private static Task<List<TerminalBlockerDto>> ProjectBlockersAsync(AppDbContext context,
        Guid id, Guid userId, CancellationToken cancellationToken) => context.Tasks.AsNoTracking()
        .Where(x => x.ProjectId == id && x.UserId == userId && x.Status == TaskStatuses.Active)
        .OrderBy(x => x.Id)
        .Select(x => new TerminalBlockerDto("Task", x.Id, x.Status, x.Version))
        .ToListAsync(cancellationToken);

    private static TerminalPreviewDto Preview(Project project, string target,
        IReadOnlyList<TerminalBlockerDto> blockers) =>
        new(project.Id, "Project", project.Status, target, project.Version,
            blockers.Count == 0, blockers, ParentCommandSupport.PreviewHash(project.Id, "Project",
                project.Status, target, project.Version, blockers));

    private static void RequireProjectTerminal(string status)
    {
        if (!ParentStatuses.IsProjectTerminal(status)) throw new ArgumentException("targetStatus is invalid.");
    }

    private static ProjectDto ToDto(Project value) => new(value.Id, value.GoalId, value.Title,
        value.CompletionMeaning, value.Status, value.TargetDate, value.ReviewDate,
        value.ReviewDateSource, value.Source, value.Version, value.CreatedAt, value.UpdatedAt,
        value.TerminalAt);
}
