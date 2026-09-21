# Local Development

- Use the root `dev.ps1` command surface; it prefers the repository-local .NET 10 SDK.
- Store local backend credentials in .NET User Secrets. Keep production configuration external and never commit operational secrets.
- Keep `TIDYSENSE_TEST_POSTGRES` at user or process scope for real PostgreSQL integration tests.
- Run `dev.ps1 db` for direct PostgreSQL/service/schema verification and `dev.ps1 check` for the full local tool, database, backend and frontend pipeline. `-Quick` skips test suites and the frontend production build.
- Backend Development listens on `https://localhost:7075`; Vite listens on `http://localhost:5173` and proxies same-origin `/api` traffic to the backend. Do not add permissive CORS solely for this topology.
- `/health/ready` is an anonymous, database-backed readiness check that discloses status only.

The practical setup, commands and safe placeholder configuration are maintained in the repository root `README.md`.
