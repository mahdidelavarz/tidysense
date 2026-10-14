namespace TidySense.Services;

/// <summary>
/// The privacy notice users read. Its wording lives in the frontend privacy page; its facts come
/// from configuration through <c>GET /api/v1/pilot/notice</c>. Changing the wording changes the version.
/// </summary>
public static class PrivacyNotice
{
    public const string Version = "2026-10-14.1";
}
