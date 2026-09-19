# Remaining Conflicts and Open Decisions — 2026-09-19

## Conflicts

No unresolved documentation contradiction remains among the consolidated inventory, baseline, live Canvas, Discussions 023–026, canonical schema reference, implementation plan and DevMap.

Prototype code still differs from the target architecture (opaque sessions, integer identity, IPPanel, unversioned routes, ambiguous `DateTime`, permission-only Project access). These are explicit migration gaps, not competing decisions.

## Open decision

`DEC-011` remains deferred: Docker Compose/local orchestration, CI provider, full deployment pipeline and broader orchestration. It does not block domain implementation. Secret removal/rotation and explicit environment configuration are required independently.

## First-slice blockers

Before modifying persisted IAM/Project data, the team needs an approved integer-to-Guid/auth/session data cutover and rollback plan. Before enabling real external auth, exposed tracked secrets must be removed/rotated and exact JWT/Kavenegar operational values supplied. These block their affected M1 migration, not documentation completion.

No unresolved product or recurring architecture decision blocks beginning the first canonical M1 foundation slice. Milestone completion still requires evidence.
