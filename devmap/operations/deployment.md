# Pilot Deployment

How the pilot runs. Decided on 2026-10-09 ([ADR-007](../decisions/ADR-007-pilot-deployment-topology.md), which resolves `DEC-011`): **one server, Docker Compose, one instance of each container**. The definition is [`deploy/`](../../deploy/); this page is the procedure. Incident responses are in [`runbooks.md`](runbooks.md).

**State: built and run locally, not yet deployed.** On 2026-10-09 both images were built and the whole stack was started and exercised on a developer machine ([`docker-guide.md`](docker-guide.md), "What was tried"). No server exists yet (see "Not yet verified"). The step-by-step commands for running it locally and on the server are in [`docker-guide.md`](docker-guide.md).

## Topology

| Container | Role |
|---|---|
| `web` | Caddy. The only container that listens on the host (80, 443). Obtains the certificate for `SITE_HOST`, serves the built frontend, passes `/api/*`, `/health/ready` and `/health/live` to the backend, sets the security headers. |
| `backend` | The application, HTTP on 8080 inside the Compose network only. `Production` environment. |
| `migrate` | The backend image run once with the `migrate` command; `backend` starts only after it succeeded. |
| `db` | PostgreSQL 18, data in the `pgdata` volume, reachable only inside the Compose network. |
| `backup` | One `pg_dump` a day into the `backups` volume, kept 30 days. |

The backend trusts `X-Forwarded-For` and `X-Forwarded-Proto` only from the `web` container's fixed address. Without that, every client would share one address and the per-address OTP limits would lock everybody out together.

## Single instance (constraint)

The pilot runs **exactly one `backend` container**. The provider circuit, the 402 spend latch, the per-family concurrency limit, the planning and explanation queues and the once-a-day alert digest are state of that one process. Two instances would each keep their own, so limits would be per instance and the digest could be sent twice. Do not scale the service or run a second copy against the same database. Lifting this needs that state moved into the database first; it is not a configuration change.

A restart loses queued and running generations; the next maintenance run fails them (`GENERATION_INTERRUPTED` / `GENERATION_TIMEOUT`) and the user retries.

## Configuration and secrets

All settings come from `deploy/.env` on the server, created from [`.env.example`](../../deploy/.env.example), mode `600`, owned by the operator, never committed (`.gitignore` excludes it). For one server this file is the managed secret store; there is no other. The variables and what requires them are documented in the example file.

The backend refuses to start in `Production` when any of these is missing: the signing and hashing keys, `Security:AllowedOrigins`, `Pilot:SupportContact`, an enabled `Operations:AlertDigest` with `To`, `From` and `SmtpHost`, and for a selected AI provider its key, model and token prices.

## First deployment

1. A Linux server with Docker Engine and the Compose plugin, a DNS record for `SITE_HOST` pointing at it, ports 80 and 443 open.
2. Limit the journal to 30 days (see "Logs") **before** the first start.
3. Copy the repository at the release commit to the server, create `deploy/.env`.
4. `cd deploy && docker compose up --detach --build`. `migrate` creates the schema; `backend` starts after it.
5. Check: `https://<SITE_HOST>/health/ready` answers `Healthy`; sign in with the operator phone; the operator page opens and shows a maintenance run within a minute; create and complete one Task.
6. Create the read-only database role ("Database access").
7. Create the external uptime check ("Alerts that leave the application") and wait for the first daily digest.
8. Run a restore check on the first dump ([runbook 4](runbooks.md#4-backup-and-restore)).

## Release

There is no CI service for the pilot. The release gate is run by hand on the release commit and its results are written into the release record:

1. `./dev.ps1 check`, `./auth-e2e.ps1` and `./ops-drill.ps1` pass.
2. `dotnet list backend package --vulnerable --include-transitive` and `npm audit` (in `frontend/`) report nothing, or each advisory is recorded with its decision.
3. On the server: `docker compose run --rm backup once` when the release carries a migration.
4. `docker compose up --detach --build`. `migrate` applies the migration; if it fails, `backend` keeps running the previous image against the unchanged schema.
5. Repeat the checks of first deployment, step 5.

Rollback is [runbook 5](runbooks.md#5-migration-rollback): check out the previous commit and `docker compose up --detach --build`; a schema rollback only when the schema itself is the fault.

## Alerts that leave the application

Two paths, both required before pilot users are invited:

- **Daily digest.** The backend e-mails `ALERT_EMAIL_TO` once per UTC day from `Operations:AlertDigest:HourUtc` (04:00): every alert the hourly maintenance runs raised in the last 24 hours, whether it is still active, alerts active now, and the count of runs. It is sent **also when nothing was raised**, so a day without it means the backend or the mail path is down. Each send is an `ALERT_DIGEST` record; a failed send is retried hourly and raises `ALERT_DIGEST_FAILED` on the operator page.
- **External uptime check.** One HTTP check from outside the server on `https://<SITE_HOST>/health/ready`, every five minutes, notifying the operator's phone or e-mail when it fails twice in a row. This is the only signal when the server itself is down. The service is the operator's choice and is recorded in the release record; nothing in the repository creates it.

The digest is a daily summary, not a pager: a critical alert (`AI_BUDGET_EXHAUSTED`, `AI_PROVIDER_SPEND_CAP_LATCHED`, `MAINTENANCE_FAILED`) can wait up to a day. Each of them leaves the manual paths working, which is why a day is accepted for the pilot.

## Logs

Containers log to the host journal (`journald` logging driver). On the server, set in `/etc/systemd/journald.conf`:

```
MaxRetentionSec=30day
```

then `systemctl restart systemd-journald`. Log lines contain user and entity ids, so this limit is what makes an erasure complete in logs within 30 days. Read them with `journalctl CONTAINER_NAME=tidysense-backend-1 --since "1 hour ago"`; `OPS_ALERT`, `AI_KILL_SWITCH_CHANGED`, `BACKUP_SUCCEEDED` and `BACKUP_FAILED` are the lines to search for.

## Backups

The `backup` container writes `tidysense-<UTC time>.dump` (custom format) once a day and deletes dumps older than `BACKUP_RETENTION_DAYS` (30). A dump is renamed into place only after `pg_dump` succeeded. Dumps hold personal data and stay on the server's `backups` volume under the same access rule as the database; copying them elsewhere is a decision recorded in the release record, with the same 30-day limit.

A failed dump writes `BACKUP_FAILED` to the journal and nothing else. Check `docker compose exec backup ls -l /backups` at every release and whenever the digest was missing.

## Database access

For the pilot, the operator is the only person with access to the server and therefore to the database. Two roles exist:

- `tidysense`, the application's role. Used by people only for the procedures in the runbooks (restore, rollback).
- `tidysense_readonly`, created with [`deploy/sql/readonly-role.sql`](../../deploy/sql/readonly-role.sql): read-only transactions, `SELECT` on the application tables except the OTP tables. Every direct look at records uses this role.

Every direct access is written into the access record ([runbook 8](runbooks.md#8-direct-database-access)). The 019C §25 classes beyond this (separate engineering, analytics and restricted roles, de-identified views, an access log kept by the database) are deferred: with one person they would separate nothing.

## Not yet verified

- Nothing has run on a server: a public certificate, journal retention, the backup loop over more than a day, restart behaviour and the uptime check are procedures, not evidence. STEP-12 needs each of them observed once on the pilot server.
- The digest was delivered to a local mail catcher over plain SMTP; no real mail server, and no TLS or authenticated SMTP session, was used.
- No real SMS was sent from a container; the local stack runs the Development sender.
