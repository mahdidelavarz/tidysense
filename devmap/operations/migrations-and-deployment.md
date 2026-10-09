# Migrations and Deployment

## Migrations

EF Core migrations are version-controlled, provider-specific deployment artifacts. Build/deploy does not silently generate migrations. The canonical migration set targets PostgreSQL and CI must apply it to fresh and supported-upgrade PostgreSQL states. Migrations are infrastructure artifacts, not domain contracts. Production application is an explicit deployment step with backup/recovery and compatibility checks.

Use expand/migrate/contract for changes that cannot be safely deployed atomically. Destructive changes require data impact, backup, rollback/forward-fix, and application-version compatibility evidence.

Backup, restore and rollback procedures are in [`runbooks.md`](runbooks.md) and are rehearsed by `ops-drill.ps1` on an isolated database: dump, restore into a new database, start a backend on the copy, roll the copy back one migration and forward again. They have not been run against a deployed environment.

Outside Development a migration is applied only by the explicit command `dotnet TidySense.dll migrate`, which applies what is pending, prints the names and exits. The backend never migrates on start there.

## Deployment direction

`DEC-011` is resolved for the pilot by [ADR-007](../decisions/ADR-007-pilot-deployment-topology.md): one server, Docker Compose, a single backend instance, Caddy in front, an explicit migration step, a daily backup, a daily alert digest plus one external uptime check, and a release gate run by hand instead of a CI service. The definition is `deploy/`; the procedure is [`deployment.md`](deployment.md). It is defined and syntax-checked, not yet built or run on a server.

Deployment order must preserve schema/application compatibility, validate readiness, smoke-test authentication and a critical owned-resource operation, and support rollback without corrupting newer data. Pilot/release authorization remains governed by Mind Map readiness gates, not a successful deployment alone.
