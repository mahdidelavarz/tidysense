# Authentication, Security, and Transactions

## Canonical authentication

- Normalize Iranian mobile identity to unique E.164.
- Generate OTPs cryptographically; store keyed digests only; enforce expiry, attempts, cooldown/rate limits and transactional consumption; never log OTPs.
- Issue a signed JWT in an `HttpOnly`, same-origin cookie (`Secure` in production, suitable `SameSite`). Frontend JavaScript never reads bearer material.
- JWT includes user identity and session-epoch claim; the backend compares it with the canonical user’s `sessionEpoch`. Incrementing the epoch revokes all existing sessions.
- No refresh tokens, per-device sessions, session list or individual-session revoke APIs.
- The current-user response follows the accepted Mind Map contract. The backend remains the security authority.
- Unsafe cookie-authenticated requests require the accepted Origin/Referer/CSRF and content-type controls.

The current opaque DB-session implementation, `/auth/me` divergence and session-management endpoints are prototype behavior. Migration must replace them under `/api/v1`, remove old routes rather than dual-run them, migrate User identity to Guid/sessionEpoch and add API/security integration tests.

Kavenegar is the production SMS adapter; IPPanel is obsolete. Secrets use environment/user-secret/managed stores and are never committed.

## Transactions

One use case owns each write transaction. Revalidate identity, permission, domain-defined ownership, selected resources, warnings and expected versions immediately before commit. Canonical mutations and event/outbox intent commit atomically. Retryable consequential commands use stable idempotency. Bulk commands are all-or-nothing; lost responses recover by idempotent replay/status lookup.
