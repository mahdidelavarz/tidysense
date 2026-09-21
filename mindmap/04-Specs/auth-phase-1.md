# AI-Native MVP Authentication

## Status

`RETAINED_WITH_AMENDMENTS — CURRENT WITHIN THE BOUNDARY BELOW`

Retained authentication and session specification for the current AI-native MVP, limited by the legacy reconciliation boundary below.

Retained through [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] after the legacy source discussion was removed. Product-model language outside the retained authentication and session contract is not current authority.

## Purpose

Define the retained authentication and session model. Old cohort-size, product-flow, or implementation-sequence assumptions outside this contract are non-authoritative.

This spec owns:

```txt
phone normalization
OTP request and verification
OTP persistence
JWT claims and cookie transport
session revocation
CSRF boundary
auth transaction guarantees
required auth tests
```

It does not own deployment secrets. The selected SMS provider and proposed M1 parameters are recorded in [[05-Implementation/m1-configuration-register]] until approved and copied into implementation configuration.

## Current integration boundary

- Authentication and exclusive ownership apply to every canonical and temporary AI workflow resource.
- Ownership-safe 404 behavior applies to PlanningAttempt, PlanningDraft, ReconcileSession, ActionConfirmation, and CommandResult as well as canonical entities.
- Restricted safety/provider events and raw-content access require the privacy/access rules in [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] as amended by the canonical guardrails; no dedicated crisis product record is required.
- Authentication success never authorizes an AI proposal or bypasses confirmation, version, or commit-time revalidation rules.
- Kavenegar is the confirmed SMS provider. Exact OTP/session limits and provider behavior remain proposed in [[05-Implementation/m1-configuration-register]] and block scaffold lock until approved; production secrets never belong in this repository.

---

# Scope

Phase 1 supports:

```txt
Phone-number OTP through SMS
One application-issued JWT session cookie
```

Phase 1 excludes:

```txt
Google OAuth
email login
password login
password recovery
refresh tokens
refresh-session persistence
per-device session management
Redis
social login
multiple identity providers
```

OTP verification is both the login and account-recovery mechanism.

---

# User Identity

The single Phase 1 identity anchor is:

```txt
User.normalizedPhone
```

Rules:

- required
- unique in the active relational database
- stored in E.164 format
- Iranian mobile numbers only during Phase 1
- raw input is never stored or compared as the uniqueness key
- no `user_identities` table

Accepted inputs include:

```txt
09121234567
989121234567
+989121234567
```

Canonical output:

```txt
+989121234567
```

Use an Iran-specific backend normalizer with explicit validation tests.

---

# User Session Field

Extend the accepted User model with:

```txt
sessionEpoch: Integer, required, default 0
```

Database constraint:

```txt
sessionEpoch >= 0
```

`sessionEpoch` is the server-side revocation version for all JWTs issued to the user.

---

# OTP Request

Endpoint:

```txt
POST /api/v1/auth/otp/request
```

Example request:

```json
{
  "phoneNumber": "09121234567",
  "purpose": "LOGIN"
}
```

Backend responsibilities:

1. normalize and validate the phone number
2. apply server-side request limits
3. generate a cryptographically secure OTP
4. compute the OTP digest
5. store the challenge in the active relational database
6. send through `OtpDeliveryGateway`
7. return a generic response

The response must not reveal whether the number already belongs to a user.

Provider boundary:

```csharp
public interface IOtpDeliveryGateway
{
    Task SendAsync(
        string normalizedPhoneNumber,
        string code,
        CancellationToken cancellationToken = default);
}
```

Provider-specific SDK or HTTP code must remain behind an adapter.

---

# OTP Challenge Model

Minimum persistent fields:

```txt
OtpChallenge
- id: UUID
- normalizedPhone: String, required
- purpose: LOGIN
- codeDigest: String, required
- expiresAt: Instant, required
- attemptCount: Integer, required, default 0
- usedAt: Instant?, optional
- createdAt: Instant, required
```

Optional implementation fields:

```txt
providerMessageId
lastSentAt
requestIpHash
userAgentHash
```

Required constraints:

```txt
attemptCount >= 0
usedAt is immutable after being set
```

OTP values must never be stored in plaintext.

---

# OTP Digest

Accepted Phase 1 construction:

```txt
HMAC-SHA-256(serverSecret, normalizedPhone + purpose + code)
```

Requirements:

- the HMAC secret is stored outside the database
- comparison is constant-time where practical
- logs never include the OTP or digest input
- raw SHA-256 without a server secret is not allowed
- bcrypt and Argon2 are not required for Phase 1 OTP storage

Reason:

Numeric OTPs have low entropy. A keyed digest prevents cheap offline enumeration after a database-only compromise without adding password-hashing overhead.

---

# OTP Verification

Endpoint:

```txt
POST /api/v1/auth/otp/verify
```

Example request:

```json
{
  "phoneNumber": "09121234567",
  "code": "123456",
  "purpose": "LOGIN"
}
```

## Transaction boundary

