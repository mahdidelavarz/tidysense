using Microsoft.EntityFrameworkCore;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public sealed class UserService(AppDbContext dbContext)
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Users.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<User?> GetByPhoneNumberAsync(string phoneNumber, CancellationToken cancellationToken = default) =>
        dbContext.Users.SingleOrDefaultAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

    public async Task<User> GetOrCreateAsync(string rawPhoneNumber, CancellationToken cancellationToken)
    {
        var phoneNumber = NormalizeIranianMobile(rawPhoneNumber);
        var existing = await GetByPhoneNumberAsync(phoneNumber, cancellationToken);
        if (existing is not null) return existing;

        var user = new User
        {
            Id = Guid.NewGuid(),
            PhoneNumber = phoneNumber,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public static string NormalizeIranianMobile(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0098")) digits = digits[4..];
        else if (digits.StartsWith("98")) digits = digits[2..];
        else if (digits.StartsWith('0')) digits = digits[1..];
        if (digits.Length != 10 || !digits.StartsWith('9'))
            throw new ArgumentException("A valid Iranian mobile number is required.", nameof(value));
        return $"+98{digits}";
    }
}
