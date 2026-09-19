using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public class GroupPermissionService
{
    private readonly AppDbContext _dbContext;

    public GroupPermissionService(
        AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        int groupId,
        int permissionId)
    {
        var groupExists = await _dbContext.Groups
            .AnyAsync(x => x.Id == groupId);

        if (!groupExists)
        {
            throw new ResourceNotFoundException(
                "Group",
                groupId);
        }

        var permissionExists = await _dbContext.Permissions
            .AnyAsync(x => x.Id == permissionId);

        if (!permissionExists)
        {
            throw new ResourceNotFoundException(
                "Permission",
                permissionId);
        }

        var exists = await _dbContext.GroupPermissions
            .AnyAsync(x =>
                x.GroupId == groupId &&
                x.PermissionId == permissionId);

        if (exists)
        {
            throw new InvalidOperationException(
                "The permission is already assigned to the group.");
        }

        var groupPermission = new GroupPermission
        {
            GroupId = groupId,
            PermissionId = permissionId
        };

        _dbContext.GroupPermissions.Add(groupPermission);

        await _dbContext.SaveChangesAsync();
    }

    public async Task RemoveAsync(
        int groupId,
        int permissionId)
    {
        var groupPermission =
            await _dbContext.GroupPermissions
                .FirstOrDefaultAsync(x =>
                    x.GroupId == groupId &&
                    x.PermissionId == permissionId);

        if (groupPermission is null)
        {
            throw new ResourceNotFoundException(
                "GroupPermission",
                $"{groupId}:{permissionId}");
        }

        _dbContext.GroupPermissions.Remove(
            groupPermission);

        await _dbContext.SaveChangesAsync();
    }
}