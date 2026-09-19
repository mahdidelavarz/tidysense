# M1 Configuration Register

## Status

`READY_FOR REVIEW — CONFIRMED INPUTS RECORDED; PROPOSED VALUES NOT LOCKED`

This is the review surface for M1 implementation parameters. `CONFIRMED` values came directly from the repository owner. `PROPOSED` values require approval before scaffold or auth contract lock.

## Platform and toolchain

| Configuration | Proposed value | Owner | Status |
|---|---|---|---|
| frontend runtime | Node.js 24 LTS | Mahdi | `PROPOSED` |
| frontend framework | React 19.2 + strict TypeScript | Mahdi | `PROPOSED` |
| frontend build tool | Vite 8.1 | Mahdi | `PROPOSED` |
| backend runtime | .NET 10 / C# | Reza | `IMPLEMENTED_IN_MANIFEST; LOCAL SDK MISSING` |
| backend framework | ASP.NET Core 10 | Reza | `IMPLEMENTED_IN_MANIFEST` |
| persistence | Entity Framework Core 10 + Npgsql | Reza | `IMPLEMENTED_IN_MANIFEST` |
| database | PostgreSQL 18, latest supported minor | Reza | `PROPOSED` |
| schema migrations | EF Core migrations; immutable after release, additive corrective migration thereafter | Reza | `IMPLEMENTED_IN_REPOSITORY` |
| local/deployment packaging | Docker Compose + Nginx | Mahdi + Reza | `PROPOSED` |

Exact patch and dependency versions will be committed in manifests and lockfiles during scaffold creation. CI must verify those manifests; this document records supported release lines rather than acting as a package lock.

Repository observation (2026-09-19): `backend/TidySense.csproj` targets `net10.0` with EF Core/Npgsql 10 packages, while the inspected workstation has only .NET SDK 9.0.102. The SDK/toolchain must be aligned before the backend can build locally.

## Authentication and Kavenegar

| Configuration | Value | Owner | Status |
|---|---|---|---|
| SMS provider | Kavenegar | Reza | `CONFIRMED` |
| provider boundary | application-owned `SmsGateway`; Kavenegar production adapter; fake adapter for local/test | Reza | `PROPOSED` |
| Kavenegar operation | Lookup template delivery; app generates, hashes, expires, and verifies the token | Reza | `PROPOSED` |
| OTP format | 6 numeric digits, cryptographically generated | Reza | `PROPOSED` |
| OTP expiry | 5 minutes | Reza | `PROPOSED` |
| resend cooldown | 60 seconds per normalized phone number | Reza | `PROPOSED` |
| verification attempts | maximum 5 per challenge; then invalidate | Reza | `PROPOSED` |
| request limit | 5 requests per normalized phone per hour and 20 per source IP per hour | Reza | `PROPOSED` |
| challenge replacement | a newly issued challenge invalidates the prior active challenge after provider acceptance | Reza | `PROPOSED` |
| JWT lifetime | 24 hours | Reza | `PROPOSED` |
| cookie name | `ap_session` | Reza | `PROPOSED` |
| provider timeout | 5 seconds | Reza | `PROPOSED` |
| provider retry | no automatic SMS retry; generic temporary failure and preserved cooldown semantics | Reza | `PROPOSED` |
| logout-all UI | included in MVP account/security UI | Mahdi | `PROPOSED` |

### Provider safety boundary

- Store `KAVENEGAR_API_KEY` and the approved template name only in environment/secret configuration.
- Never log the API key, OTP, JWT, raw provider URL, or full phone number.
- Map provider responses to application-owned error codes; never expose provider messages to the browser.
- Record a correlation ID, redacted recipient reference, provider message ID when supplied, latency, and normalized outcome.
- Local and automated tests use the fake adapter. Tests may call Kavenegar only in an explicitly enabled provider-integration profile.
- Provider failure must not create an authenticated session or mark an undelivered challenge as successfully sent.

## Environment names

| Environment | External SMS | Data rule | Status |
|---|---|---|---|
| `local` | fake only | synthetic data | `PROPOSED` |
| `test` | fake only | isolated ephemeral PostgreSQL | `PROPOSED` |
| `staging` | Kavenegar only when explicitly enabled | approved test numbers; no pilot data | `PROPOSED` |
| `production` | Kavenegar | production secrets and retention controls required | `PROPOSED` |

## Still intentionally unresolved

AI provider/model and spend limits, Reconcile thresholds, pilot parameters, localized crisis resources, and the final retention/legal schedule remain governed by their later gates. For M1, optional restricted-event collection remains disabled until the minimum event catalog and access/retention rules are approved.

## Approval record

| Reviewer | Required decision | State |
|---|---|---|
| Mahdi | product, frontend, security/privacy, and temporary cross-role approval | `PENDING` |
| Reza | backend/toolchain/auth/provider acceptance | `PENDING` |

Alireza is a paid external design contributor. His design deliverables are reviewed and accepted by Mahdi; he is not an accountable owner or configuration approver.

Approval changes this register to `M1_CONFIG_APPROVED`; it does not by itself pass M1 or approve pilot/production release.
