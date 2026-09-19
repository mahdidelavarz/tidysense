using AutoMapper;
using TidySense.DTOs.Auth.Groups;
using TidySense.DTOs.Auth.Permissions;
using TidySense.DTOs.Auth.Users;
using TidySense.DTOs.Projects;
using TidySense.Models;

namespace TidySense.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Projects
        CreateMap<Project, ProjectDto>();
        CreateMap<CreateProjectDto, Project>();
        CreateMap<UpdateProjectDto, Project>();

        // Users
        CreateMap<User, UserDto>();
        CreateMap<CreateUserDto, User>();
        CreateMap<UpdateUserDto, User>();

        // Groups
        CreateMap<Group, GroupDto>();
        CreateMap<CreateGroupDto, Group>();
        CreateMap<UpdateGroupDto, Group>();

        // Permissions
        CreateMap<Permission, PermissionDto>();
        CreateMap<CreatePermissionDto, Permission>();
        CreateMap<UpdatePermissionDto, Permission>();
    }
}