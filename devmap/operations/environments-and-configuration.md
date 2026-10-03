# Environments and Configuration

Environment intent:

| Environment | External providers | Data |
|---|---|---|
| local | fake by default | synthetic/local |
| test | fake only except explicit provider tests | isolated PostgreSQL Testcontainer or configured local test database |
| staging | explicit approved provider enablement | approved test identities, no pilot data |
| production | approved production adapters | controlled production data/retention |

- Configuration keys are documented without secret values.
- Local secrets use .NET user-secrets/environment or an approved local mechanism; CI/deployment use managed secrets.
- Fail startup/readiness when required secure configuration is missing; never fall back to tracked secrets.
- Log selected environment and safe feature/artifact versions, never credentials or full provider configuration.
- Tracked configuration contains no operational database, JWT, OTP or Kavenegar secret values. Supply them through environment variables, user-secrets or managed deployment secrets; any historically exposed values still require rotation before external use.
- PostgreSQL is the canonical active development/runtime database. Connection credentials remain external. The temporary SQL Server environment decision is superseded; domain/application contracts remain provider-neutral.
- Windows local development uses .NET User Secrets for the backend database, JWT signing and OTP hashing secrets. `TIDYSENSE_TEST_POSTGRES` remains a user/process-scoped integration-test setting; neither value belongs in tracked configuration.
- The Development topology is Vite `http://localhost:5173` with same-origin `/api` proxying to ASP.NET Core `https://localhost:7075`. This topology does not require a permissive CORS policy.
- Use the root `dev.ps1` commands for startup, direct database verification and full/quick local health checks. The database-backed `/health/ready` endpoint exposes status only.
- AI Planning is configured under `Ai`. `Ai:Planning:Provider` is `mock` (the deterministic sample generator, the default for local work, tests and browser tests) or the key of an entry in `Ai:Providers`; the first real entry is `deepseek` (OpenAI-compatible chat completions). A selected provider needs `BaseUrl`, `Model` and the secret `Ai:Providers:<key>:ApiKey`, supplied through user-secrets or managed secrets, and outside Development/Testing also its token prices, because the daily budget is computed from them; startup fails otherwise. Kill switches (`Ai:GlobalKillSwitch`, `Ai:Planning:KillSwitch`, `Ai:Providers:<key>:Disabled`, `Ai:Planning:RetryEnabled`), limits, timeouts and the daily budget are read before every provider call, so a configuration change takes effect without a restart and is written to the log as `AI_KILL_SWITCH_CHANGED`. The provider-side hard spend cap is the provider account's prepaid balance; it is set in the provider console, not here. See `../step-09-ai-planning-acceptance.md`.
- The real-provider smoke test runs only when `TIDYSENSE_AI_SMOKE_KEY` is set at process or user scope (`TIDYSENSE_AI_SMOKE_BASEURL` and `TIDYSENSE_AI_SMOKE_MODEL` override the DeepSeek defaults). It is never set in tracked configuration.
- `DEFERRED DEC-011`: do not yet lock Compose topology, CI provider, full deployment pipeline or broader orchestration. Pin concrete SDK/package versions when the affected implementation needs them. This deferral does not excuse tracked secrets or unclear environment boundaries.
