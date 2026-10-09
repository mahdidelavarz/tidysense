# Open Decisions

No technical decision is open. `DEC-011` (orchestration, CI, deployment) was resolved for the pilot on 2026-10-09 by [ADR-007](../decisions/ADR-007-pilot-deployment-topology.md): one server under Docker Compose with a single backend instance, a hand-run release gate instead of a CI service, a daily alert digest and one external uptime check. It is to be revisited when a second operator, a second instance or a larger cohort appears.

Secrets must never be committed. The first commit of this repository still holds an SMS-provider key and a local database password in its history; both must be revoked or changed before external use (security review of 2026-10-09, finding 1).

Operational values (exact package versions, configured pilot timezone, JWT lifetimes/keys, provider/model budgets, retention schedule and readiness owners) are configuration work, not open product/architecture decisions.
