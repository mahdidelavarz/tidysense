# Migrations and Deployment

## Migrations

EF Core migrations are version-controlled, provider-specific deployment artifacts. Build/deploy does not silently generate migrations. The canonical migration set targets PostgreSQL and CI must apply it to fresh and supported-upgrade PostgreSQL states. Migrations are infrastructure artifacts, not domain contracts. Production application is an explicit deployment step with backup/recovery and compatibility checks.

Use expand/migrate/contract for changes that cannot be safely deployed atomically. Destructive changes require data impact, backup, rollback/forward-fix, and application-version compatibility evidence.

Backup, restore and rollback procedures are in [`runbooks.md`](runbooks.md) and are rehearsed by `ops-drill.ps1` on an isolated database: dump, restore into a new database, start a backend on the copy, roll the copy back one migration and forward again. They have not been run against a deployed environment.

## Deployment direction

`DEFERRED DEC-011`: Docker Compose topology, CI provider, full deployment pipeline, ingress/proxy choice and broader orchestration are not locked. Health/readiness, structured logs, backups, rollback and incident procedures remain required outcomes when deployment is designed.

Deployment order must preserve schema/application compatibility, validate readiness, smoke-test authentication and a critical owned-resource operation, and support rollback without corrupting newer data. Pilot/release authorization remains governed by Mind Map readiness gates, not a successful deployment alone.
