using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Auth;
using TidySense.DTOs.Auth.Users;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Route("api/[controller]")]
[AdminOnly]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _userService.GetAllAsync();

        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(
        int id)
    {
        var user = await _userService.GetDtoByIdAsync(id);

        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(
        CreateUserDto dto)
    {
        var user = await _userService.CreateAsync(dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = user.Id },
            user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(
        int id,
        UpdateUserDto dto)
    {
        var user = await _userService.UpdateAsync(
            id,
            dto);

        return Ok(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _userService.DeleteAsync(id);

        return NoContent();
    }
}