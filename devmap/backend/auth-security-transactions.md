# Authentication, Security, and Transactions

## Locked security behavior

- Iranian mobile identity is normalized to unique E.164 before lookup/storage.
- OTPs are cryptographically generated, stored only as keyed digests, bounded by expiry/attempt/cooldown/rate rules, transactionally consumed, and never logged.
- Session cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, and not readable by frontend code.
- Unsafe same-origin requests require JSON and Origin/Referer/CSRF controls according to the approved auth contract.
- Every resource access enforces authentication, permission, and ownership server-side.
- Secrets come from environment/user-secret/managed secret storage, never tracked settings.

`CON-003` blocks extending the session model; `CON-004` blocks provider-specific expansion. Existing hard-coded admin user ID `1`, logged OTP, committed secrets, missing normalization/rate limits, and provider-before/after-persistence behavior are not reusable conventions.

## Transactions and commands

- One application use case owns each write transaction.
- Consequential/retryable commands accept a stable idempotency identity and expected version where required.
- Revalidate ownership, selected entities, warnings and versions immediately before commit.
- Canonical mutations and outbox/event intent commit atomically.
- Bulk commands are all-or-nothing; never report per-item success after rollback.
- Cross-row invariant locks are scoped and acquired in deterministic order.
- A lost response is recovered by idempotent replay/status lookup, not blind duplicate mutation.
- Return authoritative `CommandResult`; frontend submission/confirmation is not success.
