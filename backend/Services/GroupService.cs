using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Auth.Groups;
using TidySense.Models;

namespace TidySense.Services;

public class GroupService
{
    private readonly AppDbContext _dbContext;
    private readonly IMapper _mapper;

    public GroupService(
        AppDbContext dbContext,
        IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    public async Task<IEnumerable<GroupDto>> GetAllAsync()
    {
        return await _dbContext.Groups
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ProjectTo<GroupDto>(_mapper.ConfigurationProvider)
            .ToListAsync();
    }

    public async Task<GroupDto> GetByIdAsync(int id)
    {
        var group = await _dbContext.Groups
            .AsNoTracking()
            .Where(x => x.Id == id)
            .ProjectTo<GroupDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        if (group is null)
        {
            throw new ResourceNotFoundException(
                "Group",
                id);
        }

        return group;
    }

    public async Task<GroupDto> CreateAsync(
        CreateGroupDto dto)
    {
        var name = dto.Name.Trim();

        var exists = await _dbContext.Groups
            .AnyAsync(x => x.Name == name);

        if (exists)
        {
            throw new InvalidOperationException(
                "The group already exists.");
        }

        var group = _mapper.Map<Group>(dto);

        group.Name = name;
        group.CreatedAt = DateTime.UtcNow;
        group.IsDeleted = false;

        _dbContext.Groups.Add(group);

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<GroupDto>(group);
    }

    public async Task<GroupDto> UpdateAsync(
        int id,
        UpdateGroupDto dto)
    {
        var group = await _dbContext.Groups
            .FirstOrDefaultAsync(x => x.Id == id);

        if (group is null)
        {
            throw new ResourceNotFoundException(
                "Group",
                id);
        }

        var name = dto.Name.Trim();

        var duplicate = await _dbContext.Groups
            .AnyAsync(x =>
                x.Id != id &&
                x.Name == name);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "The group already exists.");
        }

        _mapper.Map(dto, group);

        group.Name = name;
        group.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<GroupDto>(group);
    }

    public async Task DeleteAsync(int id)
    {
        var group = await _dbContext.Groups
            .FirstOrDefaultAsync(x => x.Id == id);

        if (group is null)
        {
            throw new ResourceNotFoundException(
                "Group",
                id);
        }

        group.IsDeleted = true;
        group.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
    }

}