The following must execute in one relational database transaction:

```txt
lock/load active OTP challenge
validate purpose, expiry, usage state, and attempt count
compare the submitted code
mark OTP as used
create or load User by normalizedPhone
commit
```

JWT creation and cookie writing occur after commit.

The implementation must use an appropriate row-locking or equivalent concurrency strategy so the same challenge cannot be consumed twice.

---

# Duplicate-User Race Handling

Database safety boundary:

```txt
UNIQUE(users.normalized_phone)
```

The application must not rely only on:

```txt
find user
→ if absent, insert user
```

Concurrent verification behavior:

1. one transaction may create the User
2. another racing transaction may hit the unique constraint
3. the losing path reloads the existing User
4. the losing path does not create a duplicate
5. the losing path does not return an internal server error

This behavior requires a dedicated integration test separate from OTP double-consumption tests.

---

# JWT Session

Issue one application JWT after successful OTP verification.

No refresh token is used.

Suggested lifetime:

```txt
14–30 days
```

Mahdi defines the exact value before implementation.

Required claims:

```txt
sub: internal User.id
iss: application issuer
iat
exp
jti
sessionEpoch
```

Do not include:

```txt
phone number
OTP data
profile details
behavioral data
```

Validation requires:

```txt
jwt.sessionEpoch == User.sessionEpoch
```

A missing user, disabled user, or epoch mismatch invalidates the JWT.

---

# Cookie Policy

Production cookie baseline:

```txt
HttpOnly: true
Secure: true
SameSite: Lax
Path: /
Domain: omitted unless deployment requires it
```

The final cookie name is defined before implementation.

Local development may disable `Secure` only when HTTPS is unavailable.

The frontend must not read or store JWT values in localStorage, sessionStorage, or JavaScript memory.

---

# Logout and Revocation

## Current-browser logout

```txt
clear the JWT cookie
```

The server does not need to persist a device session for Phase 1.

## Logout all / forced revocation

```txt
increment User.sessionEpoch
clear the current cookie
```

All previously issued JWTs become invalid because their epoch no longer matches.

Per-device revocation and active-session listing are excluded.

---

# CSRF and Browser Boundary

Recommended deployment:

```txt
https://app-domain/
https://app-domain/api/v1/
```

The eventual edge/proxy technology is deferred under `DEC-011`; it must preserve this same-origin boundary and `/api/v1` contract.

Required controls:

- same-origin frontend and API
- `SameSite=Lax`
- unsafe methods accept JSON only
- validate `Origin` and/or `Referer` on unsafe methods
- configure CORS explicitly
- allow credentials only for approved origin(s)

Phase 1 does not add synchronizer-token or double-submit-token CSRF infrastructure.

`HttpOnly` protects token confidentiality from JavaScript access but is not considered a complete CSRF control by itself.

---

# Error and Privacy Rules

The implementation must not:

- log OTP values
- log JWT values
- reveal whether a phone number is registered during OTP request
- expose provider errors directly
- trust frontend rate limiting
- use the phone number as JWT `sub`
- return database constraint details to clients

User-facing failures should remain generic while internal logs preserve a trace ID and non-sensitive diagnostic context.

---

# Required Backend Tests

```txt
phone normalization produces one canonical identity
invalid Iranian numbers are rejected
normalized phone uniqueness is enforced
OTP request stores no plaintext code
expired OTP is rejected
used OTP is rejected
maximum-attempt behavior follows configuration
concurrent requests cannot consume one OTP twice
OTP verification creates one User for a new number
concurrent verification creates exactly one User
unique-constraint race is recovered without HTTP 500
successful verification issues a valid JWT cookie
JWT sessionEpoch must match User.sessionEpoch
incrementing sessionEpoch invalidates old JWTs
logout clears the cookie
production cookie attributes are correct
unsafe cross-origin mutations are rejected
```

Deferred:

```txt
wrong-purpose test until another purpose exists
refresh-token tests
per-device session tests
```

---

# Required Frontend / E2E Tests

```txt
request OTP
resend cooldown follows backend state
invalid OTP error
expired OTP error
new user enters Day-0
returning user enters the app
reload preserves a valid cookie session
logout returns to auth
expired or revoked session returns to auth without deleting server data
```

---

# Values Required Before Coding

Mahdi defines:

```txt
OTP expiration
resend cooldown
maximum attempts
request rate limits
single-use invalidation details
OTP length and format
JWT lifetime
JWT cookie name
SMS provider
provider timeout and retry policy
whether logout-all is exposed in Phase 1 UI
```

These are implementation parameters, not open architecture questions. Their current review state and proposed values are centralized in [[05-Implementation/m1-configuration-register]].

---

# Implementation Notes

Backend package responsibilities:

```txt
auth/normalization
auth/otp
auth/token
auth/security
auth/provider
```

Use PostgreSQL for OTP challenges and user state. The auth contract remains provider-neutral above persistence.

Do not introduce Redis, a session service, a refresh-token family, or a second authentication framework without a new accepted discussion.
