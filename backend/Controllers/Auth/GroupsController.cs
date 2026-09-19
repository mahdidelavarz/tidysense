using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.DTOs.Auth.Groups;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/[controller]")]
[AdminOnly]
public class GroupsController : ControllerBase
{
    private readonly GroupService _groupService;

    public GroupsController(
        GroupService groupService)
    {
        _groupService = groupService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroupDto>>> GetAll()
    {
        var groups = await _groupService.GetAllAsync();

        return Ok(groups);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GroupDto>> GetById(
        int id)
    {
        var group = await _groupService.GetByIdAsync(id);

        return Ok(group);
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> Create(
        CreateGroupDto dto)
    {
        var group = await _groupService.CreateAsync(dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = group.Id },
            group);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<GroupDto>> Update(
        int id,
        UpdateGroupDto dto)
    {
        var group = await _groupService.UpdateAsync(
            id,
            dto);

        return Ok(group);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id)
    {
        await _groupService.DeleteAsync(id);

        return NoContent();
    }
}