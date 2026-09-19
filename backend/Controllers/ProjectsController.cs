using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.DTOs.Projects;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectsController(ProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    [Permission("project", "read")]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetAll()
    {
        var projects = await _projectService.GetAllAsync();

        return Ok(projects);
    }

    [HttpGet("{id:int}")]
    [Permission("project", "read")]
    public async Task<ActionResult<ProjectDto>> GetById(int id)
    {
        var project = await _projectService.GetByIdAsync(id);

        return Ok(project);
    }

    [HttpPost]
    [Permission("project", "create")]
    public async Task<ActionResult<ProjectDto>> Create(
        CreateProjectDto dto)
    {
        var project = await _projectService.CreateAsync(dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = project.Id },
            project);
    }

    [HttpPut("{id:int}")]
    [Permission("project", "update")]
    public async Task<ActionResult<ProjectDto>> Update(
        int id,
        UpdateProjectDto dto)
    {
        var project = await _projectService.UpdateAsync(
            id,
            dto);

        return Ok(project);
    }

    [HttpDelete("{id:int}")]
    [Permission("project", "delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _projectService.DeleteAsync(id);

        return NoContent();
    }
}