# Backend Snippets

## Request and controller boundary

```csharp
public sealed record CreateGoalRequest(
    [property: Required, MaxLength(200)] string Title,
    [property: Required] string DesiredOutcome);

[ApiController]
[Route("api/v1/goals")]
public sealed class GoalsController(GoalApplicationService service) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<GoalResponse>> Create(
        CreateGoalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
}
```

Controller binds HTTP and delegates. The application service owns user context, domain creation, persistence/event transaction and mapping. Route IDs are UUID strings backed by `Guid`; do not copy product fields from this illustrative shape without the owning domain contract.

## Owned read query

```csharp
return await dbContext.Goals
    .AsNoTracking()
    .Where(x => x.Id == id && x.UserId == userId)
    .Select(x => new GoalResponse(x.Id, x.Title, x.Version))
    .SingleOrDefaultAsync(cancellationToken);
```

## Domain error

```csharp
public sealed class DomainConflictException(string code, string message)
    : Exception(message)
{
    public string Code { get; } = code;
}
```

Central exception handling maps this to safe Problem Details; controllers do not repeat try/catch mappings.
