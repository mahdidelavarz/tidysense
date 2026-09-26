using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Auth;
using TidySense.Common.Commands;
using TidySense.Common.Exceptions;
using TidySense.Data;

namespace TidySense.Backend.Tests;

// Loaded by WebApplicationFactory only; this assembly is not referenced by the production app.
[ApiController]
[Authorize]
[Route("api/v1/test-delivery-contract")]
public sealed class DeliveryContractTestController(AppDbContext db, ICurrentUser currentUser) : ControllerBase
{
    [HttpPost("version/{id:guid}")]
    public async Task<IActionResult> CheckVersion(Guid id, [FromBody] VersionProbe request,
        CancellationToken cancellationToken)
    {
        var project = await db.Projects.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken);
        if (project is null) throw new ResourceNotFoundException("Project", id);
        VersionGuard.RequireMatch(id, request.ExpectedVersion, project.Version);
        return NoContent();
    }
}

public sealed record VersionProbe([param: System.ComponentModel.DataAnnotations.Range(1, long.MaxValue)] long ExpectedVersion);
