using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Projects;
using TidySense.Models;

namespace TidySense.Services;

public class ProjectService
{
    private readonly AppDbContext _dbContext;
    private readonly IMapper _mapper;

    public ProjectService(
        AppDbContext dbContext,
        IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    public async Task<IEnumerable<ProjectDto>> GetAllAsync()
    {
        return await _dbContext.Projects
            .AsNoTracking()
            .ProjectTo<ProjectDto>(
                _mapper.ConfigurationProvider)
            .ToListAsync();
    }

    public async Task<ProjectDto> GetByIdAsync(int id)
    {
        var project = await _dbContext.Projects
            .AsNoTracking()
            .Where(x => x.Id == id)
            .ProjectTo<ProjectDto>(
                _mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        return project
            ?? throw new ResourceNotFoundException(
                "Project",
                id);
    }

    public async Task<ProjectDto> CreateAsync(
        CreateProjectDto dto)
    {
        var project = _mapper.Map<Project>(dto);

        project.IsDeleted = false;

        _dbContext.Projects.Add(project);

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<ProjectDto>(project);
    }

    public async Task<ProjectDto> UpdateAsync(
        int id,
        UpdateProjectDto dto)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(x => x.Id == id);

        if (project is null)
        {
            throw new ResourceNotFoundException(
                "Project",
                id);
        }

        _mapper.Map(dto, project);

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<ProjectDto>(project);
    }

    public async Task DeleteAsync(int id)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(x => x.Id == id);

        if (project is null)
        {
            throw new ResourceNotFoundException(
                "Project",
                id);
        }

        project.IsDeleted = true;

        await _dbContext.SaveChangesAsync();
    }
}