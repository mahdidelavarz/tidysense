namespace TidySense.Common.Auth;

public static class AuthConstants
{
    public const string UserIdClaim = "sub";
    public const string SessionEpochClaim = "session_epoch";
    public const int OtpLength = 6;
    public const int OtpExpirationMinutes = 5;
    public const int OtpMaxAttempts = 5;
}
