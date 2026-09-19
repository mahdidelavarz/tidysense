using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public class UserGroupService
{
    private readonly AppDbContext _dbContext;

    public UserGroupService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        int userId,
        int groupId)
    {
        var userExists = await _dbContext.Users
            .AnyAsync(x => x.Id == userId);

        if (!userExists)
        {
            throw new ResourceNotFoundException(
                "User",
                userId);
        }

        var groupExists = await _dbContext.Groups
            .AnyAsync(x => x.Id == groupId);

        if (!groupExists)
        {
            throw new ResourceNotFoundException(
                "Group",
                groupId);
        }

        var exists = await _dbContext.UserGroups
            .AnyAsync(x =>
                x.UserId == userId &&
                x.GroupId == groupId);

        if (exists)
        {
            throw new InvalidOperationException(
                "The user is already a member of the group.");
        }

        _dbContext.UserGroups.Add(
            new UserGroup
            {
                UserId = userId,
                GroupId = groupId
            });

        await _dbContext.SaveChangesAsync();
    }

    public async Task RemoveAsync(
        int userId,
        int groupId)
    {
        var userGroup = await _dbContext.UserGroups
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.GroupId == groupId);

        if (userGroup is null)
        {
            throw new ResourceNotFoundException(
                "UserGroup",
                $"{userId}:{groupId}");
        }

        _dbContext.UserGroups.Remove(userGroup);

        await _dbContext.SaveChangesAsync();
    }
}