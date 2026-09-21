namespace TidySense.Common.Auth;

public interface ICurrentUser
{
    Guid UserId { get; }
}
