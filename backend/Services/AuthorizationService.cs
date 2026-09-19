using Microsoft.EntityFrameworkCore;
using TidySense.Data;

namespace TidySense.Services;

public class AuthorizationService
{
    private readonly AppDbContext _dbContext;

    public AuthorizationService(
        AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> HasPermissionAsync(
        int userId,
        string resource,
        string action)
    {
        return await _dbContext.UserGroups
            .Where(x => x.UserId == userId)
            .SelectMany(x =>
                x.Group.GroupPermissions)
            .AnyAsync(x =>
                x.Permission.Resource == resource &&
                x.Permission.Action == action);
    }
}