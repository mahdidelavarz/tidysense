using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Projects;

namespace TidySense.Services;

public sealed class ProjectService(AppDbContext dbContext, ICurrentUser currentUser)
{
    public async Task<ProjectDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects
            .AsNoTracking()
            .Where(x => x.Id == id && x.UserId == currentUser.UserId)
            .Select(x => new ProjectDto(
                x.Id, x.Title, x.Description, x.TargetDate, x.ReviewDate,
                x.Version, x.CreatedAt, x.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return project ?? throw new ResourceNotFoundException("Project", id);
    }
}
