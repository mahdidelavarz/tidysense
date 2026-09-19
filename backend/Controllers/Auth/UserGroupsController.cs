using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/user-groups")]
[AdminOnly]
public class UserGroupsController : ControllerBase
{
    private readonly UserGroupService _userGroupService;

    public UserGroupsController(
        UserGroupService userGroupService)
    {
        _userGroupService = userGroupService;
    }

    [HttpPost("{userId:int}/{groupId:int}")]
    public async Task<IActionResult> Add(
        int userId,
        int groupId)
    {
        await _userGroupService.AddAsync(
            userId,
            groupId);

        return NoContent();
    }

    [HttpDelete("{userId:int}/{groupId:int}")]
    public async Task<IActionResult> Remove(
        int userId,
        int groupId)
    {
        await _userGroupService.RemoveAsync(
            userId,
            groupId);

        return NoContent();
    }
}