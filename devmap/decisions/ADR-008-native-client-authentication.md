# ADR-008: Native Client Authentication

- Status: Accepted (2026-10-28) — implemented in MOB-01; the owner's approval is the merge of its PR.
- Date: 2026-10-22

## Context

ADR-001 authenticates the browser with a JWT in a secure `HttpOnly`, same-origin cookie, and `ApiRequestSecurityMiddleware` rejects every `/api/v1` write that carries neither an allowed `Origin` nor an allowed `Referer`. A React Native app is not a browser:

- it has no origin, so every write it sends is refused with `403 FORBIDDEN` today;
- a native cookie jar exists, but its persistence and clearing differ between Android and iOS and cannot be inspected or wiped reliably from JavaScript;
- the cookie and Origin checks exist to stop cross-site request forgery, which needs a browser that attaches credentials automatically. A token the app adds itself to a header is not sent by any other site.

So "the backend stays unchanged" is not true for a mobile client. The change must be small and must not weaken the browser path.

## Decision

1. The Android app sends `X-TidySense-Client: native` on every request. A browser page on another origin cannot add this header without a CORS preflight, and only the allowed origins pass it.
2. It signs in through `POST /api/v1/auth/otp/verify-native` (same request and limits as `otp/verify`, same header required, `400 VALIDATION_FAILED` without it). The response is `NativeSessionDto { user, accessToken, expiresAt }` and no cookie is written. `otp/verify` is unchanged.
3. Afterwards it sends the same JWT as `Authorization: Bearer <token>`. `JwtCookieEvents.OnMessageReceived` takes the cookie first and the bearer header only when no cookie is present. Validation is unchanged: same signing key, same `sessionEpoch` check, same lifetime (`Jwt:LifetimeMinutes`, 14 days).
4. `ApiRequestSecurityMiddleware` skips the Origin/Referer check only for a request with the native header **and** no auth cookie. A bearer token alone does not skip it. The `application/json` requirement stays for every client.
5. The first native sign-in stamps `Users.FirstNativeSignInAt` once, so pilot analysis can split before and after the app (Discussion 030 §6). Erasure deletes the user row, so nothing more is needed there.
6. The app stores the token only in `expo-secure-store` (Android Keystore), never in AsyncStorage, logs or crash reports.
7. Logout on the device deletes the stored token and calls `POST /auth/logout`. `logout-all` keeps working through `sessionEpoch`, which also ends native sessions.
8. Still no refresh tokens, per-device sessions or session lists (ADR-001 holds). After 14 days the user signs in again by OTP.

Why a header and not the bearer token for the Origin exemption: the app must also call `otp/request` and `otp/verify-native` before it has a token. Why a separate route and not a flag on `otp/verify`: one response type per route keeps the generated types honest and the web response untouched.

## Alternatives rejected

- **Native cookie jar plus an Origin header faked by the app.** Works by accident, depends on platform cookie behaviour, and turns the Origin allow-list into a value any client can claim.
- **Refresh tokens / device registry.** Rejected by ADR-001 and not needed for the pilot.
- **A separate mobile API.** Duplicates `/api/v1` and contradicts CON-006.

## Consequences

- Kavenegar SMS cost rises slightly: every native user signs in again at least every 14 days. Raising the lifetime is a separate decision.
- A stolen device with an unlocked app holds a 14-day token; `logout-all` from the web ends it.
- Tests (`backend.Tests/NativeClientAuthTests.cs`): a native sign-in receives a token and no cookie and stamps `FirstNativeSignInAt` once; a bearer write with the native header and no Origin succeeds; a bearer write without the header is refused; a cookie write without Origin is refused even with the header; a token from before `logout-all` is refused; a cookie wins over a bearer; `verify-native` needs the header and shares the attempt limit.

## Related

- [ADR-001](ADR-001-authentication-session-contract.md), [auth/security](../backend/auth-security-transactions.md), [mobile DevMap](../mobile/README.md), step [MOB-01](../mobile/development-steps.md#mob-01--native-client-authentication).
