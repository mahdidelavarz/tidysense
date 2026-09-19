# Migrations and Deployment

## Migrations

EF Core migrations are version-controlled deployment artifacts. Build/deploy does not silently generate migrations. CI applies them to fresh and supported-upgrade PostgreSQL states. Production application is an explicit deployment step with backup/recovery and compatibility checks.

Use expand/migrate/contract for changes that cannot be safely deployed atomically. Destructive changes require data impact, backup, rollback/forward-fix, and application-version compatibility evidence.

## Deployment direction

`DEFERRED DEC-011`: Docker Compose topology, CI provider, full deployment pipeline, ingress/proxy choice and broader orchestration are not locked. Health/readiness, structured logs, backups, rollback and incident procedures remain required outcomes when deployment is designed.

Deployment order must preserve schema/application compatibility, validate readiness, smoke-test authentication and a critical owned-resource operation, and support rollback without corrupting newer data. Pilot/release authorization remains governed by Mind Map readiness gates, not a successful deployment alone.
