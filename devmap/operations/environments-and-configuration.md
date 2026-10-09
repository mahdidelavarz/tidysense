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
- The Reconcile explanation is configured under `Ai:Reconcile` with the same shape and its own switches, limits and budget (`KillSwitch`, `RetryEnabled`, `ExplanationsPerUserPerDay`, `DailyBudgetUsd`, timeouts, circuit). `Ai:Reconcile:Provider` is `mock` (the sample explainer, the default) or a key of `Ai:Providers`, selected independently of planning and checked at startup the same way. See `../step-10-ai-reconcile-acceptance.md`.
- The real-provider smoke tests (one for planning, one for the Reconcile explanation) run only when `TIDYSENSE_AI_SMOKE_KEY` is set at process or user scope (`TIDYSENSE_AI_SMOKE_BASEURL` and `TIDYSENSE_AI_SMOKE_MODEL` override the DeepSeek defaults). It is never set in tracked configuration.
- `auth-e2e.ps1` sets both AI providers to `mock` for its isolated backend, so browser tests never call the provider a developer selected in user-secrets.
- Operations are configured under `Operations`: `OperatorPhones` (accounts that may open the operator page and its API) and `InternalPhones` (accounts reported apart from primary pilot metrics) are normalized phone numbers supplied through user-secrets, the environment or managed secrets, never tracked; `Retention` (`Enabled`, `R4Days` 90, `R3DaysAfterExpiry` 30, `R2DaysAfterClose` 180; fixed for the pilot and repeated to users by the privacy notice) and `Alerts` (thresholds) have tracked defaults. See `../step-11-operations-acceptance.md`.
- `auth-e2e.ps1` lists the development test account as the operator of its isolated backend. `ops-drill.ps1` runs its own isolated database and backend with a private copy of the settings as content root, so a drill can change configuration at runtime without touching tracked files.
- The daily alert digest is configured under `Operations:AlertDigest` (`Enabled`, `HourUtc`, `To`, `From`, `SmtpHost`, `SmtpPort`, `SmtpUser`, `SmtpPassword`, `SmtpTls`); it is off by default and required outside Development and Testing, where the backend refuses to start without it.
- `Pilot:SupportContact` is the channel shown to users for support and erasure requests (required outside Development and Testing); `Pilot:ErasureCompletionDays` (30) is the limit the privacy notice states and must equal the lifetime of logs and backups. `Ai:Providers:<key>:DisplayName` is the provider name users agree to.
- Outside Development and Testing the OpenAPI document is not served, and request bodies are limited to 256 KB everywhere.
- The pilot deployment is one server under Docker Compose (`DEC-011`, resolved by ADR-007): settings come from `deploy/.env` on the server, which is the secret store. See [`deployment.md`](deployment.md). There is no staging environment for the pilot; the isolated databases of `auth-e2e.ps1` and `ops-drill.ps1` are the rehearsal.
