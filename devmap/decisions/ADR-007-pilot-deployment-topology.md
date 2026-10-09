# ADR-007 — Pilot Deployment Topology

**Status:** Accepted, 2026-10-09. Resolves `DEC-011` for the pilot.

## Context

STEP-11 left alerts undelivered, nothing rehearsed outside a developer machine, and several privacy and operations questions (log and backup lifetime, database access, per-process runtime state) that could not be answered without knowing how the pilot runs. The pilot is a small invited cohort operated by one person.

## Decision

- **One server, Docker Compose, one instance of each container**: Caddy (TLS, static frontend, reverse proxy), the backend, PostgreSQL, a one-shot migration step and a daily backup container. Definition in `deploy/`, procedure in [`../operations/deployment.md`](../operations/deployment.md).
- **Single backend instance is a constraint**, not a default: circuit, spend latch, concurrency limit, queues and the daily digest are per-process state.
- **Alerts leave the application two ways**: a daily e-mail digest sent by the backend, and one external uptime check on `/health/ready`. No monitoring stack, no pager.
- **No CI service.** The release gate (`dev.ps1 check`, `auth-e2e.ps1`, `ops-drill.ps1`, both dependency audits) is run by hand on the release commit and recorded.
- **Secrets are one `.env` file on the server**, outside version control.
- **Logs and backups live 30 days**, which is the stated limit for an erasure to be complete everywhere.
- **Migrations are an explicit step** (`migrate` command of the backend image) that must succeed before the backend starts.

## Alternatives considered

- *A managed platform (container service, managed PostgreSQL).* More moving parts and accounts to secure than one person can rehearse before the pilot; availability from the pilot's region is uncertain.
- *A monitoring stack (Prometheus/Grafana/Alertmanager) or a paging service.* The in-app operator page already holds every figure; what was missing was delivery. A daily digest plus an uptime check closes that for a cohort this size.
- *A hosted CI.* Useful once more than one person commits. Until then it would run the same three scripts the operator runs anyway.
- *Multiple backend instances.* Needs the runtime state in the database first; nothing in the pilot's load asks for it.

## Consequences

- A critical alert may be read up to a day late. Accepted because every alert rule leaves the manual paths working.
- The server is a single point of failure; recovery is a restore from a dump at most a day old onto a new server.
- Nothing here is verified on a server yet. STEP-12 must observe each procedure once on the pilot server.
- Revisit when a second operator, a second instance or a larger cohort appears.
