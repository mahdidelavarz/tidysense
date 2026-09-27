using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.DTOs.Projects;
using TidySense.DTOs.Common;
using TidySense.Common.Errors;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/projects")]
public sealed class ProjectsController(ProjectService projectService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CursorPageDto<ProjectDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPageDto<ProjectDto>>> List(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await projectService.ListAsync(status, cursor, limit, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await projectService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await projectService.CreateAsync(request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/projects/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, UpdateProjectRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await projectService.UpdateAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/terminal-preview")]
    [ProducesResponseType<TerminalPreviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TerminalPreviewDto>> PreviewTerminal(Guid id,
        TerminalPreviewRequest request, CancellationToken cancellationToken) =>
        Ok(await projectService.PreviewTerminalAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/terminal")]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProjectDto>> Terminal(Guid id, TerminalCommandRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await projectService.TerminalAsync(id, request, idempotencyKey, cancellationToken));
}
