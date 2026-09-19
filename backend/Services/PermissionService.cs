using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Auth.Permissions;
using TidySense.Models;

namespace TidySense.Services;

public class PermissionService
{
    private readonly AppDbContext _dbContext;
    private readonly IMapper _mapper;

    public PermissionService(
        AppDbContext dbContext,
        IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    public async Task<IEnumerable<PermissionDto>> GetAllAsync()
    {
        return await _dbContext.Permissions
            .AsNoTracking()
            .OrderBy(x => x.Resource)
            .ThenBy(x => x.Action)
            .ProjectTo<PermissionDto>(
                _mapper.ConfigurationProvider)
            .ToListAsync();
    }

    public async Task<PermissionDto> GetByIdAsync(int id)
    {
        var permission = await _dbContext.Permissions
            .AsNoTracking()
            .Where(x => x.Id == id)
            .ProjectTo<PermissionDto>(
                _mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        if (permission is null)
        {
            throw new ResourceNotFoundException("Permission", id);
        }

        return permission;
    }

    public async Task<PermissionDto> CreateAsync(
        CreatePermissionDto dto)
    {
        var resource = dto.Resource.Trim().ToLowerInvariant();
        var action = dto.Action.Trim().ToLowerInvariant();

        var exists = await _dbContext.Permissions
            .AnyAsync(x =>
                x.Resource == resource &&
                x.Action == action);

        if (exists)
        {
            throw new InvalidOperationException("The permission already exists.");
        }

        var permission = _mapper.Map<Permission>(dto);

        permission.Resource = resource;
        permission.Action = action;
        permission.CreatedAt = DateTime.UtcNow;
        permission.IsDeleted = false;

        _dbContext.Permissions.Add(permission);

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<PermissionDto>(permission);
    }

    public async Task<PermissionDto> UpdateAsync(
        int id,
        UpdatePermissionDto dto)
    {
        var permission = await _dbContext.Permissions
            .FirstOrDefaultAsync(x => x.Id == id);

        if (permission is null)
        {
            throw new ResourceNotFoundException("Permission", id);
        }

        var resource = dto.Resource.Trim().ToLowerInvariant();
        var action = dto.Action.Trim().ToLowerInvariant();

        var duplicate = await _dbContext.Permissions
            .AnyAsync(x =>
                x.Id != id &&
                x.Resource == resource &&
                x.Action == action);

        if (duplicate)
        {
            throw new InvalidOperationException("The permission already exists.");
        }

        _mapper.Map(dto, permission);

        permission.Resource = resource;
        permission.Action = action;
        permission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<PermissionDto>(permission);
    }

    public async Task DeleteAsync(int id)
    {
        var permission = await _dbContext.Permissions
            .FirstOrDefaultAsync(x => x.Id == id);

        if (permission is null)
        {
            throw new ResourceNotFoundException("Permission", id);
        }

        permission.IsDeleted = true;
        permission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
    }
}