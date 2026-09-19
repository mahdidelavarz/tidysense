# M1 Entry Package

Status: **Implementation started; M1 gate not verified.**

Canonical repository boundary:

```text
/frontend
/backend
/mindmap
/devmap
```

Do not create `/app/frontend` or `/app/backend`.

Existing backend IAM/Project and frontend scaffolding count as implementation work, but they do not satisfy M1. Before extension, prepare and review migration for JWT/sessionEpoch, Guid identity, `/api/v1`, Kavenegar, temporal types and Project ownership. Establish xUnit/Testcontainers/WebApplicationFactory and generated OpenAPI transport flow. Remove prototype routes/models when their replacement is migrated; do not preserve dual APIs.

Entry authorization is evidence-based: agreed migration/cutover, secrets removed from tracked configuration, applicable package values approved, real PostgreSQL/API security tests passing, and no unreviewed data-loss path. `DEC-011` orchestration is not an entry blocker.
