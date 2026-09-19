namespace TidySense.Common;

public static class AuthConstants
{
    public const string AuthenticationScheme = "TidySense";

    public const string SessionTokenClaim = "session_token";

    public const string UserIdClaim = "user_id";

    public const string SessionCookieName = "TidySense.Session";

    public const int OtpLength = 6;

    public const int OtpExpirationMinutes = 5;

    public const int OtpMaxAttempts = 5;

    public const int SessionExpirationHours = 8;
}