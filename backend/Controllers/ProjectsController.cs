using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Projects;
using TidySense.Common.Errors;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/projects")]
public sealed class ProjectsController(ProjectService projectService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await projectService.GetByIdAsync(id, cancellationToken));
}
