# Authentication, Security, and Transactions

## Canonical authentication

- Normalize Iranian mobile identity to unique E.164.
- Generate OTPs cryptographically; store keyed digests only; enforce expiry, attempts, cooldown/rate limits and transactional consumption; never log OTPs.
- Issue a signed JWT in an `HttpOnly`, same-origin cookie (`Secure` in production, suitable `SameSite`). Frontend JavaScript never reads bearer material.
- JWT includes user identity and session-epoch claim; the backend compares it with the canonical user’s `sessionEpoch`. Incrementing the epoch revokes all existing sessions.
- No refresh tokens, per-device sessions, session list or individual-session revoke APIs.
- The current-user response follows the accepted Mind Map contract. The backend remains the security authority.
- Unsafe cookie-authenticated requests require the accepted Origin/Referer/CSRF and content-type controls.

Step 2 implements the canonical route and session boundary. OTP challenges are keyed by normalized phone and consumed with the create-or-load User operation in one PostgreSQL transaction. A phone-scoped advisory transaction lock serializes verification; the normalized-phone unique constraint and conflict-safe insert provide the final user identity guard. Development OTP capture and test-session routes are absent in production.
The local `dev.ps1 backend` command applies migrations at development startup; production startup never runs migrations implicitly.

Kavenegar is the production SMS adapter; IPPanel is obsolete. Secrets use environment/user-secret/managed stores and are never committed.

## Transactions

One use case owns each write transaction. Revalidate identity, permission, domain-defined ownership, selected resources, warnings and expected versions immediately before commit. Canonical mutations and event/outbox intent commit atomically. Retryable consequential commands use stable idempotency. Bulk commands are all-or-nothing; lost responses recover by idempotent replay/status lookup.

Step 3 provides the reusable synchronous command boundary without a product write API. A canonical version starts at `1` and advances once per committed mutation; the owning use case checks `userId`, current state and expected version, then performs a conditional update. An owned stale row yields `CONFLICT_STALE_VERSION`; an unowned row remains a scoped 404. `CommandExecutionService` claims `(userId, idempotencyKey)` in PostgreSQL before the mutation, compares the server-computed request hash, and returns the prior immutable `CommandResult` on matching replay. New command expiry is supplied by the owning use case. A version conflict or final domain rejection commits a result without domain/event changes; an unexpected failure rolls back the claim and all writes. Product-specific terminal no-op rules and lost-key recovery are implemented by their later owning slices.

Successful canonical writes, `CommandResult`, a versioned `DomainEvent`, and its unique `OutboxMessage` commit in one transaction. The outbox is durable intent; no dispatcher or product event is introduced before a consumer exists. The test-only Project rename command demonstrates the boundary and is absent from the production assembly.

## Related Mind Map

- [Authentication specification](../../mindmap/04-Specs/auth-phase-1.md) — OTP, JWT, session, CSRF and auth transaction behavior.
- [Retained authentication/API decisions](../../mindmap/01-Closed-Discussions/001-008-legacy-surviving-decisions.md) — surviving canonical auth and current-user rules.
- [Transactions, concurrency and idempotency](../../mindmap/01-Closed-Discussions/019b-transactions-concurrency-and-idempotency.md) — consequential command guarantees.
