using Microsoft.EntityFrameworkCore;
using TidySense.Data;
using TidySense.Models;

namespace TidySense.Services;

public sealed class UserService(AppDbContext dbContext)
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Users.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public static string NormalizeIranianMobile(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("A valid Iranian mobile number is required.", nameof(value));
        var normalizedDigits = new string(value.Trim().Select(c => c switch
        {
            >= '۰' and <= '۹' => (char)('0' + c - '۰'),
            >= '٠' and <= '٩' => (char)('0' + c - '٠'),
            _ => c
        }).ToArray());
        var digits = normalizedDigits switch
        {
            { Length: 11 } s when s.StartsWith("09") => s[1..],
            { Length: 12 } s when s.StartsWith("98") => s[2..],
            { Length: 13 } s when s.StartsWith("+98") => s[3..],
            _ => string.Empty
        };
        if (digits.Length != 10 || !digits.StartsWith('9') || !digits.All(char.IsAsciiDigit))
            throw new ArgumentException("A valid Iranian mobile number is required.", nameof(value));
        return $"+98{digits}";
    }
}
