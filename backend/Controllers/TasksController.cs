using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TidySense.Common.Errors;
using TidySense.DTOs.Common;
using TidySense.DTOs.Tasks;
using TidySense.Services;

namespace TidySense.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/tasks")]
public sealed class TasksController(TaskService tasks) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CursorPageDto<TaskDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPageDto<TaskDto>>> List(
        [FromQuery] string? status, [FromQuery] string? cursor,
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await tasks.ListAsync(status, cursor, limit, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await tasks.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<TaskDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Create(CreateTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await tasks.CreateAsync(request, idempotencyKey, cancellationToken);
        return Created($"/api/v1/tasks/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Update(Guid id, UpdateTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await tasks.UpdateAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Complete(Guid id, CompleteTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await tasks.CompleteAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/drop")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Drop(Guid id, DropTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await tasks.DropAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/carry")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Carry(Guid id, CarryTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await tasks.CarryAsync(id, request, idempotencyKey, cancellationToken));

    [HttpPost("{id:guid}/restore")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiProblemDto>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TaskDto>> Restore(Guid id, RestoreTaskRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required] string idempotencyKey,
        CancellationToken cancellationToken) =>
        Ok(await tasks.RestoreAsync(id, request, idempotencyKey, cancellationToken));
}
