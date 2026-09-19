using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/group-permissions")]
[AdminOnly]
public class GroupPermissionsController : ControllerBase
{
    private readonly GroupPermissionService _groupPermissionService;

    public GroupPermissionsController(
        GroupPermissionService groupPermissionService)
    {
        _groupPermissionService = groupPermissionService;
    }

    [HttpPost("{groupId:int}/{permissionId:int}")]
    public async Task<IActionResult> Add(
        int groupId,
        int permissionId)
    {
        await _groupPermissionService.AddAsync(
            groupId,
            permissionId);

        return NoContent();
    }

    [HttpDelete("{groupId:int}/{permissionId:int}")]
    public async Task<IActionResult> Remove(
        int groupId,
        int permissionId)
    {
        await _groupPermissionService.RemoveAsync(
            groupId,
            permissionId);

        return NoContent();
    }
}