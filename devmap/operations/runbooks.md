# Operational Runbooks

How to respond when something goes wrong, and how each procedure is rehearsed. Procedures 1 to 6 are exercised by `./ops-drill.ps1` against an isolated database; the last recorded run is in [`../step-11-operations-acceptance.md`](../step-11-operations-acceptance.md). The pilot runs on one server under Docker Compose ([`deployment.md`](deployment.md)), so "configuration" below means `deploy/.env` on that server; a change there takes effect with `docker compose up --detach`, which restarts the backend. In development it is the settings file or user-secrets.

Owner of every procedure: Backend owner. Reviewer: Security/Privacy for erasure and restore, AI/Safety for the AI procedures.

## Where to look

| Need | Place |
|---|---|
| active alerts, maintenance state | `/operations` page (operator accounts) or `GET /api/v1/operations/health` |
| alerts of the last day | the daily digest e-mail; `OPS_ALERT` lines in the journal |
| AI switches, spend, call results | `/operations` page or `GET /api/v1/operations/ai?days=N` |
| H1/H2 counts | `/operations` page or `GET /api/v1/operations/metrics?days=N`; definitions in [`metric-dictionary.md`](metric-dictionary.md) |
| one AI call | the `AiInvocations` row and its structured log line (no prompt or response exists) |
| readiness | `/health/ready` (database), `/health/live` (process) |

An operator account is a phone number listed in `Operations:OperatorPhones`. Everyone else gets `404` from `/api/v1/operations/*`.

## 1. AI incident: stop the AI path

Use when a model produces unacceptable output, a provider misbehaves, cost runs away, or hostile input is suspected (risks `R-05`–`R-08`).

1. Set the narrowest switch that covers the problem. On the pilot server the switches are environment variables, so setting one means editing `deploy/.env` (or the Compose file) and `docker compose up --detach backend`: the backend restarts, which also abandons any generation in flight. Where the configuration source reloads (a settings file in development) no restart is needed.

   | Switch | Effect |
   |---|---|
   | `Ai:GlobalKillSwitch = true` | no provider call for any family |
   | `Ai:Planning:KillSwitch = true` | planning attempts refused |
   | `Ai:Reconcile:KillSwitch = true` | Reconcile explanations refused |
   | `Ai:Providers:<key>:Disabled = true` | that provider is not called |
   | `Ai:<Family>:RetryEnabled = false` | the single retry is not made |

2. Confirm it took effect: the operator page shows the switch and raises `AI_KILL_SWITCH_ACTIVE`; the log has `AI_KILL_SWITCH_CHANGED. Scope: <scope>, Active: True`; starting a planning attempt returns `503 PLANNING_AI_UNAVAILABLE`; a Reconcile session reports `ai.availability = DISABLED` (requesting an explanation returns `503 RECONCILE_AI_UNAVAILABLE`).
3. Confirm the manual paths: creating a Task and opening Reconcile still work. If they do not, this is a separate incident: treat it as an application outage.
4. Write the incident record (template below) with who set the switch, why and when. The switch is configuration; the audit line records scope, value and time, not the person.
5. Re-enable only after the cause is understood and the re-enable approvers named in the incident record agree. Switch off, confirm `Active: False` in the log and one successful operation.

A call already in flight when the switch is set is not interrupted; the check runs before every call, the retry included.

## 2. Provider outage, spend cap, budget

| Alert | Meaning | Response |
|---|---|---|
| `AI_CIRCUIT_OPEN` (warning) | `CircuitFailureThreshold` consecutive availability failures; calls pause for `CircuitOpenSeconds`, then one is let through | check the provider status; nothing to do if it recovers; if it keeps reopening, set the provider's `Disabled` switch and tell support the assistant is unavailable |
| `AI_PROVIDER_FAILURE_RATE` (warning) | failed share of the last hour's calls ≥ `Alerts:FailureRatePercent` over at least `MinimumSample` calls | read the failure classes on the operator page; transport/timeout → provider or network; authentication → key rotation |
| `AI_OUTPUT_REJECTION_RATE` (warning) | output-gate rejections ≥ `Alerts:RejectionRatePercent` | read which gate rejects; a model or prompt change is likely; stop the family (runbook 1) if users are blocked. Rejected output never reaches a user |
| `AI_BUDGET_NEAR_LIMIT` (warning) | today's recorded spend ≥ `Alerts:BudgetWarningPercent` of `DailyBudgetUsd` | check for abuse (rate limits per user); decide whether to raise the budget |
| `AI_BUDGET_EXHAUSTED` (critical) | the daily budget is spent; operations fail with `AI_BUDGET_EXHAUSTED` until the next UTC day | manual paths keep working; raise the budget only as a recorded decision |
| `AI_PROVIDER_SPEND_CAP_LATCHED` (critical) | the provider answered 402: its prepaid balance is gone; calls stop for `SpendCapLatchMinutes` | top up in the provider console or leave AI off; the cap is the hard limit on spend and is set there, not in the application |
| `AI_WORK_STUCK_RUNNING` (warning) | an explanation or planning attempt in flight for more than three minutes | the next maintenance run fails it; if it recurs, the worker process is being lost — check restarts |
| `AI_KILL_SWITCH_ACTIVE` (warning) | a switch is on | expected during an incident; otherwise find who set it |
| `ALERT_DIGEST_FAILED` (warning) | the last daily digest could not be sent | check the SMTP settings and the mail account; the send is retried every hour and the alert clears with the next success. Until then alerts reach nobody: read the operator page yourself |

