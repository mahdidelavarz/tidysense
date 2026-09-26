# M1 Configuration Register

Status: **Step 2 authentication values approved and implemented; deployment secrets and origins remain environment configuration.**

| Area | Canonical choice | Remaining configuration |
|---|---|---|
| backend | .NET 10, ASP.NET Core, EF Core, Npgsql/PostgreSQL | exact deployment values |
| layout | root `/backend`, `/frontend` | none |
| auth | JWT HttpOnly cookie + `sessionEpoch`; no refresh/per-device sessions | issuer/audience/signing key rotation and deployment origin |
| SMS | Kavenegar only in production | credentials and sender supplied externally |
| identity | Guid/uuid | prototype integer migration/cutover |
| API | `/api/v1`; remove obsolete routes | metadata/version and generation command |
| time | DateTimeOffset/DateOnly; one pilot IANA timezone | configured zone value and clock wiring |
| database names | current EF convention | none unless a concrete exception appears |
| tests | xUnit, WebApplicationFactory, real PostgreSQL via Testcontainers or configured local instance | CI container/image when orchestration is decided |
| frontend | feature folders, TanStack file routes, generated OpenAPI + Zod | generator/tool version |
| secrets | never committed | inventory/rotation/cleanup evidence |

Docker Compose, CI provider and full deployment orchestration remain deferred under `DEC-011`.

## Step 2 authentication values (approved 2026-09-21)

- OTP: 4 numeric digits, 2-minute expiry, 120-second resend cooldown, 5 attempts per challenge.
- Persistent limits: 3 requests per 15 minutes per normalized phone, 20 requests per hour per IP, and 20 verifications per 10 minutes per IP.
- JWT: 14-day lifetime; `TidySense.Auth` HttpOnly cookie. Production uses `Secure`, `SameSite=Lax`, `Path=/`.
- Kavenegar: 5-second timeout, no automatic resend. Delivery failures are generic to clients.
- Logout-all is available in the browser. Production credentials, allowed origins and trusted proxies are supplied outside tracked configuration.
