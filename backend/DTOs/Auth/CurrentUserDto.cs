namespace TidySense.DTOs.Auth;

public sealed record CurrentUserDto(Guid Id, string PhoneNumber, string? DisplayName, bool SetupComplete);
