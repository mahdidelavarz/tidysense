# ADR-001: Authentication and Session Contract

- Status: Accepted
- Date: 2026-09-19

## Context

The accepted product contract and prototype implementation disagree. The prototype persists opaque session tokens and exposes session management that the product does not require.

## Decision

Authenticate with a signed JWT stored in a secure `HttpOnly`, same-origin cookie. The JWT carries the user identity and a session-epoch claim; the backend compares it with the user’s current `sessionEpoch`. Incrementing the epoch invalidates all existing JWTs. There are no refresh tokens, per-device sessions, session lists, or individual-session revoke APIs. The current-user endpoint follows the accepted Mind Map contract and the backend remains authoritative.

## Alternatives rejected

- Opaque database sessions contradict the accepted contract and add server-side session inventory.
- Refresh-token/per-device architecture is explicitly outside scope.

## Consequences and migration

Replace opaque session persistence, issue/validate JWT cookies, add `sessionEpoch` to canonical user identity, align OTP/current-user routes under `/api/v1`, delete obsolete session-list/revoke routes, and update integration/security tests. Do not maintain both auth models.
