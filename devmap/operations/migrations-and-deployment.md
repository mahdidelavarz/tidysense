# Migrations and Deployment

## Migrations

EF Core migrations are version-controlled deployment artifacts. Build/deploy does not silently generate migrations. CI applies them to fresh and supported-upgrade PostgreSQL states. Production application is an explicit deployment step with backup/recovery and compatibility checks.

Use expand/migrate/contract for changes that cannot be safely deployed atomically. Destructive changes require data impact, backup, rollback/forward-fix, and application-version compatibility evidence.

## Deployment direction

`LOCKED`: Dockerized services with Nginx serving/proxying the same-origin frontend/API boundary. Health/readiness, structured logs, backups, rollback and incident procedures are required. The repository currently contains none of this infrastructure.

Deployment order must preserve schema/application compatibility, validate readiness, smoke-test authentication and a critical owned-resource operation, and support rollback without corrupting newer data. Pilot/release authorization remains governed by Mind Map readiness gates, not a successful deployment alone.
