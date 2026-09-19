using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.DTOs.Auth.Permissions;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/[controller]")]
[AdminOnly]
public class PermissionsController : ControllerBase
{
    private readonly PermissionService _permissionService;

    public PermissionsController(
        PermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetAll()
    {
        return Ok(
            await _permissionService.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PermissionDto>> GetById(
        int id)
    {
        return Ok(
            await _permissionService.GetByIdAsync(id));
    }

    [HttpPost]
    public async Task<ActionResult<PermissionDto>> Create(
        CreatePermissionDto dto)
    {
        var permission =
            await _permissionService.CreateAsync(dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = permission.Id },
            permission);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PermissionDto>> Update(
        int id,
        UpdatePermissionDto dto)
    {
        return Ok(
            await _permissionService.UpdateAsync(
                id,
                dto));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id)
    {
        await _permissionService.DeleteAsync(id);

        return NoContent();
    }
}