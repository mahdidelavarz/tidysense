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

Existing backend IAM/Project and frontend scaffolding count as implementation work, but they do not satisfy M1. The disposable prototype database is replaced directly by the canonical PostgreSQL schema for JWT/sessionEpoch, Guid identity, `/api/v1`, Kavenegar, temporal types and Project ownership. Establish xUnit/WebApplicationFactory with real PostgreSQL (Testcontainers or configured local instance) and generated OpenAPI transport flow. Remove prototype routes/models rather than preserving dual APIs.

Entry authorization is evidence-based: direct disposable-schema replacement reviewed, secrets removed from tracked configuration, applicable package values approved, real PostgreSQL/API security tests passing, and no unreviewed data-loss path. `DEC-011` orchestration is not an entry blocker.
