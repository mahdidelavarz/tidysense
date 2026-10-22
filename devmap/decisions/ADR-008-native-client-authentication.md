# ADR-008: Native Client Authentication

- Status: Proposed (2026-10-22). Becomes Accepted when MOB-01 is approved by the owner.
- Date: 2026-10-22

## Context

ADR-001 authenticates the browser with a JWT in a secure `HttpOnly`, same-origin cookie, and `ApiRequestSecurityMiddleware` rejects every `/api/v1` write that carries neither an allowed `Origin` nor an allowed `Referer`. A React Native app is not a browser:

- it has no origin, so every write it sends is refused with `403 FORBIDDEN` today;
- a native cookie jar exists, but its persistence and clearing differ between Android and iOS and cannot be inspected or wiped reliably from JavaScript;
- the cookie and Origin checks exist to stop cross-site request forgery, which needs a browser that attaches credentials automatically. A token the app adds itself to a header is not sent by any other site.

So "the backend stays unchanged" is not true for a mobile client. The change must be small and must not weaken the browser path.

## Decision

1. The native app sends the same JWT as `Authorization: Bearer <token>`. `JwtCookieEvents.OnMessageReceived` takes the cookie first and the header only when no cookie is present. Validation is unchanged: same signing key, same `sessionEpoch` check, same lifetime (`Jwt:LifetimeMinutes`, 14 days today).
2. `POST /api/v1/auth/otp/verify` accepts an optional `client: "native"` field. With it, the response body also carries `accessToken` and `expiresAt`, and no cookie is written. Without it, behaviour is exactly as now.
3. `ApiRequestSecurityMiddleware` skips the Origin/Referer check only for a request that carries a bearer header and no auth cookie. The `application/json` requirement stays for every client.
4. The app stores the token only in `expo-secure-store` (Android Keystore / iOS Keychain), never in AsyncStorage, logs or crash reports.
5. Logout on the device deletes the stored token and calls `POST /auth/logout`. `logout-all` keeps working through `sessionEpoch`, which now also ends native sessions.
6. Still no refresh tokens, per-device sessions or session lists (ADR-001 holds). After 14 days the user signs in again by OTP.

## Alternatives rejected

- **Native cookie jar plus an Origin header faked by the app.** Works by accident, depends on platform cookie behaviour, and turns the Origin allow-list into a value any client can claim.
- **Refresh tokens / device registry.** Rejected by ADR-001 and not needed for the pilot.
- **A separate mobile API.** Duplicates `/api/v1` and contradicts CON-006.

## Consequences

- Kavenegar SMS cost rises slightly: every native user signs in again at least every 14 days. Raising the lifetime is a separate decision.
- A stolen device with an unlocked app holds a 14-day token; `logout-all` from the web ends it.
- Tests: a native login receives a token and no cookie; a bearer write without Origin succeeds; a cookie write without Origin is still refused; a bearer token from before `logout-all` is refused; a request with both a cookie and a bearer uses the cookie.

## Related

- [ADR-001](ADR-001-authentication-session-contract.md), [auth/security](../backend/auth-security-transactions.md), [mobile DevMap](../mobile/README.md), step [MOB-01](../mobile/development-steps.md#mob-01--native-client-authentication).
