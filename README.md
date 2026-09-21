# TidySense local development

The repository keeps the application roots at `/backend` and `/frontend`. Local development uses .NET 10, Node/npm, and PostgreSQL 18.

## Prerequisites

- .NET SDK 10 (the scripts prefer the repository-local `.dotnet` SDK when it exists)
- Node.js and npm
- PostgreSQL 18, with its Windows service running
- `C:\Program Files\PostgreSQL\18\bin` on your user `PATH`

The backend HTTPS launch profile needs an ASP.NET Core development certificate. Create one if `dev.ps1 check` reports it missing:

```powershell
.\.dotnet\dotnet.exe dev-certs https
```

Vite accepts this local certificate when proxying API calls. Trusting it with `dev-certs https --trust` is optional and only removes the browser warning when opening the backend HTTPS URL directly.

After a PATH change, open a new terminal before expecting `psql` to resolve normally.

## Local configuration

Development secrets belong in .NET User Secrets for `backend/TidySense.csproj`; production configuration remains external. The required local secrets are:

```powershell
.\.dotnet\dotnet.exe user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=tidysense;Username=<user>;Password=<password>" --project .\backend\TidySense.csproj
.\.dotnet\dotnet.exe user-secrets set "Jwt:SigningKey" "<at-least-32-character-random-secret>" --project .\backend\TidySense.csproj
.\.dotnet\dotnet.exe user-secrets set "Otp:HashingKey" "<at-least-32-character-random-secret>" --project .\backend\TidySense.csproj
```

The non-secret pilot timezone, JWT issuer/audience, ports, and Kavenegar base URL are tracked in configuration. Kavenegar credentials are not required merely to start or test locally. Real provider use requires `Kavenegar:ApiKey`, `Kavenegar:Sender`, and optionally `Kavenegar:Template` through external configuration.

Real PostgreSQL integration tests read the user- or process-scoped `TIDYSENSE_TEST_POSTGRES` administrative connection. Never commit or print its value.

## Everyday commands

```powershell
.\dev.ps1                 # open backend and frontend in separate windows
.\dev.ps1 backend         # https://localhost:7075
.\dev.ps1 frontend        # http://localhost:5173
.\dev.ps1 db              # PostgreSQL service, connection, query and schema
.\dev.ps1 build           # backend/OpenAPI plus frontend build
.\dev.ps1 test            # real PostgreSQL integration tests plus frontend tests
.\dev.ps1 check           # complete local environment verification
.\dev.ps1 check -Quick    # tools, database, backend build and frontend typecheck
.\dev.ps1 openapi         # regenerate OpenAPI and frontend transport types
```

The Vite server keeps browser API calls same-origin and proxies `/api` to the backend. No permissive development CORS policy is needed. The database-backed readiness endpoint is `https://localhost:7075/health/ready`; it returns only health status, never connection details.

Building the backend regenerates `backend/openapi/TidySense.json`. `dev.ps1 openapi` then refreshes `frontend/src/shared/api/generated.ts` from that document.
