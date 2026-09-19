using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using TidySense.Common.Exceptions;
using TidySense.Data;
using TidySense.DTOs.Auth.Users;
using TidySense.Models;

namespace TidySense.Services;

public class UserService
{
    private readonly AppDbContext _dbContext;
    private readonly IMapper _mapper;

    public UserService(
        AppDbContext dbContext,
        IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    // --------------------------------------------------
    // Authentication
    // --------------------------------------------------

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<User?> GetByPhoneNumberAsync(
        string phoneNumber)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(x =>
                x.PhoneNumber == phoneNumber);
    }

    // public async Task<User> GetOrCreateAsync(
    //     string phoneNumber)
    // {
    //     var normalizedPhoneNumber =
    //         phoneNumber.Trim();

    //     var user =
    //         await GetByPhoneNumberAsync(
    //             normalizedPhoneNumber);

    //     if (user is not null)
    //     {
    //         return user;
    //     }

    //     user = new User
    //     {
    //         PhoneNumber = normalizedPhoneNumber,
    //         IsActive = true,
    //         IsDeleted = false,
    //         CreatedAt = DateTime.UtcNow
    //     };

    //     _dbContext.Users.Add(user);

    //     await _dbContext.SaveChangesAsync();

    //     return user;
    // }

    // --------------------------------------------------
    // User management
    // --------------------------------------------------

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        return await _dbContext.Users
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .ProjectTo<UserDto>(
                _mapper.ConfigurationProvider)
            .ToListAsync();
    }

    public async Task<UserDto> GetDtoByIdAsync(int id)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(x => x.Id == id)
            .ProjectTo<UserDto>(
                _mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        if (user is null)
        {
            throw new ResourceNotFoundException(
                "User",
                id);
        }

        return user;
    }

    public async Task<UserDto> CreateAsync(
        CreateUserDto dto)
    {
        var phoneNumber = dto.PhoneNumber.Trim();

        var exists = await _dbContext.Users
            .AnyAsync(x =>
                x.PhoneNumber == phoneNumber);

        if (exists)
        {
            throw new InvalidOperationException(
                "A user with this phone number already exists.");
        }

        var user = _mapper.Map<User>(dto);

        user.PhoneNumber = phoneNumber;
        user.IsActive = true;
        user.IsDeleted = false;
        user.CreatedAt = DateTime.UtcNow;

        _dbContext.Users.Add(user);

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> UpdateAsync(
        int id,
        UpdateUserDto dto)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == id);

        if (user is null)
        {
            throw new ResourceNotFoundException(
                "User",
                id);
        }

        _mapper.Map(dto, user);

        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return _mapper.Map<UserDto>(user);
    }

    public async Task DeleteAsync(int id)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == id);

        if (user is null)
        {
            throw new ResourceNotFoundException(
                "User",
                id);
        }

        user.IsDeleted = true;
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
    }
}