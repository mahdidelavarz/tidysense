# Environments and Configuration

Environment intent:

| Environment | External providers | Data |
|---|---|---|
| local | fake by default | synthetic/local |
| test | fake only except explicit provider tests | isolated ephemeral PostgreSQL |
| staging | explicit approved provider enablement | approved test identities, no pilot data |
| production | approved production adapters | controlled production data/retention |

- Configuration keys are documented without secret values.
- Local secrets use .NET user-secrets/environment or an approved local mechanism; CI/deployment use managed secrets.
- Fail startup/readiness when required secure configuration is missing; never fall back to tracked secrets.
- Log selected environment and safe feature/artifact versions, never credentials or full provider configuration.
- `appsettings.json` currently contains an SMS key, database password and OTP secret. Treat them as exposed: rotate and remove before further auth/provider work.
- `DEFERRED DEC-011`: do not yet lock Compose topology, CI provider, full deployment pipeline or broader orchestration. Pin concrete SDK/package versions when the affected implementation needs them. This deferral does not excuse tracked secrets or unclear environment boundaries.
