namespace TidySense.Common.Auth;

public static class AuthConstants
{
    public const string UserIdClaim = "sub";
    public const string SessionEpochClaim = "session_epoch";

    // The Android app sends this header with the value below on every request (ADR-008). A browser on
    // another origin cannot add it without a CORS preflight that only the allowed origins pass.
    public const string ClientHeader = "X-TidySense-Client";
    public const string NativeClient = "native";
}
