# Security Review, 2026-10-09

A structured read of the code at the STEP-11 state, done by the implementing agent. It is a code review, not a penetration test: nothing was attacked on a running system, and it is not an independent review. The owner read findings 1 and 2 on 2026-10-09 and accepted both for now; they stay listed as accepted risks, not as fixed.

## Scope and method

Read: authentication (`OtpService`, `JwtTokenService`, `JwtCookieEvents`, `AuthController`), request protection (`ApiRequestSecurityMiddleware`, CORS, forwarded headers), every controller's authorization attribute, owner filters on every lookup by id in the feature services, all raw SQL, every log call that takes an exception or user data, the AI path (`OpenAiCompatibleChatClient`, prompt renderers, output gates), operator access, erasure, the development-only endpoints, error responses, tracked configuration and its git history, the frontend for script injection and browser storage, and the new deployment definition. Dependency audits were run the same day.

## Findings

| # | Severity | Finding | State |
|---|---|---|---|
| 1 | High | **Credentials in git history.** The first commit holds an SMS-provider (IPPanel) API key and a local PostgreSQL password in `backend/appsettings.json`. The file is clean today, but the repository has a GitHub remote, so both are to be treated as disclosed. | **Accepted for now by the owner, 2026-10-09; not fixed.** The key is still valid until it is revoked. To close: revoke the IPPanel key at the provider (that adapter is no longer used). Make sure the database password is used nowhere. Rewriting history is optional once the key is dead. This is the unchecked "secrets … rotated" line of the pilot readiness checklist. |
| 2 | Medium | **A four-digit login code can be guessed at a useful rate.** Per phone number the limits allow 3 codes per 15 minutes with 5 attempts each: 1,440 guesses a day against 9,000 possible codes, about a 15% chance per day of signing in to a targeted account. One address may verify 2,880 times a day, so no rotation of addresses is needed. The target receives every one of those SMS messages, which makes it noisy and costly but not prevented. | **Accepted for now by the owner, 2026-10-09; not fixed.** To close: either six digits (`Otp:CodeLength` already allows 4 to 8, but `VerifyOtpDto`, the login form and the SMS text are fixed at 4), or a daily cap on failed verifications per phone number. The auth contract is `SLICE_LOCKED`, so this goes through the freeze register's change procedure. |
| 3 | Low | The OpenAPI document was served without authentication in every environment. | **Fixed:** served in Development and Testing only; the proxy does not route it either. |
| 4 | Low | No limit on request body size beyond the server default (30 MB), although every body is a small JSON document. | **Fixed:** 256 KB. |
| 5 | Low | The `Host` header was not restricted (`AllowedHosts: *`). | **Fixed in the deployment:** Compose sets `AllowedHosts` to the site host. |
| 6 | Low | A scheduled cleanup logged a whole exception object, against the logging rule (type name only). No user data was involved. | **Fixed.** |
| 7 | Low | `OtpChallenges` rows keep a phone number and the time of each login attempt for 90 days (R4), also for numbers that never became accounts. Their useful life is two minutes. | Open. A shorter lifetime (for example 7 days) needs a retention decision; the privacy notice's "technical information, 90 days" currently covers it. |
| 8 | Low | "Sign out of this browser" deletes the cookie; a copy of the token stays valid until it expires (14 days). "Sign out everywhere" ends every token. | Accepted (ADR-001: no per-session revocation). |
| 9 | Low | Only OTP and AI requests are rate-limited. A signed-in account can create records without bound. | Accepted for an invited cohort; revisit before open registration. |
| 10 | Info | Two `GET` requests write something harmless (the Reconcile overview stores the day's exposure; `planning/active` closes work that lost its worker). A cross-site `GET` could trigger them but cannot read the answer. | Accepted. |
| 11 | Info | A 4xx answer carries the exception's message as `detail`. For our own exceptions that is intended; an `ArgumentException` raised inside framework code could expose a parameter name. | Accepted. |
| 12 | Info | Alerts reach the operator once a day by e-mail. A provider key leak that drains the budget is bounded by the daily budget and the provider's prepaid balance, not by a fast alert. | Accepted (ADR-007). |

## Reviewed and found sound

- **Session.** HS256 with issuer, audience, lifetime and signature validated; the token is read from an `HttpOnly`, `SameSite=Lax` cookie that is `Secure` outside Development; every request re-checks the account is active and the `sessionEpoch` matches.
- **Login code.** Generated with a cryptographic random source, stored only as a keyed digest, compared in constant time, single use, two-minute life, five attempts per code; requesting a code answers the same whether or not one was sent.
- **Cross-site requests.** Every non-`GET` request to `/api/v1` must be JSON and carry an allowed `Origin` or `Referer`; in production only the configured origin is allowed. CORS allows credentials for the configured origins only.
- **Ownership.** Every lookup by id in the feature services is filtered by the current account on the same query (one lookup derives its key from a row already loaded for the owner). Each module has a test in which a second account gets `404`.
- **SQL.** All statements are parameterised (`FromSqlInterpolated`, `ExecuteSqlInterpolated`); the one `SqlQueryRaw` runs fixed catalog text with parameters.
- **Operator access.** Decided by a configured phone list in one place; the three endpoints are read-only aggregates and answer `404` to everyone else; tested for ids, phone numbers, titles and manifests in the output.
- **Development endpoints.** `dev/otp/latest`, `dev/test-session` and the planning fixture header exist only in Development and Testing; a production-profile test asserts their absence.
- **AI path.** One plain HTTP call with no tool or function; user text travels only inside a marked data block and never in the instructions; model output reaches the user only through the whole output gate; nothing sent or received is stored or logged; the key travels in a header. Planning text is now sent only with consent to the named provider, checked on the server at both points.
- **Logs.** Structured fields with ids, codes and durations; no phone number, title, intention, token or key found in any log call.
- **Erasure.** One transaction; no table refers to the account afterwards (tested over every table with a `UserId`), and events about the account itself lose it as aggregate too.
- **Frontend.** No `dangerouslySetInnerHTML`, no `eval`, nothing in `localStorage` or `sessionStorage`, no inline script or style in the built page.
- **Deployment definition.** Only the proxy listens on the host; the database and backend are reachable inside the Compose network only; the backend runs as an unprivileged user; forwarded headers are trusted from the proxy's address alone; HSTS, `nosniff`, frame denial and a content security policy are set at the proxy. It was observed on the stack run locally on 2026-10-09 (headers, the refused foreign host and origin, the closed development endpoints); not on a server.
- **Dependencies.** `dotnet list package --vulnerable --include-transitive` (backend and tests) and `npm audit`: no known vulnerability on 2026-10-09. Both are part of the release gate.

## Not reviewed

- The server, its operating system, firewall and SSH access: no server exists yet.
- The SMS provider account, the AI provider account and the mail account (who can sign in, which keys exist).
- The content security policy against every screen: on 2026-10-09 the login and privacy pages were loaded in Chrome from the locally run stack with no violation, after Zod's `eval` probe was switched off; the signed-in screens were not walked under the policy.
- Denial of service beyond the limits named above.
- Anything a second reviewer would have seen differently: this review was written by the same agent that wrote most of the code.
