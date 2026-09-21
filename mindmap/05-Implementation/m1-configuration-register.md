# M1 Configuration Register

Status: **Architecture chosen; operational values still require owner review.**

| Area | Canonical choice | Remaining configuration |
|---|---|---|
| backend | .NET 10, ASP.NET Core, EF Core, Npgsql/PostgreSQL | exact deployment values |
| layout | root `/backend`, `/frontend` | none |
| auth | JWT HttpOnly cookie + `sessionEpoch`; no refresh/per-device sessions | issuer/audience/key rotation, lifetime, cookie names/flags |
| SMS | Kavenegar only in production | credentials, template/sender, timeout/rate policy |
| identity | Guid/uuid | prototype integer migration/cutover |
| API | `/api/v1`; remove obsolete routes | metadata/version and generation command |
| time | DateTimeOffset/DateOnly; one pilot IANA timezone | configured zone value and clock wiring |
| database names | current EF convention | none unless a concrete exception appears |
| tests | xUnit, WebApplicationFactory, real PostgreSQL via Testcontainers or configured local instance | CI container/image when orchestration is decided |
| frontend | feature folders, TanStack file routes, generated OpenAPI + Zod | generator/tool version |
| secrets | never committed | inventory/rotation/cleanup evidence |

Docker Compose, CI provider and full deployment orchestration remain deferred under `DEC-011`.