There is no fallback to another provider or model.

## 3. Maintenance and retention

`OperationsMaintenanceService` runs 30 seconds after start and then hourly: it fails work whose process was lost, purges by retention class and logs each active alert as `OPS_ALERT`. Each run writes one `OperationsRecords` row with counts and the alerts it raised; the daily digest is built from those rows ([`deployment.md`](deployment.md#alerts-that-leave-the-application)). A day without a digest e-mail is itself the alert that the backend or the mail path is down.

| Alert | Response |
|---|---|
| `MAINTENANCE_FAILED` (critical) | the last run threw; the log line names the exception type. Purging is transactional, so nothing was half-deleted. Fix the cause; the next hourly run retries. Run it by hand with `dotnet TidySense.dll run-maintenance` |
| `MAINTENANCE_MISSING` (warning) | no run for `Alerts:MaintenanceMissingHours`; the backend is not running or the hosted service stopped. Restart the backend |

Retention (`Operations:Retention`; fixed for the pilot on 2026-10-09 and stated to users in the privacy notice, which reads the same configuration): R4 90 days, R3 30 days after a draft ended, R2 180 days after a session closed or a pilot answer was given. Changing a duration changes what users were told: treat it as a notice change (runbook 9). R1 events and command results and all canonical work are never purged. Each purge statement removes at most `Operations:Retention:BatchSize` rows (5,000), oldest first, so a backlog drains over several hourly runs; `run-maintenance` can be repeated to drain it sooner. `Operations:Retention:Enabled = false` stops purging and keeps the sweep. The class of every table is in `backend/Services/Operations/RetentionCatalog.cs`.

## 4. Backup and restore

The `backup` container takes one dump a day and keeps it 30 days ([`deployment.md`](deployment.md#backups)). Before every production migration take one more: `docker compose run --rm backup once`. By hand, and for a restore:

1. `pg_dump --format=custom --file <file> --dbname <database>` (consistent while the application runs).
2. Restore into a **new** database: `CREATE DATABASE <copy>;` then `pg_restore --no-owner --dbname <copy> <file>`.
3. Verify before switching: row counts of `__EFMigrationsHistory`, `Users`, `Tasks`, `DomainEvents`, `CommandResults` match the source; a backend started on the copy with `Database:MigrateOnStart=false` reaches `/health/ready`; an existing session can read its own data.
4. Point the application at the copy only after step 3. Never restore over the live database.

A backup contains personal data and R1 history: store and delete it under the same access rules as the database. An account erased after a backup was taken exists in that backup until the backup is deleted, at most 30 days later; that limit is what users are told. A restore inside those 30 days must be followed by re-running the erasures requested since the backup (the database record holds the tombstone, not the account, so the request list kept outside the database is the source).

## 5. Migration rollback

Prefer a compatible forward fix. Roll back only when the new schema itself is the fault.

1. Stop the application version that needs the new schema; back up (runbook 4).
2. `dotnet tool exec dotnet-ef@10.0.11 --yes -- database update <previous migration> --project backend\TidySense.csproj --configuration Release --connection "<connection>"`.
3. Start the previous application version; check `/health/ready`, sign in, read one owned resource.

`Down` drops what the migration added, so rows written to new tables are lost: STEP-11's `Down` drops `OperationsRecords` (maintenance and erasure records). Every migration's round trip from its predecessor is in `backend.Tests/DeliveryMigrationTests.cs`.

## 6. Account erasure

A participant asks through the channel named in the privacy notice (`Pilot:SupportContact`). Verify that the request comes from the account holder: it arrives from the account's own phone number, or the person reads back a code sent to that number. Then:

1. `docker compose exec backend dotnet TidySense.dll erase-user --phone <number> --operator <your name> --reason USER_REQUEST` (or `--user <id>`). The reason is a code, never free text.
2. The command prints what it deleted and the tombstone id. It deletes the account, everything the user wrote and every non-audit record, and replaces the user id on the retained R1 events and command results with the tombstone. Those rows hold codes and counts only.
3. Keep the request (who asked, when, how verified) outside the database. The database record names the operator, the reason and the tombstone, not the account.
4. OTP rate events are keyed by a digest and expire within a day on their own.
5. Tell the person the account is erased and that backups and logs holding it are gone within 30 days (`Pilot:ErasureCompletionDays`). Nothing more has to be run: the daily dumps and the journal expire on their own inside that time. If a backup is restored before then, erase again (runbook 4).

There is no user-facing deletion for the pilot (decided 2026-10-09: the operator command and a stated contact channel are enough for an invited cohort) and no undo.

## 7. Support path

A user reports a problem through the channel in `Pilot:SupportContact`, which the privacy page shows. Support may see what the user sees; it has no operator page. An operator can confirm system state (alerts, switches, failure classes) but cannot read a user's work through the operator page: it shows aggregates only. Anything that needs a user's records is a direct database access (runbook 8).

## 8. Direct database access

For the pilot only the operator can reach the database, and every direct look at records is recorded.

1. Use the read-only role: `docker compose exec db psql --username tidysense_readonly --dbname tidysense`. The application role is for the restore and rollback procedures only.
2. Read the least that answers the question. Do not copy rows off the server; an export for analysis is the aggregate API (`GET /api/v1/operations/metrics`), not a table dump.
3. Write the access record the same day, next to the incident records (outside the database): date and time, who, the purpose (incident, support request or analysis, with its reference), which tables, whether user text was read, and what was done with it.

An access without a record is itself an incident. Separate roles per access class, de-identified views and a database-side access log are deferred ([`deployment.md`](deployment.md#database-access)).

## 9. AI provider, consent and the privacy notice

Planning text is sent to the provider only for an account that agreed to that provider and to the current notice (`AiConsentPolicy.NoticeVersion`). The server refuses otherwise (`403 AI_CONSENT_REQUIRED`), whatever the client shows. The Reconcile explanation sends codes and counts only and is not gated.

- **Changing the provider** (`Ai:Planning:Provider`): consent names the provider key, so every account is asked again on its next planning attempt. Set `Ai:Providers:<key>:DisplayName`; that name is what users are shown.
- **Changing what the notice says** (what is sent, where it goes, a retention duration, the erasure limit): edit the wording in `frontend/src/features/pilot/components/`, then change `AiConsentPolicy.NoticeVersion`. Every account is asked again. Never change the wording without the version.
- **A user withdraws**: they do it themselves on the privacy page. Nothing already sent can be recalled; the decision is an R1 event (`AI_CONSENT_CHANGED`).
- **A user asks what was sent**: nothing sent or received is stored. The `AiInvocations` rows show when calls were made for the account, not their content.

## Incident record

Any realized safety, privacy, authorization, data-integrity or evidence-integrity risk is a gate failure, not ordinary backlog (risk register escalation rule). Record:

- what happened, when it was detected and how;
- affected versions (application, prompt, schema, catalog), users and data;
- containment (which switch or rollback, by whom, when);
- recovery and verification;
- notification decision;
- root cause and corrective tests;
- who approves re-enabling.

## Drills

Not rehearsed by the drill: the Compose deployment itself, the daily digest against a real mail server, the backup container and runbooks 8 and 9 ([`deployment.md`](deployment.md#not-yet-verified)).

`./ops-drill.ps1 [-Operator <name>]` creates an isolated database and backend (sample AI providers), then: switches the global, planning, Reconcile and provider kill switches on and off at runtime and checks the refusals, that each family switch leaves the other family alone, the manual paths, the alert and the audit lines; runs maintenance; dumps, restores and starts a backend on the copy; rolls the copy back to the STEP-10 schema and forward again; erases the test account and checks what remains. It needs `TIDYSENSE_TEST_POSTGRES`, `psql`, `pg_dump` and `pg_restore`. Do not append `2>&1`.